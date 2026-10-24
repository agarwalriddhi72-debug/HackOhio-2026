#!/usr/bin/env python3
"""
Clean the Daraga OSM extract into layers for an evacuation-routing app.

Usage:
    python clean_daraga.py --data Daraga_Roads.geojson --boundary clipping_boundary.geojson --out cleaned
    python clean_daraga.py ... --snap-m 25        # also bridge tiny gaps between road pieces
    python clean_daraga.py ... --demo             # run a sample shelter -> hospital route
    python clean_daraga.py ... --keep-unnamed-shelters --max-shelter-snap-m 5000   # disable the shelter filters

Shelter candidates are filtered (see cleaning_report.json -> poi_layers -> shelter_candidates -> removed):
    - unnamed candidates are dropped
    - candidates more than --max-shelter-snap-m (default 300) from the nearest mapped road are dropped
    - candidates not in the largest strongly connected part of the directed road network are dropped
      (vehicles must be able to drive both TO and AWAY from them, respecting one-way streets)

Requires: Python 3.9+ and numpy. No other dependencies.

Outputs (in --out):
    roads_drivable.geojson      drivable roads, one line per OSM way (for map display)
    graph_nodes.csv             routable graph nodes (every road vertex)
    graph_edges.csv             routable graph edges (one row per segment)
    paths_pedestrian.geojson    footways/paths/steps (NOT routable by vehicles; last-mile only)
    removed_disconnected.geojson  drivable pieces cut off from the main network (review these)
    shelter_candidates.geojson  possible evacuation centers (capacity/accessibility still empty)
    medical_facilities.geojson  hospitals, clinics, health posts
    transport_hubs.geojson      bus stations / terminals (possible vehicle depots)
    buildings.csv               building centroids snapped to the road graph (for pickup/synthetic residents)
    cleaning_report.json        counts of everything kept/removed and why
"""
import argparse
import collections
import csv
import heapq
import json
import math
import os

import numpy as np

# --------------------------------------------------------------------------- config
DRIVABLE = {
    "trunk", "trunk_link", "primary", "secondary", "tertiary",
    "unclassified", "residential", "living_street", "service", "track",
}
PEDESTRIAN = {"footway", "path", "steps", "pedestrian"}
EXCLUDED_STATUS = {"proposed", "construction"}

# ASSUMED free-flow speeds (km/h) for emergency vehicles in flood conditions.
# These are NOT in the data - tune them for your team's vehicles.
SPEED_KPH = {
    "trunk": 50, "trunk_link": 40, "primary": 45, "secondary": 40, "tertiary": 35,
    "unclassified": 30, "residential": 25, "living_street": 15, "service": 15, "track": 10,
}
UNPAVED = {"unpaved", "ground", "dirt", "gravel", "earth", "grass", "sand", "mud"}
UNPAVED_SPEED_FACTOR = 0.7

SHELTER_TIER = {  # tier 1 = most likely used as evacuation centers; replace with an official list when you get one
    "shelter": 1, "community_centre": 1, "school": 1, "college": 1,
    "townhall": 2, "place_of_worship": 2,
}
MEDICAL = {"hospital", "clinic", "health_post", "doctors"}
TRANSPORT_AMENITY = {"bus_station"}

R_EARTH = 6371008.8


# --------------------------------------------------------------------------- geometry helpers
def haversine(lon1, lat1, lon2, lat2):
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dphi = p2 - p1
    dl = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * R_EARTH * math.asin(math.sqrt(a))


def to_xy(lon, lat, lat0=13.1):
    """Equirectangular projection to metres; fine at city scale."""
    lon = np.asarray(lon, dtype=float)
    lat = np.asarray(lat, dtype=float)
    return lon * 111320.0 * math.cos(math.radians(lat0)), lat * 110570.0


def points_in_rings(pts, rings):
    """Ray-casting; pts is (n,2) array of lon,lat. True if inside ANY ring."""
    pts = np.asarray(pts, dtype=float)
    x, y = pts[:, 0], pts[:, 1]
    inside_any = np.zeros(len(pts), bool)
    for ring in rings:
        ring = np.asarray(ring, dtype=float)[:, :2]
        inside = np.zeros(len(pts), bool)
        for i in range(len(ring) - 1):
            x1, y1, x2, y2 = ring[i, 0], ring[i, 1], ring[i + 1, 0], ring[i + 1, 1]
            if y1 == y2:
                continue
            cond = (y1 > y) != (y2 > y)
            xint = (x2 - x1) * (y - y1) / (y2 - y1) + x1
            inside ^= cond & (x < xint)
        inside_any |= inside
    return inside_any


def ring_centroid(ring):
    pts = np.asarray(ring, dtype=float)[:, :2]
    x, y = pts[:, 0], pts[:, 1]
    a = x[:-1] * y[1:] - x[1:] * y[:-1]
    area = a.sum() / 2
    if abs(area) < 1e-18:
        return float(pts[:, 0].mean()), float(pts[:, 1].mean())
    cx = ((x[:-1] + x[1:]) * a).sum() / (6 * area)
    cy = ((y[:-1] + y[1:]) * a).sum() / (6 * area)
    return float(cx), float(cy)


def rep_point(g):
    t, c = g["type"], g["coordinates"]
    if t == "Point":
        return float(c[0]), float(c[1])
    if t == "LineString":
        m = c[len(c) // 2]
        return float(m[0]), float(m[1])
    if t == "Polygon":
        return ring_centroid(c[0])
    if t == "MultiPolygon":
        biggest = max(c, key=lambda poly: len(poly[0]))
        return ring_centroid(biggest[0])
    return None


def load_boundary_rings(path):
    gj = json.load(open(path))
    geoms = []
    if gj["type"] == "FeatureCollection":
        geoms = [f["geometry"] for f in gj["features"]]
    elif gj["type"] == "Feature":
        geoms = [gj["geometry"]]
    else:
        geoms = [gj]
    rings = []
    for g in geoms:
        if g["type"] == "Polygon":
            rings.append(g["coordinates"][0])
        elif g["type"] == "MultiPolygon":
            rings.extend(poly[0] for poly in g["coordinates"])
    if not rings:
        raise SystemExit("No polygon found in boundary file")
    return rings


def largest_scc_mask(n, edges):
    """Boolean list: True for nodes in the largest strongly connected component of the DIRECTED graph.
    Two-way roads (oneway == 0) count as edges in both directions."""
    adj = [[] for _ in range(n)]
    radj = [[] for _ in range(n)]
    for e in edges:
        u, v = e["u"], e["v"]
        adj[u].append(v)
        radj[v].append(u)
        if not e["oneway"]:
            adj[v].append(u)
            radj[u].append(v)
    seen = [False] * n
    order = []
    for s0 in range(n):
        if seen[s0]:
            continue
        seen[s0] = True
        stack = [(s0, 0)]
        while stack:
            u, i = stack.pop()
            if i < len(adj[u]):
                stack.append((u, i + 1))
                v = adj[u][i]
                if not seen[v]:
                    seen[v] = True
                    stack.append((v, 0))
            else:
                order.append(u)
    comp = [-1] * n
    c = 0
    for s0 in reversed(order):
        if comp[s0] != -1:
            continue
        comp[s0] = c
        stack = [s0]
        while stack:
            u = stack.pop()
            for v in radj[u]:
                if comp[v] == -1:
                    comp[v] = c
                    stack.append(v)
        c += 1
    main = collections.Counter(comp).most_common(1)[0][0]
    return [cc == main for cc in comp]


def write_geojson(path, features):
    with open(path, "w", encoding="utf-8") as fh:
        json.dump({"type": "FeatureCollection", "features": features}, fh, ensure_ascii=False)


# --------------------------------------------------------------------------- main
def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--data", default="Daraga_Roads.geojson")
    ap.add_argument("--boundary", default="clipping_boundary.geojson")
    ap.add_argument("--out", default="cleaned")
    ap.add_argument("--snap-m", type=float, default=0.0,
                    help="if >0, link tiny disconnected road pieces to the main network when within this many metres")
    ap.add_argument("--demo", action="store_true", help="run a sample shelter -> hospital route")
    ap.add_argument("--max-shelter-snap-m", type=float, default=300.0,
                    help="drop shelter candidates farther than this from the nearest mapped road")
    ap.add_argument("--keep-unnamed-shelters", action="store_true",
                    help="do not drop unnamed shelter candidates")
    args = ap.parse_args()
    os.makedirs(args.out, exist_ok=True)

    print("Loading...")
    feats = json.load(open(args.data, encoding="utf-8"))["features"]
    rings = load_boundary_rings(args.boundary)
    report = {"input_features": len(feats)}

    def P(f, k):
        v = f["properties"].get(k)
        return None if v in ("", None) else v

    # ---------------------------------------------------------------- roads
    drivable_ways, ped_ways = [], []
    dropped = collections.Counter()
    for f in feats:
        g = f["geometry"]
        hw = P(f, "highway")
        if not hw:
            continue
        if g is None or g["type"] != "LineString":
            dropped["highway tag on non-line geometry"] += 1
            continue
        if hw in EXCLUDED_STATUS:
            dropped[f"excluded: {hw}"] += 1
        elif hw in PEDESTRIAN:
            ped_ways.append(f)
        elif hw in DRIVABLE:
            drivable_ways.append(f)
        else:
            dropped[f"unknown highway class: {hw}"] += 1

    # clip: keep a way if ANY vertex lies in the boundary (so roads crossing the border still connect)
    kept = []
    for f in drivable_ways:
        coords = np.array(f["geometry"]["coordinates"])[:, :2]
        if points_in_rings(coords, rings).any():
            kept.append(f)
        else:
            dropped["drivable way entirely outside boundary"] += 1
    drivable_ways = kept
    ped_ways = [f for f in ped_ways
                if points_in_rings(np.array(f["geometry"]["coordinates"])[:, :2], rings).any()]

    # ---------------------------------------------------------------- build vertex-level graph
    node_id = {}
    node_xy = []

    def get_node(lon, lat):
        k = (round(lon, 7), round(lat, 7))
        if k not in node_id:
            node_id[k] = len(node_xy)
            node_xy.append(k)
        return node_id[k]

    edges = []
    way_geoms = []
    way_info = {}
    for f in drivable_ways:
        hw = P(f, "highway")
        raw = [(c[0], c[1]) for c in f["geometry"]["coordinates"]]
        dedup = [raw[0]]
        for c in raw[1:]:
            if (round(c[0], 7), round(c[1], 7)) != (round(dedup[-1][0], 7), round(dedup[-1][1], 7)):
                dedup.append(c)
        if len(dedup) < 2:
            dropped["way collapsed to a single point"] += 1
            continue
        oneway_raw = str(P(f, "oneway") or "no").lower()
        reverse = oneway_raw == "-1"
        oneway = 1 if oneway_raw in ("yes", "true", "1", "-1") else 0
        if reverse:
            dedup = dedup[::-1]
        surface = P(f, "surface")
        if surface:
            surface_assumed = 0
        elif hw in ("trunk", "trunk_link", "primary", "secondary"):
            surface, surface_assumed = "paved", 1
        elif hw == "track":
            surface, surface_assumed = "unpaved", 1
        else:
            surface, surface_assumed = "unknown", 1
        speed = SPEED_KPH[hw] * (UNPAVED_SPEED_FACTOR if surface in UNPAVED else 1.0)
        wid = f["properties"]["osm_id"]
        total = 0.0
        for a, b in zip(dedup[:-1], dedup[1:]):
            L = haversine(a[0], a[1], b[0], b[1])
            total += L
            edges.append({
                "u": get_node(*a), "v": get_node(*b), "way_id": wid, "highway": hw,
                "name": P(f, "name") or "", "length_m": round(L, 2),
                "speed_kph": round(speed, 1), "time_s": round(L / (speed / 3.6), 2),
                "oneway": oneway, "bridge": 1 if P(f, "bridge") else 0,
                "surface": surface, "surface_assumed": surface_assumed,
                "access": P(f, "access") or "", "low_quality": 1 if hw == "track" else 0,
            })
        way_geoms.append((wid, dedup))
        way_info[wid] = {
            "osm_id": wid, "highway": hw, "name": P(f, "name"), "surface": surface,
            "surface_assumed": surface_assumed, "bridge": 1 if P(f, "bridge") else 0,
            "oneway": oneway, "length_m": round(total, 1), "low_quality": 1 if hw == "track" else 0,
        }

    # ---------------------------------------------------------------- connectivity
    n_nodes = len(node_xy)
    parent = list(range(n_nodes))

    def find(a):
        while parent[a] != a:
            parent[a] = parent[parent[a]]
            a = parent[a]
        return a

    def union(a, b):
        ra, rb = find(a), find(b)
        if ra != rb:
            parent[ra] = rb

    for e in edges:
        union(e["u"], e["v"])
    comp_size = collections.Counter(find(i) for i in range(n_nodes))
    main_root = comp_size.most_common(1)[0][0]

    # optional: bridge tiny gaps between small pieces and the main network
    synthetic = []
    if args.snap_m > 0:
        main_nodes = np.array([i for i in range(n_nodes) if find(i) == main_root])
        mx, my = to_xy([node_xy[i][0] for i in main_nodes], [node_xy[i][1] for i in main_nodes])
        small_roots = [r for r in comp_size if r != main_root]
        for r in small_roots:
            members = [i for i in range(n_nodes) if find(i) == r]
            best = None
            for i in members:
                px, py = to_xy(node_xy[i][0], node_xy[i][1])
                d = np.hypot(mx - px, my - py)
                j = int(d.argmin())
                if best is None or d[j] < best[0]:
                    best = (float(d[j]), i, int(main_nodes[j]))
            if best and best[0] <= args.snap_m:
                d, i, j = best
                a, b = node_xy[i], node_xy[j]
                edges.append({"u": i, "v": j, "way_id": -1, "highway": "synthetic_link", "name": "",
                              "length_m": round(d, 2), "speed_kph": 10.0, "time_s": round(d / (10 / 3.6), 2),
                              "oneway": 0, "bridge": 0, "surface": "unknown", "surface_assumed": 1,
                              "access": "", "low_quality": 1})
                union(i, j)
                synthetic.append({"from": list(a), "to": list(b), "metres": round(d, 1)})
        comp_size = collections.Counter(find(i) for i in range(n_nodes))
        main_root = comp_size.most_common(1)[0][0]

    in_main = np.array([find(i) == main_root for i in range(n_nodes)])
    removed_edges = [e for e in edges if not in_main[e["u"]]]
    edges = [e for e in edges if in_main[e["u"]]]

    # re-index nodes of main component
    old_to_new = {}
    nodes_out = []
    for i in range(n_nodes):
        if in_main[i]:
            old_to_new[i] = len(nodes_out)
            nodes_out.append(node_xy[i])
    for e in edges:
        e["u"], e["v"] = old_to_new[e["u"]], old_to_new[e["v"]]
    deg = collections.Counter()
    for e in edges:
        deg[e["u"]] += 1
        deg[e["v"]] += 1
    nx_, ny_ = to_xy([n[0] for n in nodes_out], [n[1] for n in nodes_out])
    inside_nodes = points_in_rings(np.array(nodes_out), rings)
    for k, e in enumerate(edges):
        e["edge_id"] = k
        e["inside_boundary"] = int(inside_nodes[e["u"]] or inside_nodes[e["v"]])
        e["flood_risk"] = ""  # fill in after joining a hazard layer

    in_scc = largest_scc_mask(len(nodes_out), edges)

    with open(os.path.join(args.out, "graph_nodes.csv"), "w", newline="", encoding="utf-8") as fh:
        w = csv.writer(fh)
        w.writerow(["node_id", "lon", "lat", "degree", "inside_boundary", "strongly_connected"])
        for i, (lo, la) in enumerate(nodes_out):
            w.writerow([i, lo, la, deg[i], int(inside_nodes[i]), int(in_scc[i])])
    cols = ["edge_id", "u", "v", "way_id", "highway", "name", "length_m", "speed_kph", "time_s",
            "oneway", "bridge", "surface", "surface_assumed", "access", "low_quality",
            "inside_boundary", "flood_risk"]
    with open(os.path.join(args.out, "graph_edges.csv"), "w", newline="", encoding="utf-8") as fh:
        w = csv.DictWriter(fh, fieldnames=cols, extrasaction="ignore")
        w.writeheader()
        w.writerows(edges)

    main_way_ids = {e["way_id"] for e in edges}
    road_feats = [{"type": "Feature",
                   "geometry": {"type": "LineString", "coordinates": [list(c) for c in geom]},
                   "properties": way_info[wid]}
                  for wid, geom in way_geoms if wid in main_way_ids]
    write_geojson(os.path.join(args.out, "roads_drivable.geojson"), road_feats)

    removed_ids = {e["way_id"] for e in removed_edges} - main_way_ids
    write_geojson(os.path.join(args.out, "removed_disconnected.geojson"),
                  [{"type": "Feature",
                    "geometry": {"type": "LineString", "coordinates": [list(c) for c in geom]},
                    "properties": way_info[wid]}
                   for wid, geom in way_geoms if wid in removed_ids])

    write_geojson(os.path.join(args.out, "paths_pedestrian.geojson"),
                  [{"type": "Feature", "geometry": f["geometry"],
                    "properties": {"osm_id": f["properties"]["osm_id"], "highway": P(f, "highway"),
                                   "name": P(f, "name"), "surface": P(f, "surface")}}
                   for f in ped_ways])

    # ---------------------------------------------------------------- snapping helper
    node_arr_x, node_arr_y = nx_, ny_

    def snap(lons, lats):
        px, py = to_xy(lons, lats)
        out_i, out_d = [], []
        for s in range(0, len(px), 2000):
            dx = px[s:s + 2000, None] - node_arr_x[None, :]
            dy = py[s:s + 2000, None] - node_arr_y[None, :]
            d = np.hypot(dx, dy)
            j = d.argmin(axis=1)
            out_i.extend(j.tolist())
            out_d.extend(d[np.arange(len(j)), j].tolist())
        return out_i, out_d

    # ---------------------------------------------------------------- POI layers
    def poi_feature(f, extra):
        pt = rep_point(f["geometry"])
        return pt, {"type": "Feature", "geometry": {"type": "Point", "coordinates": list(pt)},
                    "properties": extra}

    shelters, medical, hubs = [], [], []
    for f in feats:
        g = f["geometry"]
        if g is None:
            continue
        am = P(f, "amenity")
        name = P(f, "name") or P(f, "name_en")
        base = {"osm_id": f["properties"]["osm_id"], "osm_type": f["properties"]["osm_type"],
                "name": name, "category": am, "source_geom": g["type"]}
        if am in SHELTER_TIER or (P(f, "building") == "school" and not am):
            pass
        if am in SHELTER_TIER:
            pt, feat = poi_feature(f, {**base, "candidate_tier": SHELTER_TIER[am],
                                       "capacity": None, "wheelchair_accessible": None,
                                       "is_official_evac_center": None})
            shelters.append((pt, feat, g["type"]))
        elif am in MEDICAL or P(f, "emergency") in ("ambulance_station",):
            pt, feat = poi_feature(f, {**base, "category": am or "emergency"})
            medical.append((pt, feat, g["type"]))
        elif am in TRANSPORT_AMENITY or P(f, "public_transport") == "station":
            pt, feat = poi_feature(f, {**base, "category": am or "public_transport_station"})
            hubs.append((pt, feat, g["type"]))

    def dedupe(items):
        items = sorted(items, key=lambda t: 0 if t[2] != "Point" else 1)  # prefer polygons over points
        kept_items, dup = [], 0
        for pt, feat, gt in items:
            nm = (feat["properties"]["name"] or "").lower()
            cat = feat["properties"]["category"]
            radius = 150 if nm else 20
            clash = False
            for pt2, feat2, _ in kept_items:
                if feat2["properties"]["category"] == cat and (feat2["properties"]["name"] or "").lower() == nm:
                    if haversine(pt[0], pt[1], pt2[0], pt2[1]) < radius:
                        clash = True
                        break
            if clash:
                dup += 1
            else:
                kept_items.append((pt, feat, gt))
        return kept_items, dup

    poi_report = {}
    for label, items in (("shelter_candidates", shelters), ("medical_facilities", medical),
                         ("transport_hubs", hubs)):
        items, dup = dedupe(items)
        pts = np.array([i[0] for i in items])
        inside = points_in_rings(pts, rings) if len(items) else np.array([], bool)
        sel = [i for i, ins in zip(items, inside) if ins]
        if sel:
            idx, dist = snap([i[0][0] for i in sel], [i[0][1] for i in sel])
        else:
            idx, dist = [], []
        outf, removed_pois = [], []
        for (pt, feat, _), j, d in zip(sel, idx, dist):
            props = feat["properties"]
            props["nearest_node"] = int(j)
            props["snap_m"] = round(d, 1)
            props["strongly_connected"] = int(in_scc[j])
            if label == "shelter_candidates":
                reason = None
                if not props["name"] and not args.keep_unnamed_shelters:
                    reason = "unnamed"
                elif d > args.max_shelter_snap_m:
                    reason = f"more than {args.max_shelter_snap_m:.0f} m from the nearest mapped road"
                elif not in_scc[j]:
                    reason = "not reachable both ways on the directed road network (one-way streets)"
                if reason:
                    removed_pois.append({"osm_id": props["osm_id"], "name": props["name"],
                                         "category": props["category"], "snap_m": props["snap_m"],
                                         "reason": reason})
                    continue
            outf.append(feat)
        write_geojson(os.path.join(args.out, f"{label}.geojson"), outf)
        poi_report[label] = {"kept": len(outf), "duplicates_removed": dup,
                             "outside_boundary_removed": int(len(items) - len(sel)),
                             "unnamed_kept": sum(1 for f in outf if not f["properties"]["name"]),
                             "not_strongly_connected_kept": sum(1 for f in outf if not f["properties"]["strongly_connected"])}
        if label == "shelter_candidates":
            poi_report[label]["removed"] = removed_pois

    # ---------------------------------------------------------------- buildings
    brows = []
    for f in feats:
        b = P(f, "building")
        if not b or f["geometry"] is None:
            continue
        pt = rep_point(f["geometry"])
        brows.append((f["properties"]["osm_id"], pt[0], pt[1], b, P(f, "name") or ""))
    bpts = np.array([[r[1], r[2]] for r in brows])
    binside = points_in_rings(bpts, rings)
    brows = [r for r, ins in zip(brows, binside) if ins]
    bidx, bdist = snap([r[1] for r in brows], [r[2] for r in brows])
    with open(os.path.join(args.out, "buildings.csv"), "w", newline="", encoding="utf-8") as fh:
        w = csv.writer(fh)
        w.writerow(["osm_id", "lon", "lat", "building", "name", "nearest_node", "snap_m", "far_from_road",
                    "strongly_connected"])
        for r, j, d in zip(brows, bidx, bdist):
            w.writerow([*r, j, round(d, 1), int(d > 300), int(in_scc[j])])
    bd = np.array(bdist)

    # ---------------------------------------------------------------- report
    comp_after = collections.Counter(e["highway"] for e in edges)
    report.update({
        "dropped_reasons": dict(dropped),
        "drivable_ways_kept_in_main_network": len(main_way_ids),
        "drivable_ways_removed_disconnected": len(removed_ids),
        "pedestrian_paths_kept": len(ped_ways),
        "graph": {"nodes": len(nodes_out), "edges": len(edges),
                  "nodes_in_main_strongly_connected_component": int(sum(in_scc)),
                  "km": round(sum(e["length_m"] for e in edges) / 1000, 1),
                  "edges_by_class": dict(comp_after),
                  "one_way_edges": sum(e["oneway"] for e in edges),
                  "surface_assumed_pct": round(100 * sum(e["surface_assumed"] for e in edges) / len(edges), 1)},
        "synthetic_links_added": synthetic,
        "poi_layers": poi_report,
        "buildings": {"kept_inside_boundary": len(brows), "outside_boundary_removed": int((~binside).sum()),
                      "far_from_road_over_300m": int((bd > 300).sum()),
                      "median_snap_m": round(float(np.median(bd)), 1)},
        "assumptions": {"speeds_kph": SPEED_KPH, "unpaved_speed_factor": UNPAVED_SPEED_FACTOR},
    })
    json.dump(report, open(os.path.join(args.out, "cleaning_report.json"), "w"), indent=2)
    print(json.dumps(report, indent=2))

    # ---------------------------------------------------------------- demo
    if args.demo:
        adj = collections.defaultdict(list)
        for e in edges:
            adj[e["u"]].append((e["v"], e["time_s"], e["length_m"]))
            if not e["oneway"]:
                adj[e["v"]].append((e["u"], e["time_s"], e["length_m"]))

        def dijkstra(src):
            dist = {src: (0.0, 0.0)}
            pq = [(0.0, src)]
            while pq:
                t, u = heapq.heappop(pq)
                if t > dist[u][0]:
                    continue
                for v, tt, ll in adj[u]:
                    nt = t + tt
                    if v not in dist or nt < dist[v][0]:
                        dist[v] = (nt, dist[u][1] + ll)
                        heapq.heappush(pq, (nt, v))
            return dist

        sh = json.load(open(os.path.join(args.out, "shelter_candidates.geojson")))["features"]
        md = json.load(open(os.path.join(args.out, "medical_facilities.geojson")))["features"]
        hosp = [m for m in md if m["properties"]["category"] == "hospital"]
        print("\nDEMO: nearest hospital (by travel time) from 5 shelter candidates")
        for s in sh[:5]:
            d = dijkstra(s["properties"]["nearest_node"])
            best = min(((d[h["properties"]["nearest_node"]][0], h) for h in hosp
                        if h["properties"]["nearest_node"] in d), key=lambda t: t[0], default=None)
            if best:
                print(f"  {s['properties']['name']} -> {best[1]['properties']['name']}: "
                      f"{best[0] / 60:.1f} min, {d[best[1]['properties']['nearest_node']][1] / 1000:.2f} km")
            else:
                print(f"  {s['properties']['name']}: no reachable hospital")


if __name__ == "__main__":
    main()

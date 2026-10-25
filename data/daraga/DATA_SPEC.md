# Daraga Evacuation Routing: Data Specification

Give this file to the AI builder together with the data files and `clean_daraga.py`. It explains what each file contains, what each variable means, and how to use the data. Anything marked **ASSUMED** is not real data and should be treated as a tunable default.

## 1. Project context

An app that helps emergency responders evacuate older adults and people with disabilities during flooding in **Daraga, Albay, Philippines**. It has three interfaces:

| Interface | What the user does |
|---|---|
| **Resident** | Requests help and enters their location. That location is the pickup point. If their bus is full, they are told to wait for another bus. |
| **Driver** | Gets an ordered route of pickups and a shelter drop-off. Can mark the bus as full. The app must find the best route. |
| **Shelter** | Can press a button to mark the shelter as full. Later, a shelter may say it cannot accommodate certain needs (for example wheelchairs). |

The data below supports **routing, snapping, and choosing destinations**. It does **not** contain residents, vehicles, shelter capacity, or flood hazards. The app has to create those (Section 6).

## 2. Files and which to use

| File | Rows | Needed? | Purpose |
|---|---|---|---|
| `graph_nodes.csv` | 28,465 | **Required** | Routing graph nodes (every road vertex) |
| `graph_edges.csv` | 29,504 | **Required** | Routing graph edges with travel times |
| `shelter_candidates.geojson` | 162 | **Required** | Possible evacuation centers (drop-off points) |
| `medical_facilities.geojson` | 41 | Recommended | Hospitals/clinics (drop-off for medical needs) |
| `transport_hubs.geojson` | 5 | Recommended | Bus stations (possible vehicle depots/start points) |
| `roads_drivable.geojson` | 3,539 ways | Optional | Road lines for drawing a map (not needed for routing) |
| `buildings.csv` | 38,870 | Optional | Building centroids, useful for generating synthetic residents |
| `paths_pedestrian.geojson` | 174 | Optional | Footpaths (not drivable; last-mile only) |
| `removed_disconnected.geojson` | 54 ways | Not needed | Road pieces cut off from the network, kept for review |
| `cleaning_report.json` | n/a | Not needed | Counts of what was kept and removed, and why |
| `clean_daraga.py` | n/a | Reference | The script that produced everything. **Run once offline; do not run it inside the app.** |

**Size warning:** the required files total about 3.4 MB, and `graph_edges.csv` alone is about 2.3 MB. Upload them as project files or static assets that the app loads at runtime. Do not paste them into a chat prompt as text.

## 3. Conventions (read this first)

- **Coordinates:** CSV columns are `lon`, `lat`. GeoJSON uses `[lon, lat]`. **Leaflet and Google Maps use `[lat, lng]`. Swap the order when plotting, or markers will land in the wrong place.**
- **Units:** `length_m` is metres, `time_s` is seconds, `speed_kph` is km/h, `snap_m` is metres.
- **IDs:** `node_id` and `edge_id` are integers starting at 0 and are the row indexes of their files. `osm_id` is the OpenStreetMap ID (informational only).
- **Booleans** are stored as `0` or `1`. Empty cells mean unknown, not false.
- **Boundary:** the data covers Daraga plus a buffer the team drew around it. Roads and facilities in the buffer (for example parts of Legazpi) are intentional, so routes connect across the municipal border. Do not treat them as errors.

## 4. File schemas

### 4.1 `graph_nodes.csv`
One row per road vertex. The graph is **vertex-level**: every point along a road is a node, and each edge joins two neighbouring points.

| Column | Meaning |
|---|---|
| `node_id` | Unique integer ID. Used by `graph_edges.u`/`v` and by every `nearest_node` field. |
| `lon`, `lat` | Location in WGS84 degrees. |
| `degree` | Number of edges touching the node. `>= 3` is a junction, `1` is a dead end. |
| `inside_boundary` | `1` if the node is inside the buffered boundary. |
| `strongly_connected` | `1` if a vehicle can drive from this node to every other `1` node and back, respecting one-way streets. 28,415 of 28,465 nodes are `1`. Prefer these as origins and destinations. |

### 4.2 `graph_edges.csv`
One row per road segment.

| Column | Meaning |
|---|---|
| `edge_id` | Unique integer ID. Use it to mark an edge as blocked or flooded. |
| `u`, `v` | `node_id` of the segment's start and end. |
| `way_id` | OSM way ID. Segments of the same road share it. Joins to `roads_drivable.geojson` property `osm_id`. |
| `highway` | Road class: `trunk`, `trunk_link`, `primary`, `secondary`, `tertiary`, `unclassified`, `residential`, `living_street`, `service`, `track`. |
| `name` | Road name. **Blank for most roads.** Do not rely on it. |
| `length_m` | Segment length (real, computed from coordinates). |
| `speed_kph` | **ASSUMED** free-flow speed by road class (trunk 50, primary 45, secondary 40, tertiary 35, unclassified 30, residential 25, living_street 15, service 15, track 10), multiplied by 0.7 on unpaved surfaces. |
| `time_s` | `length_m / speed` in seconds. **Use this as the routing weight.** |
| `oneway` | `1`: traffic may only go `u -> v`. `0`: both directions. 414 edges are one-way. |
| `bridge` | `1` if the segment is on a bridge. These are the most flood-sensitive crossings. |
| `surface` | `paved`, `asphalt`, `concrete`, `unpaved`, `ground`, `dirt`, or `unknown`. |
| `surface_assumed` | `1` if `surface` was guessed from the road class (84% of edges), `0` if it came from the map data. |
| `access` | OSM access restriction text. Usually blank. |
| `low_quality` | `1` for `track` roads (rough, narrow, often unpaved). Consider avoiding them for wheelchair or elderly passengers. |
| `inside_boundary` | `1` if an endpoint is inside the boundary. |
| `flood_risk` | **Empty on purpose.** Fill it after joining a flood hazard layer (Section 7). |

### 4.3 `shelter_candidates.geojson`
Point features, 162 in total: 113 schools, 29 places of worship, 18 town halls, 1 community centre, 1 college. Properties:

| Property | Meaning |
|---|---|
| `osm_id`, `name`, `category` | Identity. Every kept shelter has a name. `category` is one of `school`, `college`, `community_centre`, `townhall`, `place_of_worship`. |
| `candidate_tier` | `1` (schools, colleges, community centres) is more likely to be an evacuation center. `2` (town halls, churches) is less likely. **ASSUMED ranking.** |
| `capacity` | **Null for every shelter.** Must be entered by the shelter interface. |
| `wheelchair_accessible` | **Null for every shelter.** Must be entered by the shelter interface. |
| `is_official_evac_center` | **Null.** Set it if you obtain an official evacuation center list. |
| `nearest_node` | `node_id` in `graph_nodes.csv` to route to. **Use this to route; do not recompute it.** |
| `snap_m` | Distance from the shelter to that node. All kept shelters are within 300 m of a road (max 238 m). |
| `strongly_connected` | Always `1` for kept shelters. |
| `source_geom` | Whether the original map feature was a point or polygon. The stored point is its centroid. |

### 4.4 `medical_facilities.geojson` and `transport_hubs.geojson`
Same property pattern as shelters (`osm_id`, `name`, `category`, `nearest_node`, `snap_m`, `strongly_connected`).
- Medical (41): `hospital` 10, `clinic` 21, `doctors` 7, `health_post` 3. 3 are unnamed.
- Transport hubs (5): all `bus_station`. Use as default depot or start locations for vehicles.

### 4.5 `buildings.csv`
One row per building centroid inside the boundary.

| Column | Meaning |
|---|---|
| `osm_id`, `lon`, `lat` | Identity and location. |
| `building` | Building type. 36,370 of 38,870 are just `yes` (unspecified), so **do not infer who lives where from this**. |
| `name` | Usually blank. |
| `nearest_node`, `snap_m` | Nearest road node and distance to it. |
| `far_from_road` | `1` if over 300 m from a mapped road (1,389 buildings). Exclude these when generating test residents. |
| `strongly_connected` | `1` if the nearest node is in the main drivable network. |

### 4.6 `roads_drivable.geojson`, `paths_pedestrian.geojson`
LineStrings for map display. Properties: `osm_id`, `highway`, `name`, `surface`, `surface_assumed`, `bridge`, `oneway`, `length_m`, `low_quality`. Join to edges via `osm_id == way_id`. The pedestrian layer is **not routable by vehicles**.

## 5. How to use the data

### 5.1 Build the graph (reference Python; port to JS/TS as needed)
```python
import csv, heapq, math, collections
import numpy as np

nodes = list(csv.DictReader(open("graph_nodes.csv")))
lon = np.array([float(n["lon"]) for n in nodes])
lat = np.array([float(n["lat"]) for n in nodes])

adj = collections.defaultdict(list)          # node -> [(neighbour, time_s, length_m, edge_id)]
for e in csv.DictReader(open("graph_edges.csv")):
    u, v = int(e["u"]), int(e["v"])
    t, L, eid = float(e["time_s"]), float(e["length_m"]), int(e["edge_id"])
    adj[u].append((v, t, L, eid))
    if e["oneway"] == "0":                    # two-way road: add the reverse direction too
        adj[v].append((u, t, L, eid))
```
**Rule:** an edge is two-way unless `oneway == 1`. If you only add `u -> v`, every road becomes one-way and routing breaks.

### 5.2 Snap a resident's pin to the road
```python
def nearest_node(lon0, lat0):
    k = math.cos(math.radians(13.1))          # longitude shrinks with latitude
    d2 = ((lon - lon0) * k) ** 2 + (lat - lat0) ** 2
    return int(d2.argmin())
```
Use the returned `node_id` as the pickup node. If the distance to that node is large (over about 300 m), warn the user that the pin is far from a mapped road. Resident pins are free-form, so also show the pin the driver should walk or drive to.

### 5.3 Shortest path with blocked and flooded roads
```python
def dijkstra(src, blocked=frozenset(), flood_penalty=None):
    """blocked: set of edge_ids that cannot be used.
       flood_penalty: optional dict edge_id -> multiplier on travel time (e.g. 3.0)."""
    dist, prev, pq = {src: 0.0}, {}, [(0.0, src)]
    while pq:
        t, u = heapq.heappop(pq)
        if t > dist[u]:
            continue
        for v, tt, L, eid in adj[u]:
            if eid in blocked:
                continue
            nt = t + tt * (flood_penalty.get(eid, 1.0) if flood_penalty else 1.0)
            if v not in dist or nt < dist[v]:
                dist[v], prev[v] = nt, (u, eid)
                heapq.heappush(pq, (nt, v))
    return dist, prev

def path_nodes(prev, dst):
    out = [dst]
    while out[-1] in prev:
        out.append(prev[out[-1]][0])
    return out[::-1]                          # draw with lon/lat of each node
```
Dijkstra on this graph (about 28k nodes) runs in well under a second. For many requests, run it once per vehicle or per stop rather than once per pair.

### 5.4 Choosing a shelter for a pickup
1. Start from the shelter list (`shelter_candidates.geojson`) and **remove** any shelter whose runtime state is `full`.
2. Remove shelters whose accepted-needs list excludes this resident's need (for example a wheelchair user and a shelter that cannot take wheelchairs).
3. Prefer `candidate_tier == 1` and `wheelchair_accessible == true` when the resident needs it.
4. Pick the remaining shelter with the smallest travel time `dist[shelter.nearest_node]` from the pickup node.
5. If none remain, tell the driver and the dispatcher; do not silently pick a full shelter.

### 5.5 Ordering pickups for a driver (suggested heuristic)
This is a vehicle routing problem with capacities and priorities. A simple, explainable method for a hackathon:
1. Start with the vehicle's current node and its remaining seats and wheelchair spaces.
2. Among the unassigned requests the vehicle can legally carry (capacity, lift, stretcher), choose the one with the lowest `travel_time_from_current - W * priority_score`. `W` is a tunable weight in seconds. A higher `W` makes urgent residents jump the queue.
3. Move to that pickup, update the load, and repeat.
4. When the vehicle is full, or no more requests fit, route to the best shelter (Section 5.4).
5. Recompute whenever a request is added, a driver reports "full", a shelter reports "full", or an edge becomes blocked.

If a driver marks the bus full, mark that vehicle as not accepting pickups, reassign its unserved requests to the next best vehicle, and tell the affected residents to wait. Show an estimated wait using that vehicle's route time.

## 6. Data the app must create (not in the dataset)

**Resident request**: `id`, `lon`, `lat`, `snapped_node`, `need` (for example wheelchair, stretcher, needs physical help, walks with assistance), `age_group`, `priority_score`, `status` (`waiting`, `assigned`, `picked_up`, `delivered`), `assigned_vehicle_id`.

**Vehicle**: `id`, `type`, `seats_total`, `seats_free`, `wheelchair_spaces`, `stretcher_spaces`, `current_node`, `status` (`available`, `full`, `offline`), `assigned_request_ids`, `route`. Start vehicles at a `transport_hubs` node or a user-entered location.

**Shelter runtime state** (keyed by `osm_id`): `is_full`, `capacity`, `current_occupancy`, `accepts` (list such as `["wheelchair", "stretcher"]`), `wheelchair_accessible`. Start from `shelter_candidates.geojson` and add these fields. The "shelter full" button sets `is_full = true`. A later "cannot accommodate wheelchairs" option edits `accepts`.

**Priority score** (suggested, ASSUMED; not from data): combine need severity (stretcher > wheelchair > walks with help), age (older adults first), and time waiting. For example `score = 3*severity + 2*age_factor + 0.01*minutes_waiting`. Make the weights configurable and show responders why a resident ranked high.

## 7. Hazard / flood data (still missing)

`graph_edges.flood_risk` is empty. To use it, obtain a flood hazard layer (for example Project NOAH or an LGU flood map), mark each edge whose midpoint falls inside a hazard zone, and store a risk value. Suggested handling: `blocked` for deep or impassable zones, `flood_penalty` (a time multiplier) for shallow zones, and prefer edges with `bridge == 0` when a river crossing is flooded. Until then, let a responder manually block edges (by `edge_id` or by clicking the road) so the router reflects real conditions.

## 8. Cleaning done to produce this data

- Dropped 60 `proposed` and `construction` road segments.
- Moved 174 footways/paths/steps to `paths_pedestrian.geojson`.
- Kept roads that cross the boundary; dropped features entirely outside it.
- Kept only the main connected road network (54 disconnected road pieces removed, and running the script with `--snap-m 25` would bridge 8 near-miss gaps of 8 to 25 m and recover 17 more ways).
- Shelter candidates reduced from 175 to **162** by removing: 7 unnamed candidates (3 `shelter`, 2 `community_centre`, 2 `place_of_worship`), 5 schools more than 300 m from any mapped road (De Vera, Banban, Del Rosario, San Isidro Elementary, San Isidro National High School), and 1 place of worship (AQ Chapel) not reachable both ways because of one-way streets.
- Regenerate with: `python clean_daraga.py --data Daraga_Roads.geojson --boundary clipping_boundary.geojson --out cleaned`

## 9. Known limitations (be honest about these in the demo)

1. **Speeds are assumptions.** Travel times are estimates, not measured. Tune `SPEED_KPH` in the script.
2. **Surface is guessed for 84% of edges.** Do not claim road-surface accuracy.
3. **Shelter capacity, accessibility, and official status are unknown.** Candidates were chosen by building type, not by an official evacuation center list.
4. **No residents, vehicles, or hazards in the data.** Use synthetic or manually entered values and say so.
5. **Removing the 3 unnamed `shelter` features left no features tagged `shelter`.** The remaining shelters are mostly schools, churches, and town halls. An official list should replace this.
6. **Missing roads exist.** The 5 removed schools had no mapped road within 800 m, so some rural access roads are missing from the map data.
7. **Nearest-node snapping** can pick a node on a different road than intended when two roads run close together. Show the snapped point to users.
8. **Most roads are unnamed.** Give directions as map lines and pickup pins, not street names.

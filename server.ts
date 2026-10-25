import express, { Request, Response } from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(cors());
app.use(express.json());

// --- GRAPH & ENTITY DATA INTERFACES ---
export interface NodeItem {
  id: number;
  lon: number;
  lat: number;
}

export interface EdgeItem {
  eid: number;
  u: number;
  v: number;
  highway: string;
  name: string;
  length_m: number;
  time_s: number;
  bridge: boolean;
  oneway: boolean;
}

export interface Resident {
  id: string;
  name: string;
  phone: string;
  age: number;
  ageGroup: 'senior' | 'adult' | 'child';
  need: 'none' | 'elderly' | 'wheelchair' | 'stretcher' | 'physical_help' | 'infant';
  notes: string;
  barangay: string;
  lon: number;
  lat: number;
  snappedNode: number;
  priorityScore: number;
  status: 'waiting' | 'assigned' | 'picked_up' | 'delivered';
  assignedVehicleId?: string;
  assignedShelterId?: number;
  requestedAt: string;
  minutesWaiting: number;
  customMessage?: string;
}

export interface RouteStop {
  type: 'pickup' | 'shelter_dropoff' | 'depot';
  id: string;
  label: string;
  node: number;
  coords: [number, number]; // [lon, lat]
  status: 'pending' | 'completed';
  residentId?: string;
  shelterId?: number;
}

export interface Vehicle {
  id: string;
  name: string;
  type: string;
  driverName: string;
  seatsTotal: number;
  seatsFree: number;
  wheelchairSpaces: number;
  wheelchairFree: number;
  stretcherSpaces: number;
  stretcherFree: number;
  currentNode: number;
  currentCoords: [number, number]; // [lon, lat]
  status: 'available' | 'en_route' | 'full' | 'offline';
  assignedRequestIds: string[];
  destinationShelterId?: number;
  routeStops: RouteStop[];
  routePolyline: [number, number][]; // [[lon, lat], ...]
}

export interface Shelter {
  id: number;
  osmId: number;
  name: string;
  category: string;
  candidateTier: number;
  capacity: number;
  occupancy: number;
  isFull: boolean;
  wheelchairAccessible: boolean;
  accepts: string[];
  nearestNode: number;
  coords: [number, number]; // [lon, lat]
  contactPerson?: string;
  contactNumber?: string;
}

export interface WeatherState {
  scenario: string;
  scenarioName: string;
  simulatedDateTime: string; // e.g. "2026-12-22 23:00"
  rain1h: number; // mm/h
  rain3h: number; // mm
  windSpeed: number; // km/h
  windGusts: number; // km/h
  pressureMsl: number; // hPa
  soilMoisture: number; // m3/m3
  cloudCover: number; // %
  relativeHumidity: number; // %
  soilTemp: number; // °C
  apparentTemp: number; // °C
  sustainedHours: {
    'Cyclone / Typhoon': number;
    'Flash Flood': number;
    'Volcanic Lahar': number;
    'Rain-Induced Landslide': number;
  };
  riskScores: {
    'Cyclone / Typhoon': number;
    'Flash Flood': number;
    'Volcanic Lahar': number;
    'Rain-Induced Landslide': number;
  };
  alerts: {
    hazard: string;
    confidence: number;
    duration: number;
    required: number;
    severity: 'WARNING' | 'ADVISORY' | 'WATCH';
  }[];
  status: 'SAFE' | 'ALERT_ACTIVE';
  primaryDisaster?: string;
  historicalDisclaimer: string;
}

// In-Memory Graph Storage
let nodesList: NodeItem[] = [];
let nodesMap = new Map<number, NodeItem>();
let adjacency = new Map<number, { v: number; t: number; len: number; eid: number }[]>();
let edgesMap = new Map<number, EdgeItem>();

// In-Memory App State
let shelters: Shelter[] = [];
let medicalFacilities: any[] = [];
let transportHubs: any[] = [];
let residents: Resident[] = [];
let vehicles: Vehicle[] = [];
let blockedEdges = new Set<number>();
let floodedEdges = new Map<number, number>(); // eid -> multiplier

// Curated Test Scenarios from testCases.py
const TEST_CASE_SCENARIOS = [
  {
    id: 'typhoon_warning',
    name: 'Typhoon Warning (Signal #2)',
    date: '2026-12-22 23:00',
    description: '4-hour sustained severe gusts (90 km/h) & barometric pressure drop to 988 hPa. Sustained risk >75% for 4h (needs 3h).',
    hazard: 'Cyclone / Typhoon',
    params: {
      rain1h: 22.0,
      rain3h: 58.0,
      windSpeed: 64.0,
      windGusts: 92.0,
      pressureMsl: 988.0,
      soilMoisture: 0.44,
      cloudCover: 100,
      relativeHumidity: 95,
      soilTemp: 22.0,
      apparentTemp: 21.0,
      sustainedHours: {
        'Cyclone / Typhoon': 4,
        'Flash Flood': 2,
        'Volcanic Lahar': 1,
        'Rain-Induced Landslide': 2,
      },
    },
  },
  {
    id: 'flash_flood',
    name: 'Flash Flood Warning (PAGASA Red)',
    date: '2026-11-14 14:00',
    description: 'Extreme torrential rain (28 mm/h, 68 mm 3h) exceeding PAGASA 3-hour red warning. Sustained for 3h (needs 2h).',
    hazard: 'Flash Flood',
    params: {
      rain1h: 28.5,
      rain3h: 68.0,
      windSpeed: 36.0,
      windGusts: 48.0,
      pressureMsl: 1002.0,
      soilMoisture: 0.46,
      cloudCover: 98,
      relativeHumidity: 98,
      soilTemp: 23.0,
      apparentTemp: 24.0,
      sustainedHours: {
        'Cyclone / Typhoon': 1,
        'Flash Flood': 3,
        'Volcanic Lahar': 2,
        'Rain-Induced Landslide': 2,
      },
    },
  },
  {
    id: 'lahar_advisory',
    name: 'Mayon Volcanic Lahar Advisory (PHIVOLCS)',
    date: '2026-12-05 18:00',
    description: 'High soil saturation on Mayon slopes combined with sudden cloudburst rainfall (>30 mm/h). Immediate channel hazard.',
    hazard: 'Volcanic Lahar',
    params: {
      rain1h: 32.0,
      rain3h: 75.0,
      windSpeed: 24.0,
      windGusts: 36.0,
      pressureMsl: 1005.0,
      soilMoisture: 0.49,
      cloudCover: 95,
      relativeHumidity: 94,
      soilTemp: 20.5,
      apparentTemp: 22.0,
      sustainedHours: {
        'Cyclone / Typhoon': 0,
        'Flash Flood': 2,
        'Volcanic Lahar': 3,
        'Rain-Induced Landslide': 3,
      },
    },
  },
  {
    id: 'safe',
    name: 'Normal Weather / All Clear',
    date: '2026-10-25 08:00',
    description: 'Mild tropical breeze, no sustained flood or lahar threshold exceeded. Safe for routine operations.',
    hazard: 'None',
    params: {
      rain1h: 0.2,
      rain3h: 1.5,
      windSpeed: 10.0,
      windGusts: 15.0,
      pressureMsl: 1013.0,
      soilMoisture: 0.28,
      cloudCover: 30,
      relativeHumidity: 65,
      soilTemp: 26.5,
      apparentTemp: 28.0,
      sustainedHours: {
        'Cyclone / Typhoon': 0,
        'Flash Flood': 0,
        'Volcanic Lahar': 0,
        'Rain-Induced Landslide': 0,
      },
    },
  },
];

// Weather State Initialization
let weatherState: WeatherState = {
  scenario: 'typhoon_warning',
  scenarioName: 'Typhoon Warning (Signal #2)',
  simulatedDateTime: '2026-12-22 23:00',
  rain1h: 22.0,
  rain3h: 58.0,
  windSpeed: 64.0,
  windGusts: 92.0,
  pressureMsl: 988.0,
  soilMoisture: 0.44,
  cloudCover: 100,
  relativeHumidity: 95,
  soilTemp: 22.0,
  apparentTemp: 21.0,
  sustainedHours: {
    'Cyclone / Typhoon': 4,
    'Flash Flood': 2,
    'Volcanic Lahar': 1,
    'Rain-Induced Landslide': 2,
  },
  riskScores: {
    'Cyclone / Typhoon': 85,
    'Flash Flood': 72,
    'Volcanic Lahar': 60,
    'Rain-Induced Landslide': 58,
  },
  alerts: [],
  status: 'ALERT_ACTIVE',
  primaryDisaster: 'Cyclone / Typhoon',
  historicalDisclaimer: 'Historical risk indicator only; always follow official PAGASA / PHIVOLCS advisories.',
};

// --- DIJKSTRA MINHEAP IMPLEMENTATION ---
class MinHeap {
  heap: [number, number][]; // [distance, nodeId]
  constructor() {
    this.heap = [];
  }
  push(val: [number, number]) {
    this.heap.push(val);
    this._bubbleUp(this.heap.length - 1);
  }
  pop(): [number, number] | null {
    if (this.heap.length === 0) return null;
    const top = this.heap[0];
    const bottom = this.heap.pop();
    if (this.heap.length > 0 && bottom) {
      this.heap[0] = bottom;
      this._sinkDown(0);
    }
    return top;
  }
  _bubbleUp(idx: number) {
    while (idx > 0) {
      const parentIdx = (idx - 1) >> 1;
      if (this.heap[idx][0] >= this.heap[parentIdx][0]) break;
      const tmp = this.heap[idx];
      this.heap[idx] = this.heap[parentIdx];
      this.heap[parentIdx] = tmp;
      idx = parentIdx;
    }
  }
  _sinkDown(idx: number) {
    const len = this.heap.length;
    while (true) {
      let left = (idx << 1) + 1;
      let right = left + 1;
      let smallest = idx;
      if (left < len && this.heap[left][0] < this.heap[smallest][0]) smallest = left;
      if (right < len && this.heap[right][0] < this.heap[smallest][0]) smallest = right;
      if (smallest === idx) break;
      const tmp = this.heap[idx];
      this.heap[idx] = this.heap[smallest];
      this.heap[smallest] = tmp;
      idx = smallest;
    }
  }
  size(): number {
    return this.heap.length;
  }
}

function dijkstra(srcNode: number, dstNode?: number) {
  const maxNode = 32000;
  const dist = new Float64Array(maxNode).fill(Infinity);
  const prevNode = new Int32Array(maxNode).fill(-1);
  dist[srcNode] = 0;

  const pq = new MinHeap();
  pq.push([0, srcNode]);

  while (pq.size() > 0) {
    const popped = pq.pop();
    if (!popped) break;
    const [d, u] = popped;
    if (d > dist[u]) continue;
    if (dstNode !== undefined && u === dstNode) break;

    const neighbors = adjacency.get(u);
    if (!neighbors) continue;

    for (let i = 0; i < neighbors.length; i++) {
      const { v, t, eid } = neighbors[i];
      if (blockedEdges.has(eid)) continue;

      const penalty = floodedEdges.get(eid) || 1.0;
      const nd = d + t * penalty;

      if (nd < dist[v]) {
        dist[v] = nd;
        prevNode[v] = u;
        pq.push([nd, v]);
      }
    }
  }

  return { dist, prevNode };
}

function getPathCoordinates(prevNode: Int32Array, srcNode: number, dstNode: number): [number, number][] {
  const pathNodes: number[] = [];
  let curr = dstNode;

  while (curr !== -1) {
    pathNodes.push(curr);
    if (curr === srcNode) break;
    curr = prevNode[curr];
  }

  if (pathNodes[pathNodes.length - 1] !== srcNode) {
    return []; // No path found
  }

  pathNodes.reverse();
  const coords: [number, number][] = [];
  for (const nid of pathNodes) {
    const node = nodesMap.get(nid);
    if (node) {
      coords.push([node.lon, node.lat]);
    }
  }
  return coords;
}

// Distance snapping using cosine correction for 13.1° Latitude
const K_COS = Math.cos(13.1 * (Math.PI / 180));

function snapToNearestNode(lon0: number, lat0: number): { nodeId: number; distMeters: number } {
  let bestDistSq = Infinity;
  let bestNodeId = 0;

  for (let i = 0; i < nodesList.length; i++) {
    const n = nodesList[i];
    const dx = (n.lon - lon0) * K_COS;
    const dy = n.lat - lat0;
    const d2 = dx * dx + dy * dy;
    if (d2 < bestDistSq) {
      bestDistSq = d2;
      bestNodeId = n.id;
    }
  }

  const distMeters = Math.sqrt(bestDistSq) * 111320;
  return { nodeId: bestNodeId, distMeters };
}

// Priority Score (combining need severity, age factor, and waiting time)
function calculatePriorityScore(need: string, ageGroup: string, minutesWaiting: number): number {
  let severity = 1;
  if (need === 'stretcher') severity = 5;
  else if (need === 'wheelchair') severity = 4;
  else if (need === 'physical_help' || need === 'elderly') severity = 3;
  else if (need === 'infant') severity = 3;

  let ageFactor = 1;
  if (ageGroup === 'senior') ageFactor = 4;
  else if (ageGroup === 'child') ageFactor = 2;

  return Math.round((3 * severity + 2 * ageFactor + 0.05 * minutesWaiting) * 10) / 10;
}

// Find best shelter with space and matching accessible need
function findBestShelter(fromNode: number, residentNeed: string): Shelter | null {
  const eligible = shelters.filter(s => {
    if (s.isFull) return false;
    if (residentNeed === 'wheelchair' && !s.wheelchairAccessible) return false;
    if (s.occupancy >= s.capacity) return false;
    return true;
  });

  if (eligible.length === 0) return null;

  const { dist } = dijkstra(fromNode);

  let bestShelter: Shelter | null = null;
  let minTime = Infinity;

  for (const s of eligible) {
    const travelTime = dist[s.nearestNode];
    const tierBonus = s.candidateTier === 1 ? 0 : 45; // slight preference for official evacuation centers
    if (travelTime !== Infinity && travelTime + tierBonus < minTime) {
      minTime = travelTime + tierBonus;
      bestShelter = s;
    }
  }

  return bestShelter || eligible[0];
}

// Recompute Vehicle Route Stops & Full Dijkstra Polyline
function recomputeVehicleRoute(vehicle: Vehicle) {
  if (vehicle.routeStops.length === 0) {
    vehicle.routePolyline = [];
    return;
  }

  let currNode = vehicle.currentNode;
  const fullPolyline: [number, number][] = [];

  for (const stop of vehicle.routeStops) {
    if (stop.status === 'completed') continue;
    const { prevNode } = dijkstra(currNode, stop.node);
    const legCoords = getPathCoordinates(prevNode, currNode, stop.node);
    if (legCoords.length > 0) {
      if (fullPolyline.length > 0) {
        fullPolyline.push(...legCoords.slice(1));
      } else {
        fullPolyline.push(...legCoords);
      }
      currNode = stop.node;
    } else {
      const nodeObj = nodesMap.get(stop.node);
      if (nodeObj) fullPolyline.push([nodeObj.lon, nodeObj.lat]);
    }
  }

  vehicle.routePolyline = fullPolyline;
}

// Re-evaluate Weather Risk using PAGASA/PHIVOLCS logic from future1.py
function calculateWeatherRisk(w: WeatherState): WeatherState {
  function level_v(val: number, low: number, high: number): number {
    if (val < low) return 0;
    if (val <= high) return 50;
    return 100;
  }

  const pScore = w.pressureMsl > 1005 ? 0 : w.pressureMsl >= 995 ? 50 : 100;

  const cycloneScore = Math.min(100, Math.round(
    level_v(w.windGusts, 39, 60) * 0.35 +
    pScore * 0.30 +
    level_v(w.rain1h, 7.5, 15) * 0.20 +
    level_v(w.windSpeed, 39, 61) * 0.10 +
    (w.cloudCover >= 85 ? 100 : 0) * 0.05
  ));

  const floodScore = Math.min(100, Math.round(
    level_v(w.rain1h, 7.5, 15) * 0.60 +
    level_v(w.rain3h, 45, 65) * 0.30 +
    (w.relativeHumidity >= 90 ? 100 : 0) * 0.10
  ));

  const laharScore = Math.min(100, Math.round(
    level_v(w.rain1h, 10, 30) * 0.50 +
    level_v(w.soilMoisture, 0.40, 0.46) * 0.40 +
    (w.soilTemp <= 23.5 ? 100 : 0) * 0.10
  ));

  const landslideScore = Math.min(100, Math.round(
    level_v(w.soilMoisture, 0.42, 0.48) * 0.50 +
    level_v(w.rain3h, 45, 65) * 0.40 +
    (w.apparentTemp <= 24.0 ? 100 : 0) * 0.10
  ));

  const riskScores = {
    'Cyclone / Typhoon': cycloneScore,
    'Flash Flood': floodScore,
    'Volcanic Lahar': laharScore,
    'Rain-Induced Landslide': landslideScore,
  };

  const reqHours: Record<string, number> = {
    'Volcanic Lahar': 1,
    'Flash Flood': 2,
    'Cyclone / Typhoon': 3,
    'Rain-Induced Landslide': 3,
  };

  const alerts: WeatherState['alerts'] = [];
  const hazards = ['Cyclone / Typhoon', 'Flash Flood', 'Volcanic Lahar', 'Rain-Induced Landslide'] as const;

  for (const h of hazards) {
    const score = riskScores[h];
    const duration = w.sustainedHours[h] || 0;
    const required = reqHours[h];

    if (score >= 40 && duration >= required) {
      alerts.push({
        hazard: h,
        confidence: score,
        duration,
        required,
        severity: score >= 75 ? 'WARNING' : 'ADVISORY',
      });
    }
  }

  alerts.sort((a, b) => b.confidence - a.confidence);

  return {
    ...w,
    riskScores,
    alerts,
    status: alerts.length > 0 ? 'ALERT_ACTIVE' : 'SAFE',
    primaryDisaster: alerts.length > 0 ? alerts[0].hazard : undefined,
  };
}

// Initial Data Population
function seedDefaultState() {
  const dataDir = path.join(__dirname, 'data', 'daraga');

  // 1. Nodes
  const nodesCsvPath = path.join(dataDir, 'graph_nodes.csv');
  if (fs.existsSync(nodesCsvPath)) {
    const rawNodes = fs.readFileSync(nodesCsvPath, 'utf8').trim().split('\n');
    nodesList = [];
    nodesMap.clear();
    for (let i = 1; i < rawNodes.length; i++) {
      const parts = rawNodes[i].split(',');
      const id = parseInt(parts[0], 10);
      const lon = parseFloat(parts[1]);
      const lat = parseFloat(parts[2]);
      const item: NodeItem = { id, lon, lat };
      nodesList.push(item);
      nodesMap.set(id, item);
    }
    console.log(`Loaded ${nodesList.length} graph nodes.`);
  }

  // 2. Edges
  const edgesCsvPath = path.join(dataDir, 'graph_edges.csv');
  if (fs.existsSync(edgesCsvPath)) {
    const rawEdges = fs.readFileSync(edgesCsvPath, 'utf8').trim().split('\n');
    adjacency.clear();
    edgesMap.clear();
    for (let i = 1; i < rawEdges.length; i++) {
      const parts = rawEdges[i].split(',');
      const eid = parseInt(parts[0], 10);
      const u = parseInt(parts[1], 10);
      const v = parseInt(parts[2], 10);
      const highway = parts[4] || 'residential';
      const name = parts[5] || '';
      const length_m = parseFloat(parts[6]) || 50;
      const time_s = parseFloat(parts[7]) || 5;
      const oneway = parts[8] === '1';
      const bridge = parts[9] === '1';

      const edgeItem: EdgeItem = { eid, u, v, highway, name, length_m, time_s, bridge, oneway };
      edgesMap.set(eid, edgeItem);

      if (!adjacency.has(u)) adjacency.set(u, []);
      adjacency.get(u)!.push({ v, t: time_s, len: length_m, eid });

      if (!oneway) {
        if (!adjacency.has(v)) adjacency.set(v, []);
        adjacency.get(v)!.push({ v: u, t: time_s, len: length_m, eid });
      }
    }
    console.log(`Loaded ${edgesMap.size} graph edges.`);
  }

  // 3. Shelters
  const sheltersPath = path.join(dataDir, 'shelter_candidates.geojson');
  if (fs.existsSync(sheltersPath)) {
    const rawShelters = JSON.parse(fs.readFileSync(sheltersPath, 'utf8'));
    shelters = rawShelters.features.map((f: any, idx: number) => {
      const tier = f.properties.candidate_tier || 1;
      const category = f.properties.category || 'school';
      const defaultCapacity = tier === 1 ? (category === 'school' ? 250 : 180) : 100;
      const isAccessible = tier === 1 || category === 'school' || category === 'community_centre';
      return {
        id: idx + 1,
        osmId: f.properties.osm_id,
        name: f.properties.name,
        category: f.properties.category,
        candidateTier: tier,
        capacity: defaultCapacity,
        occupancy: idx === 0 ? 45 : idx === 1 ? 20 : 0,
        isFull: false,
        wheelchairAccessible: isAccessible,
        accepts: isAccessible ? ['wheelchair', 'elderly', 'general'] : ['elderly', 'general'],
        nearestNode: f.properties.nearest_node,
        coords: f.geometry.coordinates as [number, number],
        contactPerson: 'Barangay Responders Unit',
        contactNumber: '(052) 480-DRRMO',
      };
    });
    console.log(`Loaded ${shelters.length} evacuation shelters.`);
  }

  // 4. Medical Facilities
  const medicalPath = path.join(dataDir, 'medical_facilities.geojson');
  if (fs.existsSync(medicalPath)) {
    const rawMedical = JSON.parse(fs.readFileSync(medicalPath, 'utf8'));
    medicalFacilities = rawMedical.features.map((f: any, idx: number) => ({
      id: idx + 1,
      name: f.properties.name || 'Daraga Health Station',
      category: f.properties.category,
      nearestNode: f.properties.nearest_node,
      coords: f.geometry.coordinates,
    }));
  }

  // 5. Transport Hubs
  const transportPath = path.join(dataDir, 'transport_hubs.geojson');
  if (fs.existsSync(transportPath)) {
    const rawTransport = JSON.parse(fs.readFileSync(transportPath, 'utf8'));
    transportHubs = rawTransport.features.map((f: any, idx: number) => ({
      id: idx + 1,
      name: f.properties.name,
      nearestNode: f.properties.nearest_node,
      coords: f.geometry.coordinates,
    }));
  }

  // Initial Vehicles Fleet
  const depotNode = 9065; // Daraga Bus Station
  const depotCoords: [number, number] = [123.7114, 13.1478];

  vehicles = [
    {
      id: 'BUS-01',
      name: 'Accessible Minibus 01',
      type: 'Minibus with Wheelchair Lift',
      driverName: 'Kuya Ramon (Driver 1)',
      seatsTotal: 16,
      seatsFree: 13,
      wheelchairSpaces: 2,
      wheelchairFree: 1,
      stretcherSpaces: 0,
      stretcherFree: 0,
      currentNode: depotNode,
      currentCoords: depotCoords,
      status: 'available',
      assignedRequestIds: ['res-1', 'res-2'],
      destinationShelterId: 1,
      routeStops: [],
      routePolyline: [],
    },
    {
      id: 'VAN-02',
      name: 'PWD Wheelchair Shuttle 02',
      type: 'Low-Floor Accessible Van',
      driverName: 'Manong Jerry (Driver 2)',
      seatsTotal: 8,
      seatsFree: 7,
      wheelchairSpaces: 4,
      wheelchairFree: 3,
      stretcherSpaces: 0,
      stretcherFree: 0,
      currentNode: depotNode,
      currentCoords: depotCoords,
      status: 'available',
      assignedRequestIds: ['res-3'],
      destinationShelterId: 1,
      routeStops: [],
      routePolyline: [],
    },
    {
      id: 'TRUCK-03',
      name: 'Heavy Rescue 6x6 Truck 03',
      type: 'High-Water Evacuation Truck',
      driverName: 'Captain Arnel (Driver 3)',
      seatsTotal: 24,
      seatsFree: 24,
      wheelchairSpaces: 0,
      wheelchairFree: 0,
      stretcherSpaces: 0,
      stretcherFree: 0,
      currentNode: depotNode,
      currentCoords: depotCoords,
      status: 'available',
      assignedRequestIds: [],
      destinationShelterId: 2,
      routeStops: [],
      routePolyline: [],
    },
  ];

  // Seed sample residents from Daraga barangays
  residents = [
    {
      id: 'res-1',
      name: 'Lola Remedios Alcantara',
      phone: '0917-555-8921',
      age: 81,
      ageGroup: 'senior',
      need: 'elderly',
      notes: 'Severe arthritis, walking cane, needs assistance stepping onto bus',
      barangay: 'Barangay Tagas',
      lon: 123.6925,
      lat: 13.1382,
      snappedNode: snapToNearestNode(123.6925, 13.1382).nodeId,
      priorityScore: calculatePriorityScore('elderly', 'senior', 30),
      status: 'assigned',
      assignedVehicleId: 'BUS-01',
      assignedShelterId: 1,
      requestedAt: new Date(Date.now() - 30 * 60000).toISOString(),
      minutesWaiting: 30,
    },
    {
      id: 'res-2',
      name: 'Tatay Rolando Santos',
      phone: '0928-555-4312',
      age: 72,
      ageGroup: 'senior',
      need: 'wheelchair',
      notes: 'Full-time wheelchair user, requires vehicle ramp',
      barangay: 'Barangay Kimantong',
      lon: 123.7051,
      lat: 13.1495,
      snappedNode: snapToNearestNode(123.7051, 13.1495).nodeId,
      priorityScore: calculatePriorityScore('wheelchair', 'senior', 45),
      status: 'assigned',
      assignedVehicleId: 'BUS-01',
      assignedShelterId: 1,
      requestedAt: new Date(Date.now() - 45 * 60000).toISOString(),
      minutesWaiting: 45,
    },
    {
      id: 'res-3',
      name: 'Nanay Corazon Flores',
      phone: '0905-555-7731',
      age: 68,
      ageGroup: 'senior',
      need: 'wheelchair',
      notes: 'Wheelchair user living near riverbank overflow area',
      barangay: 'Barangay Bañag',
      lon: 123.7142,
      lat: 13.1530,
      snappedNode: snapToNearestNode(123.7142, 13.1530).nodeId,
      priorityScore: calculatePriorityScore('wheelchair', 'senior', 15),
      status: 'assigned',
      assignedVehicleId: 'VAN-02',
      assignedShelterId: 1,
      requestedAt: new Date(Date.now() - 15 * 60000).toISOString(),
      minutesWaiting: 15,
    },
    {
      id: 'res-4',
      name: 'Elena Morales & Infant',
      phone: '0949-555-1289',
      age: 32,
      ageGroup: 'adult',
      need: 'infant',
      notes: 'Mother with 4-month-old infant, ground floor water reaching knee height',
      barangay: 'Barangay Malabog',
      lon: 123.6738,
      lat: 13.1250,
      snappedNode: snapToNearestNode(123.6738, 13.1250).nodeId,
      priorityScore: calculatePriorityScore('infant', 'child', 10),
      status: 'waiting',
      requestedAt: new Date(Date.now() - 10 * 60000).toISOString(),
      minutesWaiting: 10,
    },
  ];

  // Set up initial routes for vehicles
  for (const v of vehicles) {
    const assignedRiders = residents.filter(r => r.assignedVehicleId === v.id && r.status === 'assigned');
    if (assignedRiders.length > 0) {
      const dropShelter = shelters[0];
      v.routeStops = [
        ...assignedRiders.map(r => ({
          type: 'pickup' as const,
          id: r.id,
          label: `Pickup: ${r.name} (${r.barangay})`,
          node: r.snappedNode,
          coords: [r.lon, r.lat] as [number, number],
          status: 'pending' as const,
          residentId: r.id,
        })),
        {
          type: 'shelter_dropoff' as const,
          id: `shelter-${dropShelter.id}`,
          label: `Drop-off: ${dropShelter.name}`,
          node: dropShelter.nearestNode,
          coords: dropShelter.coords,
          status: 'pending' as const,
          shelterId: dropShelter.id,
        },
      ];
      recomputeVehicleRoute(v);
    }
  }

  weatherState = calculateWeatherRisk(weatherState);
}

// --- API ENDPOINTS ---

// 1. Initial State Data
app.get('/api/initial-data', (_req: Request, res: Response) => {
  res.json({
    shelters: shelters.slice(0, 80),
    allSheltersCount: shelters.length,
    medicalFacilities,
    transportHubs,
    vehicles,
    residents,
    blockedEdgesCount: blockedEdges.size,
    floodedEdgesCount: floodedEdges.size,
    weatherState,
    testCaseScenarios: TEST_CASE_SCENARIOS,
  });
});

// 2. Weather & Hazard Forecast
app.get('/api/forecast', (_req: Request, res: Response) => {
  res.json(weatherState);
});

app.post('/api/forecast/preset', (req: Request, res: Response) => {
  const { preset, customParams, testCaseDate } = req.body;

  const matched = TEST_CASE_SCENARIOS.find(s => s.id === preset || s.date === testCaseDate);
  if (matched) {
    weatherState = {
      ...weatherState,
      scenario: matched.id,
      scenarioName: matched.name,
      simulatedDateTime: matched.date,
      ...matched.params,
    };
  } else if (customParams) {
    weatherState = {
      ...weatherState,
      ...customParams,
      scenario: 'custom',
      scenarioName: 'Custom Responders Weather Simulation',
    };
  }

  weatherState = calculateWeatherRisk(weatherState);
  res.json(weatherState);
});

// 3. Resident Request Submission (Rider Interface)
app.post('/api/residents', (req: Request, res: Response) => {
  const { name, phone, age, need, notes, barangay, lon, lat } = req.body;

  if (!name || lon === undefined || lat === undefined) {
    return res.status(400).json({ error: 'Name, longitude, and latitude are required.' });
  }

  const ageNum = Number(age) || 65;
  const ageGroup = ageNum >= 60 ? 'senior' : ageNum <= 15 ? 'child' : 'adult';
  const { nodeId, distMeters } = snapToNearestNode(Number(lon), Number(lat));

  const priorityScore = calculatePriorityScore(need || 'none', ageGroup, 0);

  const newResident: Resident = {
    id: `res-${Date.now()}`,
    name,
    phone: phone || '',
    age: ageNum,
    ageGroup,
    need: need || 'none',
    notes: notes || '',
    barangay: barangay || 'Daraga Municipality',
    lon: Number(lon),
    lat: Number(lat),
    snappedNode: nodeId,
    priorityScore,
    status: 'waiting',
    requestedAt: new Date().toISOString(),
    minutesWaiting: 0,
  };

  // Find vehicle match
  const targetNeed = newResident.need;
  let chosenVehicle: Vehicle | null = null;

  for (const v of vehicles) {
    if (v.status === 'offline' || v.status === 'full') continue;
    if (v.seatsFree <= 0) continue;
    if (targetNeed === 'wheelchair' && v.wheelchairFree <= 0) continue;
    if (targetNeed === 'stretcher' && v.stretcherFree <= 0) continue;

    chosenVehicle = v;
    break;
  }

  if (chosenVehicle) {
    newResident.status = 'assigned';
    newResident.assignedVehicleId = chosenVehicle.id;

    chosenVehicle.seatsFree -= 1;
    if (targetNeed === 'wheelchair') chosenVehicle.wheelchairFree -= 1;
    if (targetNeed === 'stretcher') chosenVehicle.stretcherFree -= 1;
    chosenVehicle.assignedRequestIds.push(newResident.id);

    const bestShelter = findBestShelter(newResident.snappedNode, targetNeed) || shelters[0];
    newResident.assignedShelterId = bestShelter.id;

    const pickupStop: RouteStop = {
      type: 'pickup',
      id: newResident.id,
      label: `Pickup: ${newResident.name} (${newResident.barangay})`,
      node: newResident.snappedNode,
      coords: [newResident.lon, newResident.lat],
      status: 'pending',
      residentId: newResident.id,
    };

    const nonDropoffStops = chosenVehicle.routeStops.filter(s => s.type !== 'shelter_dropoff');
    const dropoffStop: RouteStop = {
      type: 'shelter_dropoff',
      id: `shelter-${bestShelter.id}`,
      label: `Drop-off: ${bestShelter.name}`,
      node: bestShelter.nearestNode,
      coords: bestShelter.coords,
      status: 'pending',
      shelterId: bestShelter.id,
    };

    chosenVehicle.routeStops = [...nonDropoffStops, pickupStop, dropoffStop];
    recomputeVehicleRoute(chosenVehicle);
  }

  residents.unshift(newResident);

  res.status(201).json({
    resident: newResident,
    assignedVehicle: chosenVehicle ? { id: chosenVehicle.id, name: chosenVehicle.name } : null,
    warning: distMeters > 300 ? `Location is ${Math.round(distMeters)}m from the nearest drivable road.` : null,
  });
});

// 4. Driver Interface: Mark Bus Full
// "A 'Bus full' button marks the bus full; its unserved riders go back to the waiting pool and are told to wait for another bus."
app.post('/api/vehicles/:id/full', (req: Request, res: Response) => {
  const { id } = req.params;
  const vehicle = vehicles.find(v => v.id === id);
  if (!vehicle) return res.status(404).json({ error: 'Vehicle not found.' });

  vehicle.status = 'full';
  vehicle.seatsFree = 0;
  vehicle.wheelchairFree = 0;

  // Unserved pending pickups on this bus return to the waiting pool
  const pendingPickupStops = vehicle.routeStops.filter(s => s.type === 'pickup' && s.status === 'pending');
  const reassignedRiderIds: string[] = [];

  for (const stop of pendingPickupStops) {
    if (!stop.residentId) continue;
    const resident = residents.find(r => r.id === stop.residentId);
    if (!resident) continue;

    // Reset status to waiting with explicit message: "Bus is full, please wait for the next bus"
    resident.status = 'waiting';
    resident.assignedVehicleId = undefined;
    resident.customMessage = 'Bus was marked full. Please wait for the next assigned evacuation vehicle.';
    reassignedRiderIds.push(resident.id);

    // Try finding next available vehicle that has capacity
    const nextVeh = vehicles.find(v => v.id !== vehicle.id && v.status === 'available' && v.seatsFree > 0);
    if (nextVeh) {
      resident.status = 'assigned';
      resident.assignedVehicleId = nextVeh.id;
      resident.customMessage = `Reassigned to ${nextVeh.name}. Please stay in place.`;
      nextVeh.seatsFree -= 1;
      nextVeh.assignedRequestIds.push(resident.id);
      nextVeh.routeStops.push({
        type: 'pickup',
        id: resident.id,
        label: `Pickup: ${resident.name} (${resident.barangay})`,
        node: resident.snappedNode,
        coords: [resident.lon, resident.lat],
        status: 'pending',
        residentId: resident.id,
      });
      recomputeVehicleRoute(nextVeh);
    }
  }

  // Driver route is trimmed to only proceed directly to the destination shelter drop-off for already-boarded passengers
  vehicle.routeStops = vehicle.routeStops.filter(s => s.type === 'shelter_dropoff' || s.status === 'completed');
  recomputeVehicleRoute(vehicle);

  res.json({
    success: true,
    vehicle,
    affectedRidersCount: reassignedRiderIds.length,
    message: `${vehicle.name} marked FULL. Unserved riders re-queued to waiting pool.`,
  });
});

// Driver Interface: Advance Stop / Pick up / Drop off
app.post('/api/vehicles/:id/advance-stop', (req: Request, res: Response) => {
  const { id } = req.params;
  const vehicle = vehicles.find(v => v.id === id);
  if (!vehicle) return res.status(404).json({ error: 'Vehicle not found.' });

  const nextStop = vehicle.routeStops.find(s => s.status === 'pending');
  if (nextStop) {
    nextStop.status = 'completed';
    vehicle.currentNode = nextStop.node;
    vehicle.currentCoords = nextStop.coords;

    if (nextStop.type === 'pickup' && nextStop.residentId) {
      const resident = residents.find(r => r.id === nextStop.residentId);
      if (resident) {
        resident.status = 'picked_up';
        resident.customMessage = 'Boarded on vehicle. En route to evacuation shelter.';
      }
    } else if (nextStop.type === 'shelter_dropoff') {
      // Deliver all aboard riders
      for (const resId of vehicle.assignedRequestIds) {
        const resident = residents.find(r => r.id === resId);
        if (resident && resident.status === 'picked_up') {
          resident.status = 'delivered';
          resident.customMessage = 'Safely arrived at evacuation shelter.';
          if (nextStop.shelterId) {
            const sh = shelters.find(s => s.id === nextStop.shelterId);
            if (sh) {
              sh.occupancy += 1;
              if (sh.occupancy >= sh.capacity) sh.isFull = true;
            }
          }
        }
      }
      vehicle.assignedRequestIds = [];
      vehicle.seatsFree = vehicle.seatsTotal;
      vehicle.wheelchairFree = vehicle.wheelchairSpaces;
      vehicle.status = 'available';
    }

    recomputeVehicleRoute(vehicle);
  }

  res.json({ vehicle });
});

// 5. Shelter Interface: "Shelter full" button
// "a 'Shelter full' button removes the shelter from available drop-off locations, and the driver is routed to the nearest shelter with space."
app.post('/api/shelters/:id/toggle-full', (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const shelter = shelters.find(s => s.id === id);
  if (!shelter) return res.status(404).json({ error: 'Shelter not found.' });

  shelter.isFull = !shelter.isFull;

  // If marked full, re-route any vehicles currently heading here to the next closest shelter with space!
  if (shelter.isFull) {
    for (const v of vehicles) {
      if (v.destinationShelterId === shelter.id) {
        const replacementShelter = findBestShelter(v.currentNode, 'wheelchair') || shelters.find(s => !s.isFull && s.id !== shelter.id);
        if (replacementShelter) {
          v.destinationShelterId = replacementShelter.id;
          // Replace shelter drop-off stop
          const dropStop = v.routeStops.find(s => s.type === 'shelter_dropoff');
          if (dropStop) {
            dropStop.id = `shelter-${replacementShelter.id}`;
            dropStop.label = `Drop-off: ${replacementShelter.name} (Rerouted: Previous Full)`;
            dropStop.node = replacementShelter.nearestNode;
            dropStop.coords = replacementShelter.coords;
            dropStop.shelterId = replacementShelter.id;
          }
          recomputeVehicleRoute(v);
        }
      }
    }
  }

  res.json({ shelter });
});

// Shelter accessibility toggle ("cannot accommodate wheelchairs")
app.post('/api/shelters/:id/toggle-wheelchair', (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const shelter = shelters.find(s => s.id === id);
  if (!shelter) return res.status(404).json({ error: 'Shelter not found.' });

  shelter.wheelchairAccessible = !shelter.wheelchairAccessible;
  if (shelter.wheelchairAccessible) {
    if (!shelter.accepts.includes('wheelchair')) shelter.accepts.push('wheelchair');
  } else {
    shelter.accepts = shelter.accepts.filter(a => a !== 'wheelchair');
  }

  res.json({ shelter });
});

// 6. Road Network GeoJSON & Boundary for Maps
app.get('/api/roads-geojson', (_req: Request, res: Response) => {
  const roadsPath = path.join(__dirname, 'data', 'daraga', 'roads_drivable.geojson');
  if (fs.existsSync(roadsPath)) {
    res.setHeader('Content-Type', 'application/json');
    fs.createReadStream(roadsPath).pipe(res);
  } else {
    res.status(404).json({ error: 'roads_drivable.geojson not found' });
  }
});

app.get('/api/clipping-boundary', (_req: Request, res: Response) => {
  const boundaryPath = path.join(__dirname, 'data', 'daraga', 'clipping_boundary.geojson');
  if (fs.existsSync(boundaryPath)) {
    res.setHeader('Content-Type', 'application/json');
    fs.createReadStream(boundaryPath).pipe(res);
  } else {
    res.status(404).json({ error: 'clipping_boundary.geojson not found' });
  }
});

// 7. Road Hazard Blockages
app.post('/api/roads/block', (req: Request, res: Response) => {
  const { edgeId, blocked, floodPenalty } = req.body;
  const eid = Number(edgeId);

  if (blocked) {
    blockedEdges.add(eid);
  } else {
    blockedEdges.delete(eid);
  }

  if (floodPenalty && floodPenalty > 1) {
    floodedEdges.set(eid, Number(floodPenalty));
  } else {
    floodedEdges.delete(eid);
  }

  for (const v of vehicles) {
    if (v.routeStops.length > 0) {
      recomputeVehicleRoute(v);
    }
  }

  res.json({
    blockedEdgesCount: blockedEdges.size,
    floodedEdgesCount: floodedEdges.size,
  });
});

// 8. Interactive Demo Simulation
app.post('/api/demo/run-scenario', (req: Request, res: Response) => {
  const { scenarioId } = req.body;
  const targetScenario = TEST_CASE_SCENARIOS.find(s => s.id === scenarioId) || TEST_CASE_SCENARIOS[0];

  // Set weather condition from testCases.py
  weatherState = {
    ...weatherState,
    scenario: targetScenario.id,
    scenarioName: targetScenario.name,
    simulatedDateTime: targetScenario.date,
    ...targetScenario.params,
  };
  weatherState = calculateWeatherRisk(weatherState);

  // Add an urgent elderly resident demo request from flood-prone Barangay Bañag
  const demoRider: Resident = {
    id: `demo-${Date.now()}`,
    name: 'Nanay Beatriz Magallanes (Demo Rider)',
    phone: '0919-888-2341',
    age: 86,
    ageGroup: 'senior',
    need: 'wheelchair',
    notes: 'Urgent: High water flood warning. Wheelchair accessible transport required immediately.',
    barangay: 'Barangay Bañag Riverbank',
    lon: 123.7082,
    lat: 13.1510,
    snappedNode: snapToNearestNode(123.7082, 13.1510).nodeId,
    priorityScore: 3 * 4 + 2 * 4 + 5, // Top priority score
    status: 'assigned',
    assignedVehicleId: 'VAN-02',
    assignedShelterId: 1,
    requestedAt: new Date().toISOString(),
    minutesWaiting: 5,
    customMessage: 'Dispatched PWD Wheelchair Shuttle 02. Driver is approaching.',
  };

  residents.unshift(demoRider);

  const van = vehicles.find(v => v.id === 'VAN-02');
  if (van) {
    van.assignedRequestIds.unshift(demoRider.id);
    van.seatsFree = Math.max(0, van.seatsFree - 1);
    van.wheelchairFree = Math.max(0, van.wheelchairFree - 1);

    const targetShelter = shelters[0];
    van.routeStops = [
      {
        type: 'pickup',
        id: demoRider.id,
        label: `Pickup: ${demoRider.name} (${demoRider.barangay})`,
        node: demoRider.snappedNode,
        coords: [demoRider.lon, demoRider.lat],
        status: 'pending',
        residentId: demoRider.id,
      },
      {
        type: 'shelter_dropoff',
        id: `shelter-${targetShelter.id}`,
        label: `Drop-off: ${targetShelter.name}`,
        node: targetShelter.nearestNode,
        coords: targetShelter.coords,
        status: 'pending',
        shelterId: targetShelter.id,
      },
    ];
    recomputeVehicleRoute(van);
  }

  res.json({
    success: true,
    scenario: targetScenario,
    demoRider,
    weatherState,
    vehicles,
    message: `Activated ${targetScenario.name} from testCases.py (${targetScenario.date}). High-priority rider dispatched.`,
  });
});

app.post('/api/demo/reset', (_req: Request, res: Response) => {
  blockedEdges.clear();
  floodedEdges.clear();
  seedDefaultState();
  res.json({ success: true, message: 'Reset all riders, buses, and shelters to clean default state.' });
});

// --- SERVER INITIALIZATION & VITE MIDDLEWARE ---
async function startServer() {
  seedDefaultState();

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true, host: '0.0.0.0', port: PORT },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`ROUTEY Evacuation Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer().catch(err => {
  console.error('Failed to start server:', err);
});

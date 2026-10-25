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

export interface WeatherAlert {
  hazard: string;
  confidence: number;
  duration: number;
  required: number;
  severity: 'WARNING' | 'ADVISORY' | 'WATCH';
}

export interface WeatherState {
  scenario: string;
  scenarioName: string;
  simulatedDateTime: string;
  rain1h: number;
  rain3h: number;
  windSpeed: number;
  windGusts: number;
  pressureMsl: number;
  soilMoisture: number;
  cloudCover: number;
  relativeHumidity: number;
  soilTemp: number;
  apparentTemp: number;
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
  alerts: WeatherAlert[];
  status: 'SAFE' | 'ALERT_ACTIVE';
  primaryDisaster?: string;
  historicalDisclaimer: string;
}

export interface TestCaseScenario {
  id: string;
  name: string;
  date: string;
  description: string;
  hazard: string;
  params: any;
}

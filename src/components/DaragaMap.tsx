import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { Shelter, Vehicle, Resident } from '../types';
import { Layers, MapPin, Truck, Home, PlusCircle, CheckCircle2 } from 'lucide-react';

interface Props {
  shelters: Shelter[];
  vehicles: Vehicle[];
  residents: Resident[];
  medicalFacilities: any[];
  transportHubs: any[];
  onMapClickLocation?: (coords: { lon: number; lat: number }) => void;
  highContrast: boolean;
}

export const DaragaMap: React.FC<Props> = ({
  shelters,
  vehicles,
  residents,
  medicalFacilities,
  transportHubs,
  onMapClickLocation,
  highContrast,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  // Layer groups
  const boundaryLayerRef = useRef<L.GeoJSON | null>(null);
  const shelterLayerRef = useRef<L.LayerGroup | null>(null);
  const vehicleLayerRef = useRef<L.LayerGroup | null>(null);
  const residentLayerRef = useRef<L.LayerGroup | null>(null);
  const routesLayerRef = useRef<L.LayerGroup | null>(null);
  const medicalLayerRef = useRef<L.LayerGroup | null>(null);
  const hubsLayerRef = useRef<L.LayerGroup | null>(null);

  // Toggles
  const [showShelters, setShowShelters] = useState(true);
  const [showVehicles, setShowVehicles] = useState(true);
  const [showResidents, setShowResidents] = useState(true);
  const [showMedical, setShowMedical] = useState(true);
  const [selectedEntity, setSelectedEntity] = useState<any>(null);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    // Center of Daraga, Albay [lat, lon]
    const map = L.map(mapContainerRef.current, {
      center: [13.144, 123.697],
      zoom: 14,
      minZoom: 11,
      maxZoom: 18,
    });

    // Dark high-contrast OpenStreetMap tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors &bull; Daraga LGU Evac Graph',
      className: highContrast ? 'dark-tile-layer' : '',
    }).addTo(map);

    // Initialize Layer Groups
    shelterLayerRef.current = L.layerGroup().addTo(map);
    vehicleLayerRef.current = L.layerGroup().addTo(map);
    residentLayerRef.current = L.layerGroup().addTo(map);
    routesLayerRef.current = L.layerGroup().addTo(map);
    medicalLayerRef.current = L.layerGroup().addTo(map);
    hubsLayerRef.current = L.layerGroup().addTo(map);

    // Map click handler to place pin
    map.on('click', (e: L.LeafletMouseEvent) => {
      const { lat, lng } = e.latlng;
      if (onMapClickLocation) {
        onMapClickLocation({ lon: lng, lat });
      }
    });

    // Fetch clipping boundary GeoJSON
    fetch('/api/clipping-boundary')
      .then(res => res.json())
      .then(geoJsonData => {
        if (boundaryLayerRef.current) map.removeLayer(boundaryLayerRef.current);
        boundaryLayerRef.current = L.geoJSON(geoJsonData, {
          style: {
            color: '#f59e0b',
            weight: 2.5,
            dashArray: '6, 6',
            fillColor: '#f59e0b',
            fillOpacity: 0.04,
          },
        }).addTo(map);
      })
      .catch(() => console.log('Boundary loaded or offline'));

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, [highContrast]);

  // Update Shelters Layer
  useEffect(() => {
    const layer = shelterLayerRef.current;
    if (!layer) return;
    layer.clearLayers();

    if (!showShelters) return;

    shelters.forEach(s => {
      // GeoJSON has coords [lon, lat]; Leaflet needs [lat, lon]
      const [lon, lat] = s.coords;
      const isFull = s.isFull;

      const marker = L.circleMarker([lat, lon], {
        radius: isFull ? 8 : 9,
        fillColor: isFull ? '#ef4444' : s.wheelchairAccessible ? '#10b981' : '#3b82f6',
        color: '#ffffff',
        weight: 2,
        opacity: 1,
        fillOpacity: 0.9,
      });

      marker.bindPopup(`
        <div style="font-family: sans-serif; min-width: 200px;">
          <div style="font-size: 11px; font-weight: bold; color: ${isFull ? '#dc2626' : '#059669'}; text-transform: uppercase;">
            ${isFull ? 'SHELTER FULL' : 'AVAILABLE EVACUATION CENTER'}
          </div>
          <div style="font-weight: 800; font-size: 14px; margin: 2px 0;">${s.name}</div>
          <div style="font-size: 12px; color: #475569;">${s.category} &bull; Tier ${s.candidateTier}</div>
          <div style="font-size: 12px; margin-top: 4px; font-weight: 600;">
            Occupancy: ${s.occupancy} / ${s.capacity}
          </div>
          <div style="font-size: 11px; color: #0284c7; margin-top: 2px;">
            ${s.wheelchairAccessible ? 'Wheelchair Accessible Ramp Available' : 'Standard Center'}
          </div>
        </div>
      `);

      marker.on('click', () => setSelectedEntity({ type: 'shelter', data: s }));
      marker.addTo(layer);
    });
  }, [shelters, showShelters]);

  // Update Residents Layer
  useEffect(() => {
    const layer = residentLayerRef.current;
    if (!layer) return;
    layer.clearLayers();

    if (!showResidents) return;

    residents.forEach(r => {
      const color =
        r.status === 'delivered'
          ? '#10b981'
          : r.status === 'picked_up'
          ? '#6366f1'
          : r.status === 'assigned'
          ? '#3b82f6'
          : '#f59e0b';

      const marker = L.circleMarker([r.lat, r.lon], {
        radius: r.need === 'wheelchair' || r.need === 'stretcher' ? 10 : 8,
        fillColor: color,
        color: '#ffffff',
        weight: 2.5,
        opacity: 1,
        fillOpacity: 0.95,
      });

      marker.bindPopup(`
        <div style="font-family: sans-serif; min-width: 210px;">
          <div style="font-size: 10px; font-weight: 800; color: ${color}; text-transform: uppercase;">
            RIDER: ${r.status.toUpperCase()} &bull; PRIORITY ${r.priorityScore}
          </div>
          <div style="font-weight: 800; font-size: 14px; margin: 2px 0;">${r.name}</div>
          <div style="font-size: 12px; color: #334155;">${r.age}yo &bull; ${r.barangay}</div>
          <div style="font-size: 12px; color: #b45309; font-weight: bold; margin-top: 2px;">
            Need: ${r.need.toUpperCase()}
          </div>
          ${r.notes ? `<div style="font-size: 11px; color: #64748b; font-style: italic; margin-top: 2px;">"${r.notes}"</div>` : ''}
          ${r.customMessage ? `<div style="font-size: 11px; color: #dc2626; font-weight: bold; margin-top: 3px;">${r.customMessage}</div>` : ''}
        </div>
      `);

      marker.on('click', () => setSelectedEntity({ type: 'resident', data: r }));
      marker.addTo(layer);
    });
  }, [residents, showResidents]);

  // Update Vehicles & Route Polylines
  useEffect(() => {
    const vLayer = vehicleLayerRef.current;
    const rLayer = routesLayerRef.current;
    if (!vLayer || !rLayer) return;

    vLayer.clearLayers();
    rLayer.clearLayers();

    if (!showVehicles) return;

    vehicles.forEach(v => {
      // GeoJSON has coords [lon, lat]; Leaflet needs [lat, lon]
      const [lon, lat] = v.currentCoords;
      const isFull = v.status === 'full';

      // Vehicle Marker Icon
      const busIcon = L.divIcon({
        className: 'custom-bus-icon',
        html: `
          <div style="
            background: ${isFull ? '#dc2626' : '#eab308'};
            color: #000;
            width: 32px;
            height: 32px;
            border-radius: 8px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: 900;
            font-size: 10px;
            border: 2px solid #fff;
            box-shadow: 0 4px 10px rgba(0,0,0,0.5);
          ">
            ${v.id.substring(0, 4)}
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });

      const marker = L.marker([lat, lon], { icon: busIcon });
      marker.bindPopup(`
        <div style="font-family: sans-serif; min-width: 220px;">
          <div style="font-size: 11px; font-weight: 800; color: ${isFull ? '#dc2626' : '#b45309'}; text-transform: uppercase;">
            ${v.name} [${v.status.toUpperCase()}]
          </div>
          <div style="font-size: 12px; color: #475569; margin: 2px 0;">Driver: ${v.driverName}</div>
          <div style="font-size: 12px; font-weight: 700;">
            Seats: ${v.seatsFree} / ${v.seatsTotal} &bull; Wheelchair: ${v.wheelchairFree} / ${v.wheelchairSpaces}
          </div>
          <div style="font-size: 11px; color: #0284c7; margin-top: 4px;">
            Route Stops: ${v.routeStops.length} queued
          </div>
        </div>
      `);

      marker.on('click', () => setSelectedEntity({ type: 'vehicle', data: v }));
      marker.addTo(vLayer);

      // Render Dijkstra Route Polyline: remember v.routePolyline is [[lon, lat], ...]
      if (v.routePolyline && v.routePolyline.length > 1) {
        const polylineCoords: [number, number][] = v.routePolyline.map(([pLon, pLat]) => [pLat, pLon]);
        const polyline = L.polyline(polylineCoords, {
          color: v.id === 'VAN-02' ? '#10b981' : '#eab308',
          weight: 4.5,
          opacity: 0.85,
          dashArray: isFull ? '8, 8' : undefined,
        });
        polyline.bindPopup(`Route Path for ${v.name}`);
        polyline.addTo(rLayer);
      }
    });
  }, [vehicles, showVehicles]);

  // Update Medical Facilities & Transport Hubs
  useEffect(() => {
    const mLayer = medicalLayerRef.current;
    const hLayer = hubsLayerRef.current;
    if (!mLayer || !hLayer) return;

    mLayer.clearLayers();
    hLayer.clearLayers();

    if (showMedical) {
      medicalFacilities.forEach(m => {
        const [lon, lat] = m.coords;
        const marker = L.circleMarker([lat, lon], {
          radius: 5,
          fillColor: '#38bdf8',
          color: '#ffffff',
          weight: 1.5,
          fillOpacity: 0.8,
        });
        marker.bindPopup(`<strong>${m.name}</strong><br><span style="font-size:11px; color:#64748b;">${m.category}</span>`);
        marker.addTo(mLayer);
      });
    }

    transportHubs.forEach(h => {
      const [lon, lat] = h.coords;
      const marker = L.circleMarker([lat, lon], {
        radius: 6,
        fillColor: '#f97316',
        color: '#ffffff',
        weight: 1.5,
        fillOpacity: 0.9,
      });
      marker.bindPopup(`<strong>${h.name}</strong><br><span style="font-size:11px; color:#64748b;">Vehicle Depot</span>`);
      marker.addTo(hLayer);
    });
  }, [medicalFacilities, transportHubs, showMedical]);

  return (
    <div className="relative w-full h-[600px] sm:h-[680px] rounded-2xl overflow-hidden border-2 border-slate-700 shadow-2xl bg-slate-900">
      {/* Map Container */}
      <div ref={mapContainerRef} className="w-full h-full z-0" />

      {/* Top Floating Controls */}
      <div className="absolute top-4 left-4 z-10 flex flex-wrap items-center gap-2 bg-slate-900/90 backdrop-blur-md border border-slate-700/80 p-2 rounded-xl shadow-xl">
        <div className="flex items-center gap-1.5 px-2 py-1 text-xs font-black uppercase text-amber-400">
          <Layers className="w-4 h-4" />
          <span>Layers</span>
        </div>

        <button
          onClick={() => setShowShelters(!showShelters)}
          className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
            showShelters ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'bg-slate-800 text-slate-500'
          }`}
        >
          Shelters ({shelters.length})
        </button>

        <button
          onClick={() => setShowVehicles(!showVehicles)}
          className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
            showVehicles ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' : 'bg-slate-800 text-slate-500'
          }`}
        >
          Buses &amp; Routes ({vehicles.length})
        </button>

        <button
          onClick={() => setShowResidents(!showResidents)}
          className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
            showResidents ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40' : 'bg-slate-800 text-slate-500'
          }`}
        >
          Riders ({residents.length})
        </button>

        <button
          onClick={() => setShowMedical(!showMedical)}
          className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
            showMedical ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40' : 'bg-slate-800 text-slate-500'
          }`}
        >
          Clinics ({medicalFacilities.length})
        </button>
      </div>

      {/* Bottom Floating Legend & Pin Tip */}
      <div className="absolute bottom-4 left-4 right-4 sm:right-auto z-10 bg-slate-900/95 backdrop-blur-md border border-slate-700/80 p-3 rounded-xl shadow-2xl text-xs space-y-2 max-w-md">
        <div className="flex justify-between items-center text-slate-300 font-bold border-b border-slate-800 pb-1.5">
          <span>Daraga Evacuation Map Legend</span>
          <span className="text-[10px] text-amber-400 font-mono">Boundary Buffer Active</span>
        </div>

        <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-300">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-emerald-500 ring-2 ring-white shrink-0" />
            <span>Open Evacuation Center</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-red-500 ring-2 ring-white shrink-0" />
            <span>Shelter Full</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded bg-amber-400 text-slate-950 font-black text-[9px] flex items-center justify-center shrink-0">
              BUS
            </span>
            <span>Accessible Rescue Transport</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-blue-500 ring-2 ring-white shrink-0" />
            <span>Rider Pickup Location</span>
          </div>
        </div>

        <p className="text-[10px] text-amber-300/80 pt-1 border-t border-slate-800 flex items-center gap-1">
          <PlusCircle className="w-3 h-3 shrink-0" />
          Click anywhere on map to drop a new emergency pickup pin for a resident!
        </p>
      </div>

      {/* Selected Entity Drawer */}
      {selectedEntity && (
        <div className="absolute top-4 right-4 z-10 w-72 bg-slate-900/95 backdrop-blur-md border border-slate-700 p-4 rounded-xl shadow-2xl text-xs space-y-2">
          <div className="flex justify-between items-center">
            <span className="font-bold uppercase tracking-wider text-amber-400">
              {selectedEntity.type.toUpperCase()} DETAILS
            </span>
            <button
              onClick={() => setSelectedEntity(null)}
              className="text-slate-400 hover:text-white font-bold px-1"
            >
              &times;
            </button>
          </div>
          <h4 className="font-extrabold text-sm text-white">{selectedEntity.data.name}</h4>
          {selectedEntity.type === 'resident' && (
            <div className="space-y-1 text-slate-300">
              <p>Status: <strong className="text-amber-400">{selectedEntity.data.status}</strong></p>
              <p>Need: {selectedEntity.data.need}</p>
              <p>Barangay: {selectedEntity.data.barangay}</p>
              <p>Priority Score: {selectedEntity.data.priorityScore}</p>
            </div>
          )}
          {selectedEntity.type === 'shelter' && (
            <div className="space-y-1 text-slate-300">
              <p>Category: {selectedEntity.data.category}</p>
              <p>Occupancy: {selectedEntity.data.occupancy} / {selectedEntity.data.capacity}</p>
              <p>Wheelchair: {selectedEntity.data.wheelchairAccessible ? 'Accessible' : 'Not Equipped'}</p>
              <p>Status: {selectedEntity.data.isFull ? 'FULL' : 'OPEN'}</p>
            </div>
          )}
          {selectedEntity.type === 'vehicle' && (
            <div className="space-y-1 text-slate-300">
              <p>Driver: {selectedEntity.data.driverName}</p>
              <p>Status: {selectedEntity.data.status}</p>
              <p>Seats Free: {selectedEntity.data.seatsFree} / {selectedEntity.data.seatsTotal}</p>
              <p>Wheelchair Spaces: {selectedEntity.data.wheelchairFree} / {selectedEntity.data.wheelchairSpaces}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

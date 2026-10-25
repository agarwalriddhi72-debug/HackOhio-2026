import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { Shelter, Vehicle, Resident } from '../types';
import { Layers, MapPin, Truck, Home, PlusCircle, AlertOctagon } from 'lucide-react';

interface Props {
  shelters: Shelter[];
  vehicles: Vehicle[];
  residents: Resident[];
  medicalFacilities: any[];
  transportHubs: any[];
  onMapClickLocation?: (coords: { lon: number; lat: number }) => void;
  highContrast: boolean;
  animatedVehicleId?: string | null;
  animatedCoords?: [number, number] | null; // [lon, lat] during live simulation
  isUserView?: boolean;
  isVehicleStopped?: boolean;
  vehicleStopLabel?: string;
}

export const DaragaMap: React.FC<Props> = ({
  shelters,
  vehicles,
  residents,
  medicalFacilities,
  transportHubs,
  onMapClickLocation,
  highContrast,
  animatedVehicleId,
  animatedCoords,
  isUserView = false,
  isVehicleStopped = false,
  vehicleStopLabel,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  // Layer groups
  const boundaryLayerRef = useRef<L.GeoJSON | null>(null);
  const shelterLayerRef = useRef<L.LayerGroup | null>(null);
  const vehicleLayerRef = useRef<L.LayerGroup | null>(null);
  const residentLayerRef = useRef<L.LayerGroup | null>(null);
  const stopsLayerRef = useRef<L.LayerGroup | null>(null);
  const routesLayerRef = useRef<L.LayerGroup | null>(null);
  const medicalLayerRef = useRef<L.LayerGroup | null>(null);
  const hubsLayerRef = useRef<L.LayerGroup | null>(null);

  // Markers map for smooth live repositioning
  const vehicleMarkersRef = useRef<Map<string, L.Marker>>(new Map());

  // Toggles
  const [showShelters, setShowShelters] = useState(true);
  const [showVehicles, setShowVehicles] = useState(true);
  const [showStops, setShowStops] = useState(true);
  const [selectedEntity, setSelectedEntity] = useState<any>(null);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    // Center of Daraga, Albay [lat, lon]
    const map = L.map(mapContainerRef.current, {
      center: [13.146, 123.705],
      zoom: 14,
      minZoom: 11,
      maxZoom: 18,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors &bull; Daraga Road Graph',
      className: highContrast ? 'dark-tile-layer' : '',
    }).addTo(map);

    shelterLayerRef.current = L.layerGroup().addTo(map);
    vehicleLayerRef.current = L.layerGroup().addTo(map);
    residentLayerRef.current = L.layerGroup().addTo(map);
    stopsLayerRef.current = L.layerGroup().addTo(map);
    routesLayerRef.current = L.layerGroup().addTo(map);
    medicalLayerRef.current = L.layerGroup().addTo(map);
    hubsLayerRef.current = L.layerGroup().addTo(map);

    // Map click: ONLY reports coordinate if a callback was provided. DOES NOT switch views/tabs!
    map.on('click', (e: L.LeafletMouseEvent) => {
      const { lat, lng } = e.latlng;
      if (onMapClickLocation) {
        onMapClickLocation({ lon: lng, lat });
      }
    });

    fetch('/api/clipping-boundary')
      .then(res => res.json())
      .then(geoJsonData => {
        if (boundaryLayerRef.current) map.removeLayer(boundaryLayerRef.current);
        boundaryLayerRef.current = L.geoJSON(geoJsonData, {
          style: {
            color: '#f59e0b',
            weight: 2,
            dashArray: '5, 5',
            fillColor: '#f59e0b',
            fillOpacity: 0.03,
          },
        }).addTo(map);
      })
      .catch(() => {});

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

      // Privacy: In user view, don't show manager internals, just clean public shelter stop info
      const shelterLabel = isUserView
        ? `<strong style="font-size:11px;">Safe Evacuation Center: ${s.name}</strong><br><span style="font-size:10px; color:${isFull ? '#ef4444' : '#10b981'}; font-weight:bold;">${isFull ? '🔴 AT CAPACITY (Rerouting)' : '🟢 OPEN (Accessible Ramps)'}</span>`
        : `<strong style="font-size:11px;">${s.name}</strong><br><span style="font-size:10px; color:${isFull ? '#ef4444' : '#10b981'}">${isFull ? 'FULL' : 'OPEN'} (${s.occupancy}/${s.capacity})</span>`;

      marker.bindTooltip(shelterLabel, { direction: 'top', offset: [0, -8], opacity: 0.95 });
      marker.on('click', () => setSelectedEntity({ type: 'shelter', data: s }));
      marker.addTo(layer);
    });
  }, [shelters, showShelters, isUserView]);

  // Update Stops & Residents Layer (ANONYMIZED FOR USER VIEW / LIVE DEMO)
  useEffect(() => {
    const resLayer = residentLayerRef.current;
    const stopsLayer = stopsLayerRef.current;
    if (!resLayer || !stopsLayer) return;

    resLayer.clearLayers();
    stopsLayer.clearLayers();

    if (!showStops) return;

    residents.forEach((r, idx) => {
      const isDelivered = r.status === 'delivered';
      const isPickedUp = r.status === 'picked_up';
      const isAssigned = r.status === 'assigned';

      const color = isDelivered
        ? '#10b981'
        : isPickedUp
        ? '#6366f1'
        : isAssigned
        ? '#3b82f6'
        : '#f59e0b';

      if (isUserView) {
        // USER VIEW PRIVACY: ONLY show route stops and stop numbers, NO personal rider details or names!
        const stopNumber = idx + 1;
        const stopIcon = L.divIcon({
          className: 'route-stop-icon',
          html: `
            <div style="display:flex; flex-direction:column; align-items:center; transform: translate(-50%, -50%);">
              <div style="
                background: ${isDelivered ? '#10b981' : '#2563eb'};
                color: #ffffff;
                padding: 3px 8px;
                border-radius: 9999px;
                font-weight: 900;
                font-size: 10px;
                white-space: nowrap;
                border: 2px solid #ffffff;
                box-shadow: 0 4px 10px rgba(0,0,0,0.5);
                display: flex;
                align-items: center;
                gap: 4px;
              ">
                <span>📍 Stop ${stopNumber}: ${r.barangay}</span>
                <span style="font-size:8px; opacity:0.85;">(${isDelivered ? 'COMPLETED' : isPickedUp ? 'IN TRANSIT' : 'SCHEDULED'})</span>
              </div>
            </div>
          `,
          iconSize: [0, 0],
        });

        const stopMarker = L.marker([r.lat, r.lon], { icon: stopIcon });
        stopMarker.bindTooltip(
          `<strong style="font-size:11px;">Stop ${stopNumber}: Designated Pickup Point</strong><br><span style="font-size:10px; color:${color}; font-weight:bold;">${r.barangay} &bull; ${isDelivered ? 'Pick Up Complete' : 'Awaiting Vehicle'}</span>`,
          { direction: 'bottom', offset: [0, 8], opacity: 0.95 }
        );
        stopMarker.addTo(stopsLayer);
      } else {
        // CREATOR / EOC VIEW: Show full manifest detail for dispatchers
        const marker = L.circleMarker([r.lat, r.lon], {
          radius: 9,
          fillColor: color,
          color: '#ffffff',
          weight: 2.5,
          opacity: 1,
          fillOpacity: 0.95,
        });

        marker.bindTooltip(
          `<strong style="font-size:11px;">${r.name}</strong><br><span style="font-size:10px; color:${color}; font-weight:bold;">${r.status.toUpperCase()} &bull; Need: ${r.need}</span>`,
          { direction: 'bottom', offset: [0, 8], permanent: true, opacity: 0.9 }
        );

        marker.on('click', () => setSelectedEntity({ type: 'resident', data: r }));
        marker.addTo(resLayer);
      }
    });
  }, [residents, showStops, isUserView]);

  // Update Vehicles, Route Polylines, Stops, and Live Moving Bus
  useEffect(() => {
    const vLayer = vehicleLayerRef.current;
    const rLayer = routesLayerRef.current;
    if (!vLayer || !rLayer) return;

    vLayer.clearLayers();
    rLayer.clearLayers();
    vehicleMarkersRef.current.clear();

    if (!showVehicles) return;

    vehicles.forEach(v => {
      // Determine position (use animated coords if this vehicle is currently simulating live motion)
      let [lon, lat] = v.currentCoords;
      if (animatedVehicleId === v.id && animatedCoords) {
        [lon, lat] = animatedCoords;
      }

      const isFull = v.status === 'full';
      const isStopped = isVehicleStopped && (animatedVehicleId === v.id || v.id === 'VAN-02' || v.id === 'BUS-01');
      const color = isFull ? '#ef4444' : isStopped ? '#f97316' : v.id === 'VAN-02' ? '#10b981' : '#f59e0b';

      // Custom DivIcon with Permanent Label & VEHICLE STOPPED Indicator
      const busIcon = L.divIcon({
        className: 'live-bus-marker',
        html: `
          <div style="display:flex; flex-direction:column; align-items:center; transform: translate(-50%, -50%);">
            ${
              isStopped
                ? `
                <div style="
                  background: #ef4444;
                  color: #fff;
                  padding: 3px 8px;
                  border-radius: 6px;
                  font-weight: 900;
                  font-size: 10px;
                  margin-bottom: 2px;
                  border: 2px solid #fff;
                  box-shadow: 0 0 14px #ef4444;
                  animation: pulse 1.2s infinite;
                  display: flex;
                  align-items: center;
                  gap: 3px;
                ">
                  <span>🛑 NAKATIGIL / STOPPED</span>
                </div>
              `
                : ''
            }
            <div style="
              background: ${color};
              color: #000;
              padding: 4px 8px;
              border-radius: 8px;
              font-weight: 900;
              font-size: 11px;
              white-space: nowrap;
              border: 2px solid #fff;
              box-shadow: 0 4px 12px rgba(0,0,0,0.6);
              display: flex;
              align-items: center;
              gap: 4px;
            ">
              <span>🚌 ${v.id}</span>
              <span style="font-size:9px; background:rgba(0,0,0,0.2); padding:1px 4px; border-radius:4px;">
                ${isStopped ? 'BOARDING' : isFull ? 'FULL' : v.status === 'en_route' ? 'LIVE' : 'OK'}
              </span>
            </div>
            <div style="
              width: 0;
              height: 0;
              border-left: 6px solid transparent;
              border-right: 6px solid transparent;
              border-top: 6px solid ${color};
            "></div>
          </div>
        `,
        iconSize: [0, 0],
      });

      const marker = L.marker([lat, lon], { icon: busIcon, zIndexOffset: 1000 });
      marker.on('click', () => setSelectedEntity({ type: 'vehicle', data: v }));
      marker.addTo(vLayer);
      vehicleMarkersRef.current.set(v.id, marker);

      // Render actual visible route line on map (Shortest Path from Dijkstra over 28,465 Daraga nodes)
      if (v.routePolyline && v.routePolyline.length > 1) {
        const polylineCoords: [number, number][] = v.routePolyline.map(([pLon, pLat]) => [pLat, pLon]);

        // Background glow line
        L.polyline(polylineCoords, {
          color: '#ffffff',
          weight: 6,
          opacity: 0.35,
        }).addTo(rLayer);

        // Core colored route line
        const polyline = L.polyline(polylineCoords, {
          color,
          weight: 4,
          opacity: 0.95,
          dashArray: isFull ? '6, 6' : undefined,
        });

        polyline.bindTooltip(
          `<strong>Active Route: ${v.name}</strong><br><span style="font-size:10px;">Dijkstra Shortest Path &bull; Daraga Road Graph</span>`,
          { sticky: true }
        );
        polyline.addTo(rLayer);
      }
    });
  }, [vehicles, showVehicles, animatedVehicleId, animatedCoords, isVehicleStopped]);

  // Live Position Animation Effect (moves marker smoothly between frames)
  useEffect(() => {
    if (!animatedVehicleId || !animatedCoords) return;
    const marker = vehicleMarkersRef.current.get(animatedVehicleId);
    if (marker) {
      marker.setLatLng([animatedCoords[1], animatedCoords[0]]);
    }
  }, [animatedVehicleId, animatedCoords]);

  return (
    <div className="relative w-full h-[620px] rounded-3xl overflow-hidden border-2 border-slate-700 shadow-2xl bg-slate-900">
      <div ref={mapContainerRef} className="w-full h-full z-0" />

      {/* Floating Alert Badge when Vehicle is Physically Stopped */}
      {isVehicleStopped && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 bg-red-600 text-white px-5 py-2.5 rounded-2xl shadow-2xl border-2 border-white flex items-center gap-2.5 animate-bounce">
          <AlertOctagon className="w-5 h-5 text-white animate-spin" />
          <div className="text-xs sm:text-sm font-black tracking-wide">
            {vehicleStopLabel || '🛑 VEHICLE STOPPED — Lowering Wheelchair Ramp & Boarding Passenger'}
          </div>
        </div>
      )}

      {/* Layer Toggles Floating Bar */}
      <div className="absolute top-4 left-4 z-10 flex flex-wrap items-center gap-2 bg-slate-900/90 backdrop-blur-md border border-slate-700 px-3 py-2 rounded-2xl shadow-xl">
        <div className="flex items-center gap-1.5 text-xs font-black uppercase text-amber-400 mr-1">
          <Layers className="w-4 h-4" />
          <span>Map View</span>
        </div>

        <button
          onClick={() => setShowVehicles(!showVehicles)}
          className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            showVehicles ? 'bg-amber-500 text-slate-950 font-black shadow-md' : 'bg-slate-800 text-slate-400'
          }`}
        >
          🚌 Buses &amp; Route Lines
        </button>

        <button
          onClick={() => setShowStops(!showStops)}
          className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            showStops ? 'bg-blue-600 text-white font-bold shadow-md' : 'bg-slate-800 text-slate-400'
          }`}
        >
          📍 Route Stops ({residents.length})
        </button>

        <button
          onClick={() => setShowShelters(!showShelters)}
          className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            showShelters ? 'bg-emerald-600 text-white font-bold shadow-md' : 'bg-slate-800 text-slate-400'
          }`}
        >
          🏠 Shelters ({shelters.length})
        </button>
      </div>

      {/* Legend & Help Card */}
      <div className="absolute bottom-4 left-4 z-10 bg-slate-950/95 backdrop-blur-md border border-slate-800 p-3.5 rounded-2xl shadow-2xl text-xs space-y-2 max-w-sm">
        <div className="flex justify-between items-center text-slate-300 font-extrabold border-b border-slate-800 pb-1.5">
          <span>A.R.K &bull; Daraga Road Network Tracker</span>
          <span className="text-[10px] text-amber-400 font-mono">Dijkstra Routing</span>
        </div>

        <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-300 font-semibold">
          <div className="flex items-center gap-2">
            <span className="w-3.5 h-3.5 rounded-full bg-emerald-500 ring-2 ring-white shrink-0" />
            <span>Open Evac Shelter</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3.5 h-3.5 rounded-full bg-red-500 ring-2 ring-white shrink-0" />
            <span>Shelter at Capacity</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-4 h-1.5 rounded bg-amber-400 shrink-0" />
            <span>Bus Active Route Line</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3.5 h-3.5 rounded-full bg-blue-500 ring-2 ring-white shrink-0" />
            <span>Designated Stop (Pickup)</span>
          </div>
        </div>

        <div className="text-[10px] text-slate-400 pt-1 border-t border-slate-800 flex items-center justify-between">
          <span className="text-amber-300 font-bold">Privacy Mode: ON</span>
          <span>Individual rider details hidden</span>
        </div>
      </div>
    </div>
  );
};

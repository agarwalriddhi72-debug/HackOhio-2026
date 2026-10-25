import React, { useState } from 'react';
import { Resident, Vehicle, Shelter, WeatherState } from '../types';
import { Users, Truck, Home, AlertTriangle, ShieldCheck, Search, Filter, RefreshCw, Sliders, MapPin, CheckCircle2, AlertOctagon, Accessibility } from 'lucide-react';

interface Props {
  residents: Resident[];
  vehicles: Vehicle[];
  shelters: Shelter[];
  weather: WeatherState;
  onMarkBusFull: (vehicleId: string) => Promise<void>;
  onToggleShelterFull: (shelterId: number) => Promise<void>;
  onToggleWheelchair: (shelterId: number) => Promise<void>;
  onBlockRoad: (edgeId: number, blocked: boolean, floodPenalty?: number) => Promise<void>;
  onRefreshData: () => Promise<void>;
  highContrast: boolean;
}

export const CreatorDashboard: React.FC<Props> = ({
  residents,
  vehicles,
  shelters,
  weather,
  onMarkBusFull,
  onToggleShelterFull,
  onToggleWheelchair,
  onBlockRoad,
  onRefreshData,
  highContrast,
}) => {
  const [activeSection, setActiveSection] = useState<'riders' | 'fleet' | 'shelters' | 'hazards'>('riders');
  const [shelterSearch, setShelterSearch] = useState('');
  const [shelterFilterTier, setShelterFilterTier] = useState<string>('all');
  const [selectedEdgeId, setSelectedEdgeId] = useState<number>(450);
  const [floodPenalty, setFloodPenalty] = useState<number>(3.5);

  const totalOccupancy = shelters.reduce((acc, s) => acc + s.occupancy, 0);
  const totalCapacity = shelters.reduce((acc, s) => acc + s.capacity, 0);
  const fullSheltersCount = shelters.filter(s => s.isFull).length;
  const wheelchairSheltersCount = shelters.filter(s => s.wheelchairAccessible && !s.isFull).length;

  const filteredShelters = shelters.filter(s => {
    if (shelterSearch.trim()) {
      const q = shelterSearch.toLowerCase();
      if (!s.name.toLowerCase().includes(q) && !s.category.toLowerCase().includes(q)) return false;
    }
    if (shelterFilterTier !== 'all') {
      if (s.candidateTier.toString() !== shelterFilterTier) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Creator / EOC Command Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-800 pb-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-white">
              Emergency Operations Center (EOC) Dispatch Console
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 mt-1">
              Global system management: View all riders across Daraga, inspect and control the entire vehicle fleet, manage all 162 shelters, and configure road hazard blockages.
            </p>
          </div>

          <button
            onClick={onRefreshData}
            className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 border border-slate-600 flex items-center gap-2 transition-colors cursor-pointer shrink-0"
          >
            <RefreshCw className="w-4 h-4 text-amber-400" />
            Refresh Global State
          </button>
        </div>

        {/* Global Key Metrics Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800">
            <span className="text-slate-400 font-bold uppercase text-[10px] block">Total Riders in Queue</span>
            <span className="text-2xl font-black text-white font-mono mt-0.5 block">{residents.length}</span>
            <span className="text-[11px] text-amber-400 font-semibold">
              {residents.filter(r => r.status === 'waiting').length} Waiting &bull; {residents.filter(r => r.status === 'assigned').length} Assigned
            </span>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800">
            <span className="text-slate-400 font-bold uppercase text-[10px] block">Fleet in Service</span>
            <span className="text-2xl font-black text-white font-mono mt-0.5 block">{vehicles.length} Units</span>
            <span className="text-[11px] text-emerald-400 font-semibold">
              {vehicles.filter(v => v.status !== 'offline').length} Active &bull; {vehicles.filter(v => v.status === 'full').length} Marked Full
            </span>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800">
            <span className="text-slate-400 font-bold uppercase text-[10px] block">Municipal Evacuation Space</span>
            <span className="text-2xl font-black text-white font-mono mt-0.5 block">
              {totalOccupancy} <span className="text-xs text-slate-400">/ {totalCapacity}</span>
            </span>
            <span className="text-[11px] text-blue-400 font-semibold">
              {fullSheltersCount} Full &bull; {wheelchairSheltersCount} Wheelchair Open
            </span>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800">
            <span className="text-slate-400 font-bold uppercase text-[10px] block">Hazard Early Warning</span>
            <span className="text-xl font-black text-amber-400 font-mono mt-0.5 block truncate">
              {weather.primaryDisaster || 'SAFE / CLEAR'}
            </span>
            <span className="text-[11px] text-slate-300 font-semibold">
              {weather.simulatedDateTime} &bull; {weather.status}
            </span>
          </div>
        </div>

        {/* Section Navigation Tabs */}
        <div className="flex items-center gap-2 pt-2 border-t border-slate-800 overflow-x-auto">
          {[
            { id: 'riders', label: `All Riders (${residents.length})`, icon: <Users className="w-4 h-4" /> },
            { id: 'fleet', label: `Fleet Dispatch (${vehicles.length} Vehicles)`, icon: <Truck className="w-4 h-4" /> },
            { id: 'shelters', label: `All 162 Shelters Directory`, icon: <Home className="w-4 h-4" /> },
            { id: 'hazards', label: `Road Hazards & Bridges`, icon: <AlertTriangle className="w-4 h-4" /> },
          ].map(sec => (
            <button
              key={sec.id}
              onClick={() => setActiveSection(sec.id as any)}
              className={`px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-2 transition-all shrink-0 cursor-pointer ${
                activeSection === sec.id
                  ? 'bg-amber-500 text-slate-950 shadow-md font-extrabold ring-2 ring-amber-400'
                  : 'bg-slate-950 text-slate-300 hover:text-white border border-slate-800'
              }`}
            >
              {sec.icon}
              <span>{sec.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* SECTION 1: ALL RIDERS MANAGEMENT TABLE */}
      {activeSection === 'riders' && (
        <div className="bg-slate-900 border-2 border-slate-700 rounded-3xl p-5 sm:p-7 shadow-xl space-y-4">
          <div className="flex justify-between items-center border-b border-slate-800 pb-3">
            <div>
              <h3 className="text-lg font-black text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-amber-400" />
                Daraga Municipal Resident Evacuation Manifest
              </h3>
              <p className="text-xs text-slate-400">
                Sorted by priority score (calculated from special needs severity, elderly age factor, and waiting duration).
              </p>
            </div>
            <span className="text-xs font-mono text-amber-400 font-bold">
              {residents.length} Active Records
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 uppercase font-black text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="py-3 px-3">Priority</th>
                  <th className="py-3 px-3">Rider Name</th>
                  <th className="py-3 px-3">Age</th>
                  <th className="py-3 px-3">Special Need</th>
                  <th className="py-3 px-3">Barangay</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3">Assigned Vehicle</th>
                  <th className="py-3 px-3">Shelter</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {residents.map(r => {
                  const assignedV = vehicles.find(v => v.id === r.assignedVehicleId);
                  const assignedS = shelters.find(s => s.id === r.assignedShelterId);
                  return (
                    <tr key={r.id} className="hover:bg-slate-800/50 transition-colors">
                      <td className="py-3 px-3">
                        <span className="font-mono font-black text-amber-400 text-sm px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/30">
                          {r.priorityScore}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-bold text-white text-sm">
                        {r.name}
                        {r.phone && <div className="text-[10px] text-slate-400 font-normal">{r.phone}</div>}
                      </td>
                      <td className="py-3 px-3 font-semibold text-slate-200">{r.age}yo</td>
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded font-bold uppercase text-[10px] bg-slate-800 text-slate-300 border border-slate-700">
                          {r.need.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-slate-300 font-medium">{r.barangay}</td>
                      <td className="py-3 px-3">
                        <span
                          className={`px-2 py-0.5 rounded-full font-black uppercase text-[10px] ${
                            r.status === 'delivered'
                              ? 'bg-emerald-500/20 text-emerald-300'
                              : r.status === 'picked_up'
                              ? 'bg-indigo-500/20 text-indigo-300'
                              : r.status === 'assigned'
                              ? 'bg-blue-500/20 text-blue-300'
                              : 'bg-amber-500/20 text-amber-300 animate-pulse'
                          }`}
                        >
                          {r.status}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-semibold text-slate-200">
                        {assignedV ? assignedV.name : <span className="text-slate-500 italic">None</span>}
                      </td>
                      <td className="py-3 px-3 text-slate-300">
                        {assignedS ? assignedS.name : <span className="text-slate-500 italic">None</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SECTION 2: FLEET DISPATCHER OVERVIEW */}
      {activeSection === 'fleet' && (
        <div className="bg-slate-900 border-2 border-slate-700 rounded-3xl p-5 sm:p-7 shadow-xl space-y-4">
          <div className="flex justify-between items-center border-b border-slate-800 pb-3">
            <div>
              <h3 className="text-lg font-black text-white flex items-center gap-2">
                <Truck className="w-5 h-5 text-amber-400" />
                Municipal Emergency Vehicle Fleet
              </h3>
              <p className="text-xs text-slate-400">
                Inspect capacity, driver assignments, and Dijkstra routes for all units in Daraga.
              </p>
            </div>
            <span className="text-xs font-mono text-amber-400 font-bold">{vehicles.length} Units</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {vehicles.map(v => (
              <div key={v.id} className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] font-bold uppercase text-amber-400 block">{v.type}</span>
                    <h4 className="text-lg font-black text-white">{v.name}</h4>
                    <p className="text-xs text-slate-400">Driver: <strong className="text-slate-200">{v.driverName}</strong></p>
                  </div>

                  <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                    v.status === 'full' ? 'bg-red-600 text-white' : 'bg-emerald-600/30 text-emerald-300'
                  }`}>
                    {v.status}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs bg-slate-900 p-3 rounded-xl border border-slate-800">
                  <div>
                    <span className="text-slate-400 block">General Seats Free:</span>
                    <span className="text-base font-black text-amber-400 font-mono">{v.seatsFree} / {v.seatsTotal}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Wheelchair Spaces:</span>
                    <span className="text-base font-black text-emerald-400 font-mono">{v.wheelchairFree} / {v.wheelchairSpaces}</span>
                  </div>
                </div>

                <div className="text-xs text-slate-400">
                  <span>Assigned Route Stops: <strong className="text-white">{v.routeStops.length} stops</strong></span>
                  <div className="flex justify-between items-center mt-2">
                    <button
                      onClick={() => onMarkBusFull(v.id)}
                      disabled={v.status === 'full'}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold ${
                        v.status === 'full' ? 'bg-slate-800 text-slate-500' : 'bg-red-600 hover:bg-red-500 text-white'
                      }`}
                    >
                      {v.status === 'full' ? 'Bus Full' : 'Trigger Bus Full'}
                    </button>
                    <span className="text-[11px] text-slate-500 font-mono">ID: {v.id}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SECTION 3: ALL 162 SHELTERS DIRECTORY */}
      {activeSection === 'shelters' && (
        <div className="bg-slate-900 border-2 border-slate-700 rounded-3xl p-5 sm:p-7 shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-800 pb-3">
            <div>
              <h3 className="text-lg font-black text-white flex items-center gap-2">
                <Home className="w-5 h-5 text-amber-400" />
                Comprehensive Shelter Registry (162 Facilities)
              </h3>
              <p className="text-xs text-slate-400">
                All schools, covered courts, townhalls, and places of worship in Daraga with intake control.
              </p>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <input
                type="text"
                value={shelterSearch}
                onChange={e => setShelterSearch(e.target.value)}
                placeholder="Search shelters..."
                className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white placeholder:text-slate-500"
              />
              <select
                value={shelterFilterTier}
                onChange={e => setShelterFilterTier(e.target.value)}
                className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white"
              >
                <option value="all">All Tiers</option>
                <option value="1">Tier 1 (Official)</option>
                <option value="2">Tier 2 (Secondary)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[500px] overflow-y-auto">
            {filteredShelters.map(s => (
              <div key={s.id} className="p-4 rounded-2xl bg-slate-950 border border-slate-800 text-xs space-y-2.5">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] font-bold uppercase text-amber-400">{s.category} &bull; Tier {s.candidateTier}</span>
                    <h5 className="font-extrabold text-sm text-white">{s.name}</h5>
                  </div>
                  <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${s.isFull ? 'bg-red-600 text-white' : 'bg-emerald-600/30 text-emerald-300'}`}>
                    {s.isFull ? 'FULL' : 'OPEN'}
                  </span>
                </div>

                <div className="flex justify-between text-slate-400 font-semibold">
                  <span>Occupancy:</span>
                  <span className="text-white font-mono">{s.occupancy} / {s.capacity}</span>
                </div>

                <div className="flex gap-2 pt-1 border-t border-slate-800">
                  <button
                    onClick={() => onToggleShelterFull(s.id)}
                    className={`flex-1 py-1.5 rounded-lg font-bold text-xs ${
                      s.isFull ? 'bg-emerald-600 hover:bg-emerald-500 text-white' : 'bg-red-600/80 hover:bg-red-600 text-white'
                    }`}
                  >
                    {s.isFull ? 'Re-Open' : 'Mark Full'}
                  </button>
                  <button
                    onClick={() => onToggleWheelchair(s.id)}
                    className={`px-3 py-1.5 rounded-lg font-bold text-xs ${
                      s.wheelchairAccessible ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    <Accessibility className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SECTION 4: ROAD HAZARDS & BRIDGES */}
      {activeSection === 'hazards' && (
        <div className="bg-slate-900 border-2 border-slate-700 rounded-3xl p-5 sm:p-7 shadow-xl space-y-4">
          <div className="border-b border-slate-800 pb-3">
            <h3 className="text-lg font-black text-white flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-400" />
              Road Inundation &amp; Bridge Crossing Hazard Controls
            </h3>
            <p className="text-xs text-slate-400">
              Apply flood travel time penalties or block impassable river bridges (e.g. Yawa river crossings). Active Dijkstra routes immediately recalculate around blocked segments.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
              <h4 className="font-bold text-white text-sm">Simulate Bridge Closure (Yawa River Corridor)</h4>
              <p className="text-xs text-slate-400">
                Mark Edge #100 or bridge segments as impassable due to torrential flash flood or volcanic lahar flow.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => onBlockRoad(100, true, 3.5)}
                  className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs"
                >
                  Block Road #100 (Flood Inundation)
                </button>
                <button
                  onClick={() => onBlockRoad(100, false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs"
                >
                  Clear Blockage
                </button>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
              <h4 className="font-bold text-white text-sm">Flood Travel Penalty Multiplier</h4>
              <p className="text-xs text-slate-400">
                Shallow water wading slows vehicle transit by a multiplier (e.g. 3.0x).
              </p>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min="1.0"
                  max="6.0"
                  step="0.5"
                  value={floodPenalty}
                  onChange={e => setFloodPenalty(Number(e.target.value))}
                  className="w-full accent-amber-500"
                />
                <span className="font-mono text-amber-400 font-bold text-sm">{floodPenalty}x</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

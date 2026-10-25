import React, { useState } from 'react';
import { Shelter, Vehicle } from '../types';
import { Home, Accessibility, Users, AlertOctagon, CheckCircle2, ShieldCheck, MapPin, Search } from 'lucide-react';

interface Props {
  shelters: Shelter[];
  vehicles: Vehicle[];
  onToggleShelterFull: (shelterId: number) => Promise<void>;
  onToggleWheelchair: (shelterId: number) => Promise<void>;
  highContrast: boolean;
}

export const ShelterInterface: React.FC<Props> = ({
  shelters,
  vehicles,
  onToggleShelterFull,
  onToggleWheelchair,
  highContrast,
}) => {
  // During demo walkthrough: default to managing ONE specific designated shelter (Burgos Covered Court)
  const [viewMode, setViewMode] = useState<'single' | 'all'>('single');
  const [search, setSearch] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // My designated shelter (Shelter #1: Burgos Covered Court)
  const myShelter = shelters.find(s => s.id === 1) || shelters[0];

  const handleToggleFull = async (id: number) => {
    setActionLoading(true);
    try {
      await onToggleShelterFull(id);
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleWheelchair = async (id: number) => {
    setActionLoading(true);
    try {
      await onToggleWheelchair(id);
    } finally {
      setActionLoading(false);
    }
  };

  if (!myShelter) {
    return <div className="text-center p-8 text-slate-400">Loading shelter station...</div>;
  }

  const occupancyPct = Math.min(100, Math.round((myShelter.occupancy / myShelter.capacity) * 100));
  const incomingVehicles = vehicles.filter(v => v.destinationShelterId === myShelter.id);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* View Switcher: Single Shelter (Default) vs Creator/Admin Overview */}
      <div className="flex justify-between items-center bg-slate-900 border border-slate-800 p-3 rounded-2xl">
        <span className="text-xs text-slate-400 font-semibold px-2">
          Mode: <strong className="text-white">{viewMode === 'single' ? 'Shelter Manager Console (Single Station)' : 'Municipality Overview (All 162 Shelters)'}</strong>
        </span>
        <button
          onClick={() => setViewMode(viewMode === 'single' ? 'all' : 'single')}
          className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-amber-400 border border-slate-700 transition-colors cursor-pointer"
        >
          {viewMode === 'single' ? 'Switch to All Shelters (Admin View)' : 'Switch to My Shelter Only'}
        </button>
      </div>

      {viewMode === 'single' ? (
        /* Single Shelter Manager Console for Burgos Covered Court */
        <div className="space-y-6">
          {/* Main Shelter Card */}
          <div className="bg-slate-900 border-2 border-slate-700 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-800 pb-5">
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 border border-emerald-400/40 text-emerald-400 flex items-center justify-center shrink-0">
                  <Home className="w-8 h-8" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-2xl sm:text-3xl font-black text-white">
                      {myShelter.name}
                    </h2>
                    <span
                      className={`text-xs font-black uppercase px-2.5 py-0.5 rounded-full ${
                        myShelter.isFull
                          ? 'bg-red-600 text-white animate-pulse'
                          : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      }`}
                    >
                      {myShelter.isFull ? 'SHELTER FULL' : 'OPEN & ACCEPTING'}
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
                    Tier 1 Official Evacuation Center &bull; Station ID: #{myShelter.id} &bull; Daraga Central
                  </p>
                </div>
              </div>

              {/* Status Badge */}
              <div className="text-right">
                <span className="text-[10px] font-bold uppercase text-slate-400 block">Current Capacity</span>
                <span className="text-2xl font-black text-white font-mono">
                  {myShelter.occupancy} <span className="text-sm text-slate-400">/ {myShelter.capacity}</span>
                </span>
              </div>
            </div>

            {/* Occupancy Progress Bar */}
            <div className="space-y-2 bg-slate-950 p-4 rounded-2xl border border-slate-800">
              <div className="flex justify-between text-xs font-bold">
                <span className="text-slate-300 flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-blue-400" /> Space Utilization:
                </span>
                <span className="text-amber-400 font-mono text-sm">{occupancyPct}% Filled</span>
              </div>
              <div className="w-full bg-slate-800 h-3.5 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    myShelter.isFull ? 'bg-red-500' : occupancyPct > 80 ? 'bg-amber-500' : 'bg-emerald-500'
                  }`}
                  style={{ width: `${occupancyPct}%` }}
                />
              </div>
            </div>

            {/* CRITICAL FEATURE: "SHELTER FULL" BUTTON */}
            <div className="p-5 rounded-2xl bg-slate-950 border-2 border-slate-800 space-y-3">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div>
                  <h4 className="text-base font-bold text-white flex items-center gap-2">
                    <AlertOctagon className="w-5 h-5 text-red-400" />
                    Shelter Full Intake Control
                  </h4>
                  <p className="text-xs text-slate-400">
                    When marked full, this shelter is immediately removed from available drop-offs. Active drivers are automatically rerouted to the nearest alternate shelter with capacity.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => handleToggleFull(myShelter.id)}
                  disabled={actionLoading}
                  className={`w-full sm:w-auto px-6 py-4 rounded-2xl font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xl ${
                    myShelter.isFull
                      ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                      : highContrast
                      ? 'bg-red-600 hover:bg-red-500 text-white ring-4 ring-red-500'
                      : 'bg-red-600 hover:bg-red-500 text-white shadow-red-600/30 active:scale-95'
                  }`}
                >
                  <AlertOctagon className="w-5 h-5" />
                  <span>{myShelter.isFull ? 'RE-OPEN SHELTER' : 'MARK SHELTER FULL'}</span>
                </button>
              </div>
            </div>

            {/* Wheelchair Restriction Toggle */}
            <div className="p-5 rounded-2xl bg-slate-950 border-2 border-slate-800 space-y-3">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div>
                  <h4 className="text-base font-bold text-white flex items-center gap-2">
                    <Accessibility className="w-5 h-5 text-amber-400" />
                    Wheelchair &amp; Accessibility Restriction
                  </h4>
                  <p className="text-xs text-slate-400">
                    Toggle if access ramps become flooded, damaged, or fully occupied.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => handleToggleWheelchair(myShelter.id)}
                  disabled={actionLoading}
                  className={`w-full sm:w-auto px-5 py-3 rounded-2xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                    myShelter.wheelchairAccessible
                      ? 'bg-slate-800 text-red-300 border border-red-500/50 hover:bg-red-950/40'
                      : 'bg-emerald-600 text-white hover:bg-emerald-500'
                  }`}
                >
                  <Accessibility className="w-4 h-4" />
                  <span>{myShelter.wheelchairAccessible ? 'Set: Cannot Accommodate Wheelchairs' : 'Enable Wheelchair Accommodation'}</span>
                </button>
              </div>
            </div>

            {/* Incoming Vehicle Convoys */}
            <div className="border-t border-slate-800 pt-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                Approaching Evacuation Convoys ({incomingVehicles.length})
              </h4>
              {incomingVehicles.length === 0 ? (
                <p className="text-xs text-slate-500 italic">No vehicles currently designated to this drop-off point.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {incomingVehicles.map(v => (
                    <div key={v.id} className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs flex justify-between items-center">
                      <div>
                        <span className="font-bold text-white block">{v.name}</span>
                        <span className="text-[11px] text-slate-400">Driver: {v.driverName}</span>
                      </div>
                      <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/40">
                        {v.routeStops.length} STOPS
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* Admin All Shelters Overview */
        <div className="space-y-4">
          <div className="bg-slate-900 border border-slate-800 p-3 rounded-xl">
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search all 162 Daraga shelters..."
              className="w-full px-4 py-2 rounded-lg bg-slate-950 border border-slate-700 text-sm text-white"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[600px] overflow-y-auto">
            {shelters
              .filter(s => s.name.toLowerCase().includes(search.toLowerCase()))
              .map(s => (
                <div key={s.id} className="p-4 rounded-2xl bg-slate-900 border border-slate-800 text-xs space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-white text-sm">{s.name}</span>
                    <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${s.isFull ? 'bg-red-600 text-white' : 'bg-emerald-600/30 text-emerald-300'}`}>
                      {s.isFull ? 'FULL' : 'OPEN'}
                    </span>
                  </div>
                  <div className="text-slate-400">Occupancy: {s.occupancy} / {s.capacity}</div>
                  <button
                    onClick={() => handleToggleFull(s.id)}
                    className="w-full py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-bold"
                  >
                    {s.isFull ? 'Re-open' : 'Mark Full'}
                  </button>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
};

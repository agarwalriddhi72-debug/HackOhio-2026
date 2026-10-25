import React, { useState } from 'react';
import { Shelter, Vehicle } from '../types';
import { Home, Accessibility, Users, Search, AlertOctagon, CheckCircle2, ShieldCheck, MapPin, Filter } from 'lucide-react';

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
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterAccessibleOnly, setFilterAccessibleOnly] = useState<boolean>(false);
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);

  // Filter shelters
  const filteredShelters = shelters.filter(s => {
    if (search.trim()) {
      const q = search.toLowerCase();
      if (!s.name.toLowerCase().includes(q) && !s.category.toLowerCase().includes(q)) return false;
    }
    if (filterCategory !== 'all' && s.category !== filterCategory) return false;
    if (filterAccessibleOnly && !s.wheelchairAccessible) return false;
    return true;
  });

  const handleToggleFull = async (id: number) => {
    setActionLoadingId(id);
    try {
      await onToggleShelterFull(id);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleToggleWheelchair = async (id: number) => {
    setActionLoadingId(id);
    try {
      await onToggleWheelchair(id);
    } finally {
      setActionLoadingId(null);
    }
  };

  // Summary stats
  const totalCapacity = shelters.reduce((acc, s) => acc + s.capacity, 0);
  const totalOccupancy = shelters.reduce((acc, s) => acc + s.occupancy, 0);
  const fullSheltersCount = shelters.filter(s => s.isFull).length;
  const wheelchairSheltersCount = shelters.filter(s => s.wheelchairAccessible && !s.isFull).length;

  return (
    <div className="space-y-6 max-w-6xl mx-auto p-4 sm:p-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-800/80 border border-slate-700 p-4 sm:p-5 rounded-2xl">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl sm:text-2xl font-black text-amber-400 tracking-tight">
              ROUTEY &bull; Evacuation Center &amp; Shelter Hub
            </h2>
            <span className="text-xs font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              {shelters.length} Shelters Loaded
            </span>
          </div>
          <p className="text-sm text-slate-300 mt-1">
            Real-time occupancy management. Marking a shelter full immediately re-routes active drivers to the nearest open facility.
          </p>
        </div>

        {/* Global Capacity Metric */}
        <div className="flex items-center gap-3 bg-slate-900 border border-slate-700 px-4 py-2.5 rounded-xl">
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Mun. Occupancy</span>
            <span className="text-lg font-black text-white font-mono">
              {totalOccupancy} <span className="text-xs text-slate-400 font-normal">/ {totalCapacity}</span>
            </span>
          </div>
          <div className="h-8 w-px bg-slate-700" />
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Status</span>
            <span className="text-xs font-bold text-amber-400">
              {fullSheltersCount} Full &bull; {wheelchairSheltersCount} Accessible
            </span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 bg-slate-800/90 border border-slate-700 p-3 sm:p-4 rounded-xl">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search shelter by name (e.g. Burgos Covered Court, High School)..."
            className="w-full pl-9 pr-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-400"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={filterCategory}
            onChange={e => setFilterCategory(e.target.value)}
            className="px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs font-semibold text-slate-200 focus:outline-none focus:border-amber-400 cursor-pointer"
          >
            <option value="all">All Categories</option>
            <option value="school">Schools (113)</option>
            <option value="community_centre">Covered Courts &amp; Centers</option>
            <option value="townhall">Town Halls</option>
            <option value="place_of_worship">Places of Worship</option>
          </select>

          <button
            type="button"
            onClick={() => setFilterAccessibleOnly(!filterAccessibleOnly)}
            className={`px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
              filterAccessibleOnly
                ? 'bg-amber-500 text-slate-950 ring-2 ring-amber-400'
                : 'bg-slate-900 text-slate-300 border border-slate-700 hover:border-slate-500'
            }`}
          >
            <Accessibility className="w-3.5 h-3.5" />
            Wheelchair Accessible Only
          </button>
        </div>
      </div>

      {/* Shelters Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredShelters.map(shelter => {
          const occupancyPct = Math.min(100, Math.round((shelter.occupancy / shelter.capacity) * 100));
          const isAtLimit = shelter.isFull || shelter.occupancy >= shelter.capacity;

          // Check if any vehicle is currently heading to this shelter
          const incomingVehicles = vehicles.filter(v => v.destinationShelterId === shelter.id);

          return (
            <div
              key={shelter.id}
              className={`border-2 rounded-2xl p-5 transition-all shadow-md flex flex-col justify-between gap-4 ${
                shelter.isFull
                  ? 'bg-slate-900/90 border-red-800/80'
                  : 'bg-slate-800/90 border-slate-700 hover:border-slate-600'
              }`}
            >
              <div className="space-y-3">
                {/* Header */}
                <div className="flex justify-between items-start gap-2">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 block">
                      {shelter.category.replace('_', ' ')} &bull; Tier {shelter.candidateTier}
                    </span>
                    <h3 className="text-base font-extrabold text-white leading-snug mt-0.5">
                      {shelter.name}
                    </h3>
                  </div>

                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-black uppercase tracking-wider shrink-0 ${
                      shelter.isFull
                        ? 'bg-red-600 text-white'
                        : 'bg-emerald-600/30 text-emerald-300 border border-emerald-500/40'
                    }`}
                  >
                    {shelter.isFull ? 'SHELTER FULL' : 'OPEN'}
                  </span>
                </div>

                {/* Occupancy Meter */}
                <div className="space-y-1.5 bg-slate-900/60 p-3 rounded-xl border border-slate-700/60">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-slate-400 flex items-center gap-1">
                      <Users className="w-3.5 h-3.5 text-blue-400" /> Current Occupancy:
                    </span>
                    <span className="text-white font-mono font-bold">
                      {shelter.occupancy} / {shelter.capacity} ({occupancyPct}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        isAtLimit ? 'bg-red-500' : occupancyPct > 80 ? 'bg-amber-500' : 'bg-emerald-500'
                      }`}
                      style={{ width: `${occupancyPct}%` }}
                    />
                  </div>
                </div>

                {/* Facilities Badges */}
                <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                  <span
                    className={`px-2 py-0.5 rounded font-bold flex items-center gap-1 ${
                      shelter.wheelchairAccessible
                        ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                        : 'bg-slate-800 text-slate-500 line-through'
                    }`}
                  >
                    <Accessibility className="w-3 h-3" />
                    {shelter.wheelchairAccessible ? 'Wheelchair Ready' : 'No Ramps'}
                  </span>

                  <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-400 font-mono text-[10px]">
                    Node #{shelter.nearestNode}
                  </span>

                  {incomingVehicles.length > 0 && (
                    <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 font-bold border border-blue-500/30">
                      {incomingVehicles.length} Bus En Route
                    </span>
                  )}
                </div>
              </div>

              {/* Action Buttons: "Shelter Full" & "Wheelchair Toggle" */}
              <div className="space-y-2 pt-2 border-t border-slate-700/80">
                <button
                  type="button"
                  onClick={() => handleToggleFull(shelter.id)}
                  disabled={actionLoadingId === shelter.id}
                  className={`w-full py-2.5 px-3 rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all shadow-md cursor-pointer ${
                    shelter.isFull
                      ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                      : highContrast
                      ? 'bg-red-600 hover:bg-red-500 text-white ring-2 ring-red-400'
                      : 'bg-red-600/90 hover:bg-red-600 text-white shadow-red-600/20 active:scale-[0.98]'
                  }`}
                >
                  <AlertOctagon className="w-4 h-4 shrink-0" />
                  {shelter.isFull ? 'RE-OPEN SHELTER' : 'MARK SHELTER FULL'}
                </button>

                <button
                  type="button"
                  onClick={() => handleToggleWheelchair(shelter.id)}
                  disabled={actionLoadingId === shelter.id}
                  className="w-full py-2 px-3 rounded-xl text-[11px] font-bold text-slate-300 bg-slate-900 hover:bg-slate-750 border border-slate-700 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Accessibility className="w-3.5 h-3.5 text-amber-400" />
                  {shelter.wheelchairAccessible ? 'Set Restriction: No Wheelchairs' : 'Enable Wheelchair Accommodation'}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

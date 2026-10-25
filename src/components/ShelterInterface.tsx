import React, { useState } from 'react';
import { Shelter, Vehicle } from '../types';
import { Home, Accessibility, Users, AlertOctagon, CheckCircle2, Search, MapPin, Building, Bed, ArrowRight, UserPlus, UserMinus, ShieldCheck } from 'lucide-react';

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
  // Assigned shelter id for this manager (defaults to 1: Burgos Covered Court)
  const [selectedShelterId, setSelectedShelterId] = useState<number>(1);
  const [activeTab, setActiveTab] = useState<'my_shelter' | 'all_shelters'>('my_shelter');
  const [search, setSearch] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [localOccupancyOffset, setLocalOccupancyOffset] = useState<number>(0);

  const myShelter = shelters.find(s => s.id === selectedShelterId) || shelters[0];

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

  const handleQuickIntake = (amount: number) => {
    setLocalOccupancyOffset(prev => {
      const next = prev + amount;
      const currentTotal = myShelter.occupancy + next;
      if (currentTotal < 0) return -myShelter.occupancy;
      if (currentTotal > myShelter.capacity) return myShelter.capacity - myShelter.occupancy;
      return next;
    });
  };

  if (!myShelter) {
    return <div className="text-center p-8 text-slate-400">Loading shelter station...</div>;
  }

  const currentOccupancy = Math.max(0, Math.min(myShelter.capacity, myShelter.occupancy + localOccupancyOffset));
  const availableBeds = Math.max(0, myShelter.capacity - currentOccupancy);
  const occupancyPct = Math.min(100, Math.round((currentOccupancy / myShelter.capacity) * 100));
  const incomingVehicles = vehicles.filter(v => v.destinationShelterId === myShelter.id);

  const filteredShelters = shelters.filter(s =>
    search.trim()
      ? s.name.toLowerCase().includes(search.toLowerCase()) ||
        s.category.toLowerCase().includes(search.toLowerCase())
      : true
  );

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      {/* 1. Header with Station Switcher & Clean 2-Tab Navigation */}
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Home className="w-5 h-5 text-emerald-400" />
              <h2 className="text-lg sm:text-xl font-bold text-white">
                Daraga Shelter Station Management
              </h2>
            </div>
            <p className="text-xs text-slate-400">
              Assigned Station: <strong className="text-emerald-300">{myShelter.name}</strong>
            </p>
          </div>

          {/* Quick Shelter Selector for Managers stationed elsewhere */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-slate-400 hidden sm:inline">Station:</span>
            <select
              value={selectedShelterId}
              onChange={e => {
                setSelectedShelterId(Number(e.target.value));
                setLocalOccupancyOffset(0);
              }}
              className="text-xs px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-700 text-white focus:outline-none focus:border-emerald-400 cursor-pointer"
            >
              {shelters.slice(0, 10).map(s => (
                <option key={s.id} value={s.id}>
                  #{s.id} - {s.name.slice(0, 28)}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Isolation Tabs: "My Station" vs "Other Shelters" */}
        <div className="flex rounded-xl bg-slate-950 p-1 border border-slate-800">
          <button
            type="button"
            onClick={() => setActiveTab('my_shelter')}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-2 ${
              activeTab === 'my_shelter'
                ? 'bg-emerald-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Building className="w-3.5 h-3.5" />
            <span>Aking Shelter ({myShelter.name.split(' ')[0]})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('all_shelters')}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-2 ${
              activeTab === 'all_shelters'
                ? 'bg-slate-800 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Iba Pang Shelters ({shelters.length})</span>
          </button>
        </div>
      </div>

      {/* 2. TAB 1: MY SHELTER VIEW (ISOLATED & UNCLUTTERED) */}
      {activeTab === 'my_shelter' && (
        <div className="space-y-4">
          {/* Main Station Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 space-y-5 shadow-lg">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-800 pb-4">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-xl sm:text-2xl font-black text-white">{myShelter.name}</h3>
                  <span
                    className={`text-xs font-bold px-2.5 py-0.5 rounded-full uppercase ${
                      myShelter.isFull
                        ? 'bg-red-500/20 text-red-300 border border-red-500/40'
                        : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    }`}
                  >
                    {myShelter.isFull ? 'Shelter Full (Puno)' : 'Open & Receiving'}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Designated High Ground · Station #{myShelter.id} · Type: {myShelter.category}
                </p>
              </div>

              {/* Status Indicator */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-400">Ramp Access:</span>
                <span
                  className={`text-xs font-bold px-2 py-0.5 rounded-lg ${
                    myShelter.wheelchairAccessible
                      ? 'bg-emerald-500/20 text-emerald-300'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {myShelter.wheelchairAccessible ? '♿ Ready' : 'Standard'}
                </span>
              </div>
            </div>

            {/* OCCUPANCY PROMINENCE SECTION */}
            <div className="bg-slate-950 p-4 sm:p-5 rounded-2xl border border-slate-800 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
                <div>
                  <span className="text-[11px] uppercase tracking-wider text-slate-400 font-bold block mb-1">
                    Kasalukuyang Occupancy (Current Beds Used)
                  </span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl sm:text-4xl font-black text-white font-mono">
                      {currentOccupancy}
                    </span>
                    <span className="text-base text-slate-500 font-semibold font-mono">
                      / {myShelter.capacity} kabuuang kama (total beds)
                    </span>
                  </div>
                </div>

                <div className="text-left sm:text-right">
                  <span className="text-xs font-black text-emerald-400 block">
                    {availableBeds} BAKANTENG HIGAAN
                  </span>
                  <span className="text-[11px] text-slate-400">
                    {availableBeds > 0 ? 'Beds Available for Intake' : 'Facility at 100% Capacity'}
                  </span>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-semibold text-slate-400">
                  <span>Occupancy Level</span>
                  <span className="font-mono text-amber-400 font-bold">{occupancyPct}% puno</span>
                </div>
                <div className="w-full bg-slate-900 h-3.5 rounded-full overflow-hidden border border-slate-800 p-0.5">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      myShelter.isFull || occupancyPct >= 100
                        ? 'bg-red-500'
                        : occupancyPct > 80
                        ? 'bg-amber-500'
                        : 'bg-emerald-500'
                    }`}
                    style={{ width: `${occupancyPct}%` }}
                  />
                </div>
              </div>

              {/* Accessible Slots Breakdown */}
              <div className="grid grid-cols-2 gap-3 pt-1 text-xs">
                <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
                  <span className="text-slate-400 block text-[11px]">Wheelchair / PWD Beds</span>
                  <span className="text-base font-bold text-white font-mono mt-0.5 block">
                    {myShelter.wheelchairAccessible ? '18 Nakalaan (Ready)' : '0 (Limited)'}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
                  <span className="text-slate-400 block text-[11px]">Senior Priority Space</span>
                  <span className="text-base font-bold text-white font-mono mt-0.5 block">
                    Ground Floor Zone A
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Intake Counter Buttons */}
            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2">
              <span className="text-[11px] uppercase tracking-wider text-slate-400 font-bold block">
                Mabilisang Check-In / Intake ng mga Lumikas:
              </span>
              <div className="grid grid-cols-3 gap-2.5">
                <button
                  type="button"
                  onClick={() => handleQuickIntake(1)}
                  className="py-2.5 px-3 rounded-xl bg-emerald-600/30 hover:bg-emerald-600/40 border border-emerald-500/50 text-emerald-200 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 transition-all"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>+1 Senior</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickIntake(5)}
                  className="py-2.5 px-3 rounded-xl bg-emerald-600/30 hover:bg-emerald-600/40 border border-emerald-500/50 text-emerald-200 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 transition-all"
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>+5 Pamilya</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickIntake(-1)}
                  className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 transition-all"
                >
                  <UserMinus className="w-3.5 h-3.5" />
                  <span>-1 Labas</span>
                </button>
              </div>
            </div>

            {/* Station Controls: Toggle Full & Toggle Ramp */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-3">
                <div>
                  <span className="text-xs font-bold text-white block">Kapasidad ng Shelter</span>
                  <span className="text-[11px] text-slate-400 block mt-0.5">
                    {myShelter.isFull ? 'Nakatala bilang PUNO' : 'Bukas at tumatanggap'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleToggleFull(myShelter.id)}
                  disabled={actionLoading}
                  className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase transition-all cursor-pointer shadow ${
                    myShelter.isFull
                      ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                      : 'bg-red-600 hover:bg-red-500 text-white'
                  }`}
                >
                  {myShelter.isFull ? 'Buksan Muli' : 'I-mark Puno'}
                </button>
              </div>

              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-3">
                <div>
                  <span className="text-xs font-bold text-white block">Wheelchair Ramp</span>
                  <span className="text-[11px] text-slate-400 block mt-0.5">
                    {myShelter.wheelchairAccessible ? 'Ramp operational' : 'Limited ramp access'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleToggleWheelchair(myShelter.id)}
                  disabled={actionLoading}
                  className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase transition-all cursor-pointer shadow ${
                    myShelter.wheelchairAccessible
                      ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
                      : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                  }`}
                >
                  {myShelter.wheelchairAccessible ? 'I-disable' : 'I-enable Ramp'}
                </button>
              </div>
            </div>
          </div>

          {/* Incoming Evacuation Shuttles Heading to THIS Shelter */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-3 shadow">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <div>
                <h4 className="text-sm sm:text-base font-bold text-white">
                  Paparating na mga Rescue Bus (Incoming Shuttles)
                </h4>
                <p className="text-xs text-slate-400">
                  Mga sasakyang patungo sa {myShelter.name}
                </p>
              </div>
              <span className="text-xs text-emerald-400 font-mono font-bold">
                {incomingVehicles.length} Shuttles Active
              </span>
            </div>

            {incomingVehicles.length === 0 ? (
              <div className="text-center py-4 text-xs text-slate-500">
                Walang sasakyang kasalukuyang nakatakda patungo sa shelter na ito.
              </div>
            ) : (
              <div className="space-y-2.5">
                {incomingVehicles.map(v => (
                  <div
                    key={v.id}
                    className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-black text-white">{v.name}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 font-mono">
                          {v.id}
                        </span>
                      </div>
                      <span className="text-slate-400 block mt-0.5">
                        Driver: Kuya Ramon · Nakasakay: {Math.max(1, v.seatsTotal - v.seatsFree)} lolo/lola
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-amber-400 block">Arriving ~6-8 min</span>
                      <span className="text-[10px] text-slate-400">Wheelchair ramp deployed</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 3. TAB 2: OTHER DARAGA SHELTERS (NETWORK VIEW) */}
      {activeTab === 'all_shelters' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-4 shadow-lg">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
            <div>
              <h3 className="text-base font-bold text-white">Iba Pang Evacuation Centers sa Daraga</h3>
              <p className="text-xs text-slate-400">
                Network view para sa koordinasyon ng overflow at paglipat ng mga lilikas
              </p>
            </div>
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Maghanap ng shelter o barangay..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full sm:w-64 text-xs pl-9 pr-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-400"
              />
            </div>
          </div>

          <div className="divide-y divide-slate-800 max-h-[500px] overflow-y-auto pr-1">
            {filteredShelters.map(s => {
              const isSelected = s.id === selectedShelterId;
              const pct = Math.min(100, Math.round((s.occupancy / s.capacity) * 100));
              return (
                <div
                  key={s.id}
                  className={`py-3.5 px-3 rounded-xl transition-colors flex items-center justify-between text-xs gap-3 ${
                    isSelected ? 'bg-emerald-950/20 border border-emerald-500/30' : 'hover:bg-slate-950/50'
                  }`}
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white">{s.name}</span>
                      {isSelected && (
                        <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300">
                          Aking Station
                        </span>
                      )}
                    </div>
                    <span className="text-slate-400 text-[11px] block">
                      {s.category} · Kapasidad: <strong className="text-slate-300">{s.occupancy}/{s.capacity}</strong> ({pct}% puno) · {s.wheelchairAccessible ? '♿ PWD Ramp' : 'Standard'}
                    </span>
                  </div>

                  <div className="flex items-center gap-2.5 shrink-0">
                    <span
                      className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                        s.isFull
                          ? 'bg-red-500/20 text-red-300'
                          : 'bg-emerald-500/20 text-emerald-300'
                      }`}
                    >
                      {s.isFull ? 'Puno' : 'Bukas'}
                    </span>

                    {!isSelected && (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedShelterId(s.id);
                          setActiveTab('my_shelter');
                          setLocalOccupancyOffset(0);
                        }}
                        className="text-[11px] px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 cursor-pointer transition-colors"
                      >
                        Piliin Ito
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

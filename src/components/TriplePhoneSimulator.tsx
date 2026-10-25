import React, { useState } from 'react';
import { Resident, Vehicle, Shelter } from '../types';
import { RiderInterface } from './RiderInterface';
import { DriverInterface } from './DriverInterface';
import { ShelterInterface } from './ShelterInterface';
import {
  Smartphone,
  Users,
  Truck,
  Home,
  QrCode,
  Sparkles,
  Wifi,
  Battery,
  Layers,
  ArrowRight,
  RefreshCw,
  Info,
} from 'lucide-react';

interface Props {
  residents: Resident[];
  vehicles: Vehicle[];
  shelters: Shelter[];
  onSubmitRiderRequest: (data: {
    name: string;
    phone: string;
    age: number;
    need: Resident['need'];
    notes: string;
    barangay: string;
    lon: number;
    lat: number;
  }) => Promise<void>;
  onMarkBusFull: (vehicleId: string) => Promise<void>;
  onAdvanceStop: (vehicleId: string) => Promise<void>;
  onToggleShelterFull: (shelterId: number) => Promise<void>;
  onToggleWheelchair: (shelterId: number) => Promise<void>;
  onOpenPhoneModal: () => void;
  onSelectSingleRole: (role: 'rider' | 'driver' | 'shelter') => void;
  highContrast: boolean;
  activeRiderId?: string | null;
  onSelectActiveRider?: (id: string | null) => void;
}

export const TriplePhoneSimulator: React.FC<Props> = ({
  residents,
  vehicles,
  shelters,
  onSubmitRiderRequest,
  onMarkBusFull,
  onAdvanceStop,
  onToggleShelterFull,
  onToggleWheelchair,
  onOpenPhoneModal,
  onSelectSingleRole,
  highContrast,
  activeRiderId,
  onSelectActiveRider,
}) => {
  const [selectedFocus, setSelectedFocus] = useState<'all' | 'rider' | 'driver' | 'shelter'>('all');

  return (
    <div className="space-y-6">
      {/* SIMULATOR TOP BANNER */}
      <div className="bg-gradient-to-r from-slate-900 via-amber-950/40 to-slate-900 border-2 border-amber-500/60 rounded-3xl p-5 shadow-2xl flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="space-y-1.5 text-center md:text-left">
          <div className="flex flex-wrap items-center gap-2 justify-center md:justify-start">
            <span className="px-3 py-1 rounded-full bg-amber-500 text-slate-950 font-black text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-md">
              <Layers className="w-4 h-4" /> 3-Phone Live Synchronized Simulator
            </span>
            <span className="text-xs text-amber-300 font-bold bg-amber-500/10 border border-amber-500/30 px-2.5 py-0.5 rounded-full">
              Real-Time State Mesh
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white">
            A.R.K Tri-Interface Demonstration
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
            All 3 screens below run simultaneously on the <strong>same live dispatch state</strong>. Requesting a pickup on Phone 1 updates the driver&apos;s route on Phone 2, and tapping &ldquo;Bus Full&rdquo; on Phone 2 notifies Lola on Phone 1!
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0 justify-center">
          <button
            onClick={onOpenPhoneModal}
            className="px-4 py-2.5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-lg transition-all cursor-pointer active:scale-95"
          >
            <QrCode className="w-4 h-4" />
            <span>Setup Physical Phones</span>
          </button>
        </div>
      </div>

      {/* QUICK VIEW FOCUS TOGGLE */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-1.5 bg-slate-900 p-1.5 rounded-2xl border border-slate-800">
          {[
            { id: 'all', label: 'All 3 Phones Side-by-Side' },
            { id: 'rider', label: 'Focus Phone 1 (Rider)' },
            { id: 'driver', label: 'Focus Phone 2 (Driver)' },
            { id: 'shelter', label: 'Focus Phone 3 (Shelter)' },
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setSelectedFocus(f.id as any)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                selectedFocus === f.id
                  ? 'bg-amber-500 text-slate-950 font-black shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="text-xs text-slate-400 flex items-center gap-1.5">
          <Info className="w-3.5 h-3.5 text-amber-400" />
          <span>Shared municipality state: {residents.length} riders &bull; {vehicles.length} rescue buses &bull; {shelters.length} evacuation centers</span>
        </div>
      </div>

      {/* 3 PHONES DISPLAY GRID */}
      <div className={`grid gap-6 ${
        selectedFocus === 'all'
          ? 'grid-cols-1 lg:grid-cols-3'
          : 'grid-cols-1 max-w-xl mx-auto'
      }`}>
        {/* PHONE 1: RIDER */}
        {(selectedFocus === 'all' || selectedFocus === 'rider') && (
          <div className="flex flex-col">
            {/* Phone Container Hardware Frame */}
            <div className="bg-slate-900 border-4 border-amber-500/80 rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col flex-1 ring-4 ring-amber-500/20">
              {/* Phone Status Bar */}
              <div className="bg-slate-950 px-6 py-2.5 flex items-center justify-between text-xs text-slate-400 border-b border-slate-800 shrink-0">
                <span className="font-bold text-white text-[11px]">9:41</span>
                {/* Hardware Speaker Notch */}
                <div className="w-20 h-3.5 bg-slate-900 rounded-full border border-slate-800 flex items-center justify-center">
                  <div className="w-8 h-1 bg-slate-700 rounded-full" />
                </div>
                <div className="flex items-center gap-1.5 text-[10px]">
                  <Wifi className="w-3 h-3 text-amber-400" />
                  <Battery className="w-3.5 h-3.5 text-emerald-400" />
                </div>
              </div>

              {/* Phone App Header */}
              <div className="bg-slate-950/90 px-4 py-2 border-b border-slate-800 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-amber-500 flex items-center justify-center text-slate-950 font-black text-xs">
                    1
                  </div>
                  <div>
                    <h3 className="text-xs font-black text-white leading-tight">Phone 1 &bull; Rider</h3>
                    <p className="text-[10px] text-amber-300">Lola Remedios (Senior / Wheelchair)</p>
                  </div>
                </div>

                <button
                  onClick={() => onSelectSingleRole('rider')}
                  className="text-[10px] text-amber-300 hover:text-white underline flex items-center gap-0.5 cursor-pointer font-bold"
                  title="Expand to full screen"
                >
                  <span>Full Screen</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>

              {/* Phone Screen Scrollable Area */}
              <div className="p-3 sm:p-4 overflow-y-auto max-h-[750px] flex-1 bg-slate-950">
                <RiderInterface
                  residents={residents}
                  vehicles={vehicles}
                  shelters={shelters}
                  onSubmitRequest={onSubmitRiderRequest}
                  highContrast={highContrast}
                  activeRiderId={activeRiderId}
                  onSelectActiveRider={onSelectActiveRider}
                />
              </div>

              {/* Phone Home Bar */}
              <div className="bg-slate-950 py-2 flex justify-center shrink-0 border-t border-slate-900">
                <div className="w-28 h-1 bg-slate-600 rounded-full" />
              </div>
            </div>
          </div>
        )}

        {/* PHONE 2: DRIVER */}
        {(selectedFocus === 'all' || selectedFocus === 'driver') && (
          <div className="flex flex-col">
            <div className="bg-slate-900 border-4 border-blue-500/80 rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col flex-1 ring-4 ring-blue-500/20">
              <div className="bg-slate-950 px-6 py-2.5 flex items-center justify-between text-xs text-slate-400 border-b border-slate-800 shrink-0">
                <span className="font-bold text-white text-[11px]">9:41</span>
                <div className="w-20 h-3.5 bg-slate-900 rounded-full border border-slate-800 flex items-center justify-center">
                  <div className="w-8 h-1 bg-slate-700 rounded-full" />
                </div>
                <div className="flex items-center gap-1.5 text-[10px]">
                  <Wifi className="w-3 h-3 text-blue-400" />
                  <Battery className="w-3.5 h-3.5 text-emerald-400" />
                </div>
              </div>

              <div className="bg-slate-950/90 px-4 py-2 border-b border-slate-800 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-blue-500 flex items-center justify-center text-white font-black text-xs">
                    2
                  </div>
                  <div>
                    <h3 className="text-xs font-black text-white leading-tight">Phone 2 &bull; Driver</h3>
                    <p className="text-[10px] text-blue-300">Kuya Ramon &bull; BUS-01 Console</p>
                  </div>
                </div>

                <button
                  onClick={() => onSelectSingleRole('driver')}
                  className="text-[10px] text-blue-300 hover:text-white underline flex items-center gap-0.5 cursor-pointer font-bold"
                  title="Expand to full screen"
                >
                  <span>Full Screen</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>

              <div className="p-3 sm:p-4 overflow-y-auto max-h-[750px] flex-1 bg-slate-950">
                <DriverInterface
                  vehicles={vehicles}
                  residents={residents}
                  shelters={shelters}
                  onMarkBusFull={onMarkBusFull}
                  onAdvanceStop={onAdvanceStop}
                  highContrast={highContrast}
                />
              </div>

              <div className="bg-slate-950 py-2 flex justify-center shrink-0 border-t border-slate-900">
                <div className="w-28 h-1 bg-slate-600 rounded-full" />
              </div>
            </div>
          </div>
        )}

        {/* PHONE 3: SHELTER */}
        {(selectedFocus === 'all' || selectedFocus === 'shelter') && (
          <div className="flex flex-col">
            <div className="bg-slate-900 border-4 border-emerald-500/80 rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col flex-1 ring-4 ring-emerald-500/20">
              <div className="bg-slate-950 px-6 py-2.5 flex items-center justify-between text-xs text-slate-400 border-b border-slate-800 shrink-0">
                <span className="font-bold text-white text-[11px]">9:41</span>
                <div className="w-20 h-3.5 bg-slate-900 rounded-full border border-slate-800 flex items-center justify-center">
                  <div className="w-8 h-1 bg-slate-700 rounded-full" />
                </div>
                <div className="flex items-center gap-1.5 text-[10px]">
                  <Wifi className="w-3 h-3 text-emerald-400" />
                  <Battery className="w-3.5 h-3.5 text-emerald-400" />
                </div>
              </div>

              <div className="bg-slate-950/90 px-4 py-2 border-b border-slate-800 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-emerald-500 flex items-center justify-center text-slate-950 font-black text-xs">
                    3
                  </div>
                  <div>
                    <h3 className="text-xs font-black text-white leading-tight">Phone 3 &bull; Shelter</h3>
                    <p className="text-[10px] text-emerald-300">Burgos Covered Court Station</p>
                  </div>
                </div>

                <button
                  onClick={() => onSelectSingleRole('shelter')}
                  className="text-[10px] text-emerald-300 hover:text-white underline flex items-center gap-0.5 cursor-pointer font-bold"
                  title="Expand to full screen"
                >
                  <span>Full Screen</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>

              <div className="p-3 sm:p-4 overflow-y-auto max-h-[750px] flex-1 bg-slate-950">
                <ShelterInterface
                  shelters={shelters}
                  vehicles={vehicles}
                  onToggleShelterFull={onToggleShelterFull}
                  onToggleWheelchair={onToggleWheelchair}
                  highContrast={highContrast}
                />
              </div>

              <div className="bg-slate-950 py-2 flex justify-center shrink-0 border-t border-slate-900">
                <div className="w-28 h-1 bg-slate-600 rounded-full" />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

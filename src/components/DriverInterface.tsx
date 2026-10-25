import React, { useState } from 'react';
import { Vehicle, Resident, Shelter } from '../types';
import { Truck, Users, Accessibility, CheckCircle2, AlertOctagon, MapPin, Navigation, Phone } from 'lucide-react';

interface Props {
  vehicles: Vehicle[];
  residents: Resident[];
  shelters: Shelter[];
  onMarkBusFull: (vehicleId: string) => Promise<void>;
  onAdvanceStop: (vehicleId: string) => Promise<void>;
  highContrast: boolean;
}

export const DriverInterface: React.FC<Props> = ({
  vehicles,
  residents,
  shelters,
  onMarkBusFull,
  onAdvanceStop,
  highContrast,
}) => {
  // During demo walkthrough: Driver sees ONLY their assigned vehicle console (no shuffling through other drivers)
  const myVehicle = vehicles.find(v => v.id === 'BUS-01') || vehicles[0];
  const [actionLoading, setActionLoading] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const destinationShelter = shelters.find(s => s.id === myVehicle?.destinationShelterId);
  const myRiders = residents.filter(r => myVehicle?.assignedRequestIds.includes(r.id));
  const nextStop = myVehicle?.routeStops.find(s => s.status === 'pending');

  const handleBusFull = async () => {
    if (!myVehicle) return;
    setActionLoading(true);
    setNotice(null);
    try {
      await onMarkBusFull(myVehicle.id);
      setNotice('BUS MARKED FULL: All unserved riders have returned to the priority pool and were notified to wait for the next bus.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleAdvance = async () => {
    if (!myVehicle) return;
    setActionLoading(true);
    setNotice(null);
    try {
      await onAdvanceStop(myVehicle.id);
      setNotice('Stop status updated.');
    } finally {
      setActionLoading(false);
    }
  };

  if (!myVehicle) {
    return <div className="text-center p-8 text-slate-400">Loading driver console...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Driver Header */}
      <div className="bg-slate-900 border-2 border-slate-700 rounded-3xl p-5 sm:p-7 shadow-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-400/40 text-amber-400 flex items-center justify-center shrink-0">
            <Truck className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl sm:text-2xl font-black text-white">
                Driver Console &bull; {myVehicle.name}
              </h2>
              <span
                className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                  myVehicle.status === 'full'
                    ? 'bg-red-600 text-white animate-pulse'
                    : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                }`}
              >
                {myVehicle.status.toUpperCase()}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-400">
              Driver: <strong className="text-slate-200">{myVehicle.driverName}</strong> &bull; Accessible Lift Equipped
            </p>
          </div>
        </div>

        {/* Capacity Gauges */}
        <div className="flex items-center gap-4 bg-slate-950 border border-slate-800 px-4 py-2.5 rounded-2xl w-full sm:w-auto justify-around">
          <div>
            <span className="text-[10px] font-bold uppercase text-slate-400 block">General Seats Free</span>
            <span className="text-lg font-black text-amber-400 font-mono">
              {myVehicle.seatsFree} / {myVehicle.seatsTotal}
            </span>
          </div>
          <div className="w-px h-8 bg-slate-800" />
          <div>
            <span className="text-[10px] font-bold uppercase text-slate-400 block">Wheelchair Free</span>
            <span className="text-lg font-black text-emerald-400 font-mono">
              {myVehicle.wheelchairFree} / {myVehicle.wheelchairSpaces}
            </span>
          </div>
        </div>
      </div>

      {/* Main Action Banner: BUS FULL */}
      <div className="bg-slate-900 border-2 border-slate-700 rounded-3xl p-5 sm:p-6 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <AlertOctagon className="w-5 h-5 text-red-400" />
              Bus Capacity Control
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Press when safe physical capacity is reached. Automatically alerts pending riders to wait for next bus.
            </p>
          </div>

          <button
            type="button"
            onClick={handleBusFull}
            disabled={actionLoading || myVehicle.status === 'full'}
            className={`w-full sm:w-auto px-6 py-3.5 rounded-2xl font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg ${
              myVehicle.status === 'full'
                ? 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
                : highContrast
                ? 'bg-red-600 hover:bg-red-500 text-white ring-4 ring-red-500'
                : 'bg-red-600 hover:bg-red-500 text-white shadow-red-600/30 active:scale-95'
            }`}
          >
            <AlertOctagon className="w-5 h-5" />
            <span>{myVehicle.status === 'full' ? 'BUS MARKED FULL' : 'MARK BUS FULL'}</span>
          </button>
        </div>

        {notice && (
          <div className="p-3.5 rounded-xl bg-amber-500/20 border border-amber-400/40 text-amber-200 text-xs font-semibold">
            {notice}
          </div>
        )}
      </div>

      {/* Ordered Route Plan */}
      <div className="bg-slate-900 border-2 border-slate-700 rounded-3xl p-5 sm:p-7 shadow-xl space-y-5">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-slate-800 pb-3">
          <div>
            <h3 className="text-lg font-extrabold text-white flex items-center gap-2">
              <Navigation className="w-5 h-5 text-amber-400" />
              My Assigned Pickup &amp; Drop-off Route (Dijkstra)
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Optimized road network routing for Daraga evacuation.
            </p>
          </div>

          {nextStop && (
            <button
              type="button"
              onClick={handleAdvance}
              disabled={actionLoading}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs uppercase tracking-wider flex items-center gap-2 shadow-md transition-all active:scale-95 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{nextStop.type === 'pickup' ? 'Confirm Passenger Picked Up' : 'Complete Shelter Drop-Off'}</span>
            </button>
          )}
        </div>

        {/* Route Stops Sequence */}
        <div className="space-y-3">
          {myVehicle.routeStops.length === 0 ? (
            <div className="text-center py-8 text-slate-500 text-sm">
              No active route stops assigned. Vehicle is standing by at depot.
            </div>
          ) : (
            myVehicle.routeStops.map((stop, idx) => {
              const riderObj = residents.find(r => r.id === stop.residentId);
              const isCompleted = stop.status === 'completed';
              const isCurrent = stop.status === 'pending' && (!myVehicle.routeStops[idx - 1] || myVehicle.routeStops[idx - 1].status === 'completed');

              return (
                <div
                  key={stop.id}
                  className={`p-4 rounded-2xl border-2 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    isCompleted
                      ? 'bg-slate-950/50 border-slate-800 opacity-50 text-slate-400'
                      : isCurrent
                      ? 'bg-amber-500/15 border-amber-400 text-white shadow-xl ring-2 ring-amber-400/40'
                      : 'bg-slate-950 border-slate-800 text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-xs shrink-0 ${
                        isCompleted
                          ? 'bg-slate-800 text-slate-400'
                          : isCurrent
                          ? 'bg-amber-400 text-slate-950 font-black animate-bounce'
                          : 'bg-slate-800 text-slate-300'
                      }`}
                    >
                      {idx + 1}
                    </div>

                    <div>
                      <div className="flex flex-wrap items-center gap-2 font-extrabold text-sm sm:text-base">
                        <span>{stop.label}</span>
                        {riderObj && (
                          <span className="text-[10px] px-2 py-0.5 rounded font-black uppercase bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                            {riderObj.need}
                          </span>
                        )}
                      </div>

                      {riderObj && (
                        <div className="text-xs text-slate-400 mt-1 flex flex-wrap items-center gap-3 font-semibold">
                          <span>Age: {riderObj.age}yo</span>
                          <span>Priority Score: <strong className="text-amber-400">{riderObj.priorityScore}</strong></span>
                          {riderObj.phone && (
                            <span className="flex items-center gap-1 text-slate-300">
                              <Phone className="w-3 h-3 text-amber-400" /> {riderObj.phone}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="shrink-0">
                    <span
                      className={`text-xs font-black uppercase ${
                        isCompleted ? 'text-emerald-400' : isCurrent ? 'text-amber-400' : 'text-slate-500'
                      }`}
                    >
                      {isCompleted ? 'COMPLETED' : isCurrent ? 'CURRENT STOP' : 'QUEUED'}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

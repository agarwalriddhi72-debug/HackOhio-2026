import React, { useState } from 'react';
import { Vehicle, Resident, Shelter } from '../types';
import { Truck, Users, Accessibility, CheckCircle2, AlertOctagon, MapPin, Navigation, Phone, ShieldAlert, ArrowRight } from 'lucide-react';

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
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>(vehicles[0]?.id || 'BUS-01');
  const [actionLoading, setActionLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const activeVehicle = vehicles.find(v => v.id === selectedVehicleId) || vehicles[0];
  const destinationShelter = shelters.find(s => s.id === activeVehicle?.destinationShelterId);

  // Active passengers on board or assigned
  const assignedRiders = residents.filter(r => activeVehicle?.assignedRequestIds.includes(r.id));

  const handleBusFull = async () => {
    if (!activeVehicle) return;
    setActionLoading(true);
    setStatusMessage(null);
    try {
      await onMarkBusFull(activeVehicle.id);
      setStatusMessage(`${activeVehicle.name} marked FULL. Unserved pending riders returned to waiting pool and notified to wait for next bus.`);
    } catch {
      setStatusMessage('Failed to update vehicle status.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleAdvance = async () => {
    if (!activeVehicle) return;
    setActionLoading(true);
    setStatusMessage(null);
    try {
      await onAdvanceStop(activeVehicle.id);
      setStatusMessage('Stop status updated.');
    } catch {
      setStatusMessage('Failed to advance route stop.');
    } finally {
      setActionLoading(false);
    }
  };

  const nextStop = activeVehicle?.routeStops.find(s => s.status === 'pending');

  return (
    <div className="space-y-6 max-w-6xl mx-auto p-4 sm:p-6">
      {/* Header & Fleet Switcher */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-800/80 border border-slate-700 p-4 sm:p-5 rounded-2xl">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl sm:text-2xl font-black text-amber-400 tracking-tight">
              ROUTEY &bull; Driver &amp; Route Console
            </h2>
            <span className="text-xs font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              Dijkstra Shortest Path
            </span>
          </div>
          <p className="text-sm text-slate-300 mt-1">
            Optimized pickup route with priority dispatching and dynamic re-routing around flooded corridors.
          </p>
        </div>

        {/* Vehicle Selector Tabs */}
        <div className="flex flex-wrap items-center gap-2">
          {vehicles.map(v => (
            <button
              key={v.id}
              onClick={() => setSelectedVehicleId(v.id)}
              className={`px-3 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all cursor-pointer ${
                v.id === selectedVehicleId
                  ? 'bg-amber-500 text-slate-950 shadow-md ring-2 ring-amber-400'
                  : 'bg-slate-900 text-slate-300 border border-slate-700 hover:border-slate-500'
              }`}
            >
              <Truck className="w-4 h-4" />
              <span>{v.id}</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded font-extrabold uppercase ${
                  v.status === 'full'
                    ? 'bg-red-500 text-white'
                    : v.status === 'available'
                    ? 'bg-emerald-500/30 text-emerald-300'
                    : 'bg-blue-500/30 text-blue-300'
                }`}
              >
                {v.status}
              </span>
            </button>
          ))}
        </div>
      </div>

      {activeVehicle && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Vehicle Telemetry & Action Buttons (4 cols) */}
          <div className="lg:col-span-4 space-y-5">
            {/* Vehicle Profile Card */}
            <div className="bg-slate-800/90 border border-slate-700 rounded-2xl p-5 shadow-xl space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400">
                    {activeVehicle.type}
                  </span>
                  <h3 className="text-xl font-black text-white mt-0.5">
                    {activeVehicle.name}
                  </h3>
                  <p className="text-xs text-slate-400">
                    Driver: <span className="text-slate-200 font-semibold">{activeVehicle.driverName}</span>
                  </p>
                </div>

                <div
                  className={`px-2.5 py-1 rounded-full text-xs font-black uppercase tracking-wider ${
                    activeVehicle.status === 'full'
                      ? 'bg-red-600 text-white animate-pulse'
                      : 'bg-emerald-600/30 text-emerald-300 border border-emerald-500/40'
                  }`}
                >
                  {activeVehicle.status === 'full' ? 'BUS FULL' : 'ACTIVE IN SERVICE'}
                </div>
              </div>

              {/* Capacity Meters */}
              <div className="space-y-3 pt-2 border-t border-slate-700/80">
                <div>
                  <div className="flex justify-between text-xs font-bold mb-1">
                    <span className="text-slate-300 flex items-center gap-1.5">
                      <Users className="w-4 h-4 text-blue-400" /> General Seats Free:
                    </span>
                    <span className="text-amber-400 font-mono text-sm">
                      {activeVehicle.seatsFree} / {activeVehicle.seatsTotal}
                    </span>
                  </div>
                  <div className="w-full bg-slate-900 h-2.5 rounded-full overflow-hidden">
                    <div
                      className="bg-blue-500 h-full rounded-full transition-all duration-300"
                      style={{
                        width: `${Math.round(((activeVehicle.seatsTotal - activeVehicle.seatsFree) / activeVehicle.seatsTotal) * 100)}%`,
                      }}
                    />
                  </div>
                </div>

                {activeVehicle.wheelchairSpaces > 0 && (
                  <div>
                    <div className="flex justify-between text-xs font-bold mb-1">
                      <span className="text-slate-300 flex items-center gap-1.5">
                        <Accessibility className="w-4 h-4 text-emerald-400" /> Wheelchair Spaces Free:
                      </span>
                      <span className="text-emerald-400 font-mono text-sm">
                        {activeVehicle.wheelchairFree} / {activeVehicle.wheelchairSpaces}
                      </span>
                    </div>
                    <div className="w-full bg-slate-900 h-2.5 rounded-full overflow-hidden">
                      <div
                        className="bg-emerald-500 h-full rounded-full transition-all duration-300"
                        style={{
                          width: `${Math.round(((activeVehicle.wheelchairSpaces - activeVehicle.wheelchairFree) / activeVehicle.wheelchairSpaces) * 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Current Destination Shelter */}
              <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-700/80 space-y-1">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  Assigned Evacuation Drop-Off:
                </span>
                <span className="font-extrabold text-sm text-white block">
                  {destinationShelter ? destinationShelter.name : 'Daraga Evacuation Center'}
                </span>
                <span className="text-xs text-amber-300 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5" />
                  {destinationShelter ? `${destinationShelter.occupancy} / ${destinationShelter.capacity} capacity` : 'Available'}
                </span>
              </div>

              {/* CRITICAL FEATURE: "BUS FULL" BUTTON */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleBusFull}
                  disabled={actionLoading || activeVehicle.status === 'full'}
                  className={`w-full py-3.5 px-4 rounded-xl font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-lg cursor-pointer ${
                    activeVehicle.status === 'full'
                      ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                      : highContrast
                      ? 'bg-red-600 hover:bg-red-500 text-white ring-2 ring-red-400'
                      : 'bg-red-600 hover:bg-red-500 text-white shadow-red-600/30 active:scale-[0.98]'
                  }`}
                >
                  <AlertOctagon className="w-5 h-5 shrink-0" />
                  {activeVehicle.status === 'full' ? 'BUS MARKED FULL' : 'MARK BUS FULL'}
                </button>
                <p className="text-[11px] text-slate-400 mt-1.5 text-center leading-tight">
                  Unserved riders return to waiting pool and are notified to wait for another vehicle.
                </p>
              </div>

              {statusMessage && (
                <div className="p-3 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-200 text-xs font-medium">
                  {statusMessage}
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Ordered Dijkstra Route Stops (8 cols) */}
          <div className="lg:col-span-8 bg-slate-800/90 border border-slate-700 rounded-2xl p-5 sm:p-6 shadow-xl space-y-5">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-slate-700 pb-3">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Navigation className="w-5 h-5 text-amber-400" />
                  Ordered Route Plan (Dijkstra Turn-by-Turn)
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Route order computed to minimize transit time while prioritizing urgent PWD &amp; older adults.
                </p>
              </div>

              {nextStop && (
                <button
                  type="button"
                  onClick={handleAdvance}
                  disabled={actionLoading}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider flex items-center gap-2 shadow-md transition-all active:scale-[0.98] cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  {nextStop.type === 'pickup' ? 'Confirm Passenger Picked Up' : 'Complete Shelter Drop-Off'}
                </button>
              )}
            </div>

            {/* Stops Timeline */}
            <div className="space-y-3">
              {activeVehicle.routeStops.length === 0 ? (
                <div className="text-center py-12 text-slate-400 space-y-2">
                  <Truck className="w-10 h-10 mx-auto text-slate-600" />
                  <p className="font-semibold text-sm">No active route stops assigned.</p>
                  <p className="text-xs text-slate-500">Vehicle is stationed at Daraga Bus Station depot, ready for dispatch.</p>
                </div>
              ) : (
                activeVehicle.routeStops.map((stop, idx) => {
                  const riderObj = residents.find(r => r.id === stop.residentId);
                  const isCompleted = stop.status === 'completed';
                  const isCurrent = stop.status === 'pending' && (!activeVehicle.routeStops[idx - 1] || activeVehicle.routeStops[idx - 1].status === 'completed');

                  return (
                    <div
                      key={stop.id}
                      className={`p-4 rounded-xl border-2 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                        isCompleted
                          ? 'bg-slate-900/40 border-slate-800 opacity-60 text-slate-400'
                          : isCurrent
                          ? 'bg-amber-500/10 border-amber-400/80 text-white ring-1 ring-amber-400 shadow-lg'
                          : 'bg-slate-900/80 border-slate-700 text-slate-300'
                      }`}
                    >
                      <div className="flex items-start sm:items-center gap-3">
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-xs shrink-0 ${
                            isCompleted
                              ? 'bg-slate-700 text-slate-400'
                              : isCurrent
                              ? 'bg-amber-500 text-slate-950 animate-bounce'
                              : 'bg-slate-800 text-slate-300 border border-slate-600'
                          }`}
                        >
                          {idx + 1}
                        </div>

                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-extrabold text-sm sm:text-base text-white">
                              {stop.label}
                            </span>

                            {stop.type === 'pickup' && riderObj && (
                              <span
                                className={`text-[10px] px-2 py-0.5 rounded font-extrabold uppercase ${
                                  riderObj.need === 'wheelchair'
                                    ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                                    : riderObj.need === 'stretcher'
                                    ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                                    : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                }`}
                              >
                                Need: {riderObj.need.replace('_', ' ')}
                              </span>
                            )}

                            {stop.type === 'shelter_dropoff' && (
                              <span className="text-[10px] px-2 py-0.5 rounded font-extrabold uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                Safe Drop-off
                              </span>
                            )}
                          </div>

                          {riderObj && (
                            <div className="text-xs text-slate-400 mt-1 flex flex-wrap items-center gap-3">
                              <span>Age: <strong className="text-slate-200">{riderObj.age}</strong></span>
                              <span>Priority: <strong className="text-amber-400">{riderObj.priorityScore}</strong></span>
                              {riderObj.phone && (
                                <span className="flex items-center gap-1 text-slate-300">
                                  <Phone className="w-3 h-3 text-amber-400" /> {riderObj.phone}
                                </span>
                              )}
                              {riderObj.notes && (
                                <span className="text-slate-400 italic">&ldquo;{riderObj.notes}&rdquo;</span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                        <span
                          className={`text-xs font-bold uppercase ${
                            isCompleted
                              ? 'text-emerald-400 flex items-center gap-1'
                              : isCurrent
                              ? 'text-amber-400 font-extrabold'
                              : 'text-slate-500'
                          }`}
                        >
                          {isCompleted ? (
                            <>
                              <CheckCircle2 className="w-4 h-4" /> Completed
                            </>
                          ) : isCurrent ? (
                            'NEXT STOP'
                          ) : (
                            'Queued'
                          )}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Passenger Manifest */}
            {assignedRiders.length > 0 && (
              <div className="pt-4 border-t border-slate-700/80">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-amber-400" />
                  Rider Manifest for {activeVehicle.id}
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {assignedRiders.map(r => (
                    <div key={r.id} className="p-2.5 rounded-lg bg-slate-900 border border-slate-700 text-xs flex justify-between items-center">
                      <div>
                        <span className="font-bold text-slate-200 block">{r.name}</span>
                        <span className="text-[11px] text-slate-400">{r.barangay} &bull; {r.need}</span>
                      </div>
                      <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded ${
                        r.status === 'picked_up' ? 'bg-indigo-500/20 text-indigo-300' : 'bg-amber-500/20 text-amber-300'
                      }`}>
                        {r.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

import React, { useState } from 'react';
import { Vehicle, Resident, Shelter } from '../types';
import { Truck, Users, Accessibility, CheckCircle2, AlertOctagon, Navigation, Phone, MapPin } from 'lucide-react';

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
  const myVehicle = vehicles.find(v => v.id === 'BUS-01') || vehicles[0];
  const [actionLoading, setActionLoading] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const destinationShelter = shelters.find(s => s.id === myVehicle?.destinationShelterId);
  const nextStop = myVehicle?.routeStops.find(s => s.status === 'pending');

  const handleBusFull = async () => {
    if (!myVehicle) return;
    setActionLoading(true);
    setNotice(null);
    try {
      await onMarkBusFull(myVehicle.id);
      setNotice('Vehicle marked full. Next waiting riders have been notified of incoming relief shuttles.');
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
      setNotice('Route progress updated.');
    } finally {
      setActionLoading(false);
    }
  };

  if (!myVehicle) {
    return <div className="text-center p-8 text-slate-400">Loading driver console...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Driver Vehicle Status Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-amber-500/15 text-amber-400 flex items-center justify-center shrink-0">
            <Truck className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-white">{myVehicle.name}</h2>
              <span className="text-xs text-slate-400">·</span>
              <span className="text-xs font-semibold text-emerald-400">
                {myVehicle.status === 'full' ? 'At Capacity' : 'In Service'}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Assigned Driver: <strong className="text-slate-200">{myVehicle.driverName}</strong> · Destination: {destinationShelter?.name || 'Burgos Covered Court'}
            </p>
          </div>
        </div>

        {/* Capacity Overview */}
        <div className="flex items-center gap-6 bg-slate-950 px-5 py-3 rounded-xl border border-slate-800 w-full sm:w-auto justify-around">
          <div>
            <span className="text-[10px] text-slate-500 uppercase font-semibold block">Standard Seats</span>
            <span className="text-lg font-bold text-white font-mono">
              {myVehicle.seatsFree} <span className="text-xs text-slate-500">/ {myVehicle.seatsTotal}</span>
            </span>
          </div>
          <div className="w-px h-7 bg-slate-800" />
          <div>
            <span className="text-[10px] text-slate-500 uppercase font-semibold block">Wheelchair Spaces</span>
            <span className="text-lg font-bold text-amber-400 font-mono">
              {myVehicle.wheelchairFree} <span className="text-xs text-slate-500">/ {myVehicle.wheelchairSpaces}</span>
            </span>
          </div>
        </div>
      </div>

      {/* Primary Action Controls */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Next Stop Action */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between gap-3">
          <div>
            <span className="text-[11px] uppercase tracking-wide text-slate-500 font-semibold block">
              Current Route Objective
            </span>
            <h3 className="text-base font-bold text-white mt-1">
              {nextStop ? nextStop.label : 'All route stops completed'}
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              {nextStop
                ? nextStop.type === 'pickup'
                  ? 'Proceed to evacuee pickup location.'
                  : 'Proceed to shelter drop-off.'
                : 'Vehicle route completed. Awaiting new dispatch orders.'}
            </p>
          </div>

          {nextStop && (
            <button
              type="button"
              onClick={handleAdvance}
              disabled={actionLoading}
              className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{nextStop.type === 'pickup' ? 'Confirm Passenger Picked Up' : 'Complete Shelter Drop-Off'}</span>
            </button>
          )}
        </div>

        {/* Capacity Alert Action */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between gap-3">
          <div>
            <span className="text-[11px] uppercase tracking-wide text-slate-500 font-semibold block">
              Capacity Management
            </span>
            <h3 className="text-base font-bold text-white mt-1">
              Vehicle Capacity Limit
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              If no more passengers can safely board, broadcast full status to re-route remaining residents.
            </p>
          </div>

          <button
            type="button"
            onClick={handleBusFull}
            disabled={actionLoading || myVehicle.status === 'full'}
            className={`w-full py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md disabled:opacity-50 ${
              myVehicle.status === 'full'
                ? 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
                : 'bg-red-600 hover:bg-red-500 text-white'
            }`}
          >
            <AlertOctagon className="w-4 h-4" />
            <span>{myVehicle.status === 'full' ? 'Vehicle Marked Full' : 'Report Bus Full'}</span>
          </button>
        </div>
      </div>

      {notice && (
        <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs font-medium">
          {notice}
        </div>
      )}

      {/* Stop Sequence List */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
        <div className="border-b border-slate-800 pb-3 flex justify-between items-center">
          <div>
            <h3 className="text-base font-bold text-white">Route Stops Sequence</h3>
            <p className="text-xs text-slate-400">Dijkstra shortest-path evacuation sequence</p>
          </div>
          <span className="text-xs text-slate-400 font-mono">
            {myVehicle.routeStops.filter(s => s.status === 'completed').length} / {myVehicle.routeStops.length} Completed
          </span>
        </div>

        <div className="space-y-2.5">
          {myVehicle.routeStops.map((stop, idx) => {
            const riderObj = residents.find(r => r.id === stop.residentId);
            const isCompleted = stop.status === 'completed';
            const isCurrent = stop.status === 'pending' && (!myVehicle.routeStops[idx - 1] || myVehicle.routeStops[idx - 1].status === 'completed');

            return (
              <div
                key={stop.id}
                className={`p-3.5 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                  isCompleted
                    ? 'bg-slate-950/40 border-slate-800/60 opacity-60 text-slate-400'
                    : isCurrent
                    ? 'bg-amber-500/10 border-amber-500/40 text-white ring-1 ring-amber-500/30'
                    : 'bg-slate-950 border-slate-800 text-slate-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                    isCompleted ? 'bg-slate-800 text-slate-400' : isCurrent ? 'bg-amber-400 text-slate-950' : 'bg-slate-800 text-slate-400'
                  }`}>
                    {idx + 1}
                  </span>

                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-white">{stop.label}</span>
                      {riderObj && (
                        <span className="text-xs text-amber-300 font-medium">
                          ({riderObj.need === 'wheelchair' ? 'Wheelchair' : riderObj.need === 'cane_help' ? 'Walking Support' : 'Senior'})
                        </span>
                      )}
                    </div>
                    {riderObj && (
                      <div className="text-xs text-slate-400 flex items-center gap-3 mt-0.5">
                        <span>Age {riderObj.age}</span>
                        <span>·</span>
                        <span>{riderObj.phone}</span>
                      </div>
                    )}
                  </div>
                </div>

                <span className={`text-xs font-semibold ${
                  isCompleted ? 'text-emerald-400' : isCurrent ? 'text-amber-400' : 'text-slate-500'
                }`}>
                  {isCompleted ? 'Completed' : isCurrent ? 'Next Stop' : 'Upcoming'}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

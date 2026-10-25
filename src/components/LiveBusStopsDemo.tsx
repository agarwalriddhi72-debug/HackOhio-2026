import React, { useState, useEffect, useRef } from 'react';
import { Vehicle, Shelter, Resident } from '../types';
import { Play, Pause, RotateCcw, FastForward, CheckCircle2, AlertOctagon, Users, ShieldAlert, ArrowRight, MapPin } from 'lucide-react';
import { playChime, triggerVibration, speakDisasterAlert } from './NotificationCenter';

interface Props {
  vehicles: Vehicle[];
  shelters: Shelter[];
  onUpdateVehiclePosition: (vehicleId: string, coords: [number, number]) => void;
  onVehicleStopStatusChange?: (isStopped: boolean, label?: string) => void;
  onAdvanceResidentStatus?: (residentName: string, status: 'picked_up' | 'delivered') => void;
}

interface StopInfo {
  id: number;
  barangay: string;
  coords: [number, number]; // [lon, lat]
  passengerName: string;
  passengerAge: number;
  needType: string;
  needIcon: string;
  actionText: string;
  tagalogText: string;
}

const DEMO_STOPS: StopInfo[] = [
  {
    id: 1,
    barangay: 'Barangay Bañag',
    coords: [123.7142, 13.1530],
    passengerName: 'Nanay Beatriz Magallanes',
    passengerAge: 86,
    needType: 'Wheelchair Ramp',
    needIcon: '♿',
    actionText: 'Lowering hydraulic wheelchair ramp. Nanay Beatriz safely assisted aboard.',
    tagalogText: 'Nakatigil sa Barangay Bañag: Ibinababa ang wheelchair ramp para kay Nanay Beatriz.',
  },
  {
    id: 2,
    barangay: 'Barangay Tagas',
    coords: [123.6925, 13.1382],
    passengerName: 'Lola Remedios Alcantara',
    passengerAge: 81,
    needType: 'Walking Cane Support',
    needIcon: '🦯',
    actionText: 'Low-floor step engaged. Lola Remedios assisted to front priority seating.',
    tagalogText: 'Nakatigil sa Barangay Tagas: Inaalalayan si Lola Remedios papasok sa bus.',
  },
  {
    id: 3,
    barangay: 'Barangay Kimantong',
    coords: [123.7051, 13.1495],
    passengerName: 'Tatay Rolando Santos',
    passengerAge: 72,
    needType: 'Senior Mobility',
    needIcon: '👵',
    actionText: 'Tatay Rolando boarded safely. All 3 priority evacuees secured on BUS-01.',
    tagalogText: 'Nakatigil sa Barangay Kimantong: Nakasakay na si Tatay Rolando. Kumpleto na ang sakay.',
  },
];

const SHELTER_STOP = {
  name: 'Burgos Covered Court',
  coords: [123.6950, 13.1420] as [number, number],
  actionText: 'Arrived at Burgos Covered Court! Escorting all 3 seniors into high-ground evacuation center.',
  tagalogText: 'Ligtas na nakarating sa Burgos Covered Court! Nakapasok na sa ligtas na evacuation center ang mga lolo at lola.',
};

// Interpolates points between two coordinates
function interpolatePoints(start: [number, number], end: [number, number], steps: number): [number, number][] {
  const points: [number, number][] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const lon = start[0] + (end[0] - start[0]) * t;
    const lat = start[1] + (end[1] - start[1]) * t;
    points.push([lon, lat]);
  }
  return points;
}

export const LiveBusStopsDemo: React.FC<Props> = ({
  vehicles,
  shelters,
  onUpdateVehiclePosition,
  onVehicleStopStatusChange,
  onAdvanceResidentStatus,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentStopIndex, setCurrentStopIndex] = useState<number>(-1); // -1 = at depot, 0 = stop 1, 1 = stop 2, 2 = stop 3, 3 = at shelter
  const [passengersBoarded, setPassengersBoarded] = useState<string[]>([]);
  const [isStoppedAtStation, setIsStoppedAtStation] = useState(false);
  const [stopCountdown, setStopCountdown] = useState<number>(0);
  const [statusMessage, setStatusMessage] = useState<string>(
    'Pindutin ang "Simulan ang Demo" para makita ang paghinto at pagsundo ng bus sa mga lolo at lola.'
  );
  const [speedMultiplier, setSpeedMultiplier] = useState<number>(1);

  const timerRef = useRef<any>(null);
  const isPlayingRef = useRef(false);
  isPlayingRef.current = isPlaying;

  const targetVehicle = vehicles.find(v => v.id === 'BUS-01') || vehicles[0];
  const vehicleId = targetVehicle ? targetVehicle.id : 'BUS-01';

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  // Run the full sequence or advance to next stop
  const startDemo = async () => {
    if (isPlaying) {
      // Pause
      if (timerRef.current) clearInterval(timerRef.current);
      setIsPlaying(false);
      setIsStoppedAtStation(false);
      if (onVehicleStopStatusChange) onVehicleStopStatusChange(false);
      setStatusMessage('Naka-pause ang simulation ng bus.');
      return;
    }

    setIsPlaying(true);
    triggerVibration([100, 50, 100]);
    playChime('info');

    // Starting depot coordinate: Daraga Central Town
    let currentCoords: [number, number] = [123.708, 13.148];
    onUpdateVehiclePosition(vehicleId, currentCoords);

    // Loop through all 3 stops + shelter
    for (let sIdx = 0; sIdx < DEMO_STOPS.length; sIdx++) {
      const stop = DEMO_STOPS[sIdx];
      setCurrentStopIndex(sIdx);
      setStatusMessage(`🚌 Papunta si Kuya Ramon sa Stop ${sIdx + 1}: ${stop.barangay} para sunduin si ${stop.passengerName}...`);

      // Animate driving from currentCoords to stop.coords
      const waypoints = interpolatePoints(currentCoords, stop.coords, 10);
      for (const pt of waypoints) {
        if (!isPlayingRef.current) return;
        onUpdateVehiclePosition(vehicleId, pt);
        await sleep(220 / speedMultiplier);
      }
      currentCoords = stop.coords;
      onUpdateVehiclePosition(vehicleId, currentCoords);

      // --- BUS ACTUALLY STOPS HERE ---
      setIsStoppedAtStation(true);
      const stopLabel = `🛑 STOP ${sIdx + 1}: ${stop.barangay} — ${stop.needIcon} ${stop.actionText}`;
      if (onVehicleStopStatusChange) {
        onVehicleStopStatusChange(true, stopLabel);
      }
      setStatusMessage(stopLabel);
      playChime('info');
      triggerVibration([150, 80, 150]);

      // Speak in Tagalog
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utter = new SpeechSynthesisUtterance(stop.tagalogText);
        utter.rate = 0.9;
        window.speechSynthesis.speak(utter);
      }

      // Boarding Countdown (3 seconds)
      for (let cd = 3; cd >= 1; cd--) {
        if (!isPlayingRef.current) return;
        setStopCountdown(cd);
        await sleep(1000 / speedMultiplier);
      }

      // Board passenger
      setPassengersBoarded(prev => Array.from(new Set([...prev, stop.passengerName])));
      if (onAdvanceResidentStatus) {
        onAdvanceResidentStatus(stop.passengerName, 'picked_up');
      }

      setIsStoppedAtStation(false);
      setStopCountdown(0);
      if (onVehicleStopStatusChange) {
        onVehicleStopStatusChange(false);
      }
      setStatusMessage(`✅ Nakasakay na si ${stop.passengerName} (${stop.needType}). Patuloy sa ruta...`);
      await sleep(600 / speedMultiplier);
    }

    // --- TRANSIT TO FINAL SHELTER ---
    setCurrentStopIndex(3);
    setStatusMessage(`🚌 Kumpleto na ang 3 pasahero! Biyaheng ${SHELTER_STOP.name} (Evacuation Center)...`);

    const shelterWaypoints = interpolatePoints(currentCoords, SHELTER_STOP.coords, 12);
    for (const pt of shelterWaypoints) {
      if (!isPlayingRef.current) return;
      onUpdateVehiclePosition(vehicleId, pt);
      await sleep(220 / speedMultiplier);
    }
    onUpdateVehiclePosition(vehicleId, SHELTER_STOP.coords);

    // --- ARRIVED AT SHELTER ---
    setIsStoppedAtStation(true);
    const shelterArrivalLabel = `🎉 DUMATING SA SHELTER: ${SHELTER_STOP.name} — Ligtas na inihatid ang 3 lolo at lola!`;
    if (onVehicleStopStatusChange) {
      onVehicleStopStatusChange(true, shelterArrivalLabel);
    }
    setStatusMessage(shelterArrivalLabel);
    playChime('success');
    triggerVibration([300, 100, 300, 100, 500]);

    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance(SHELTER_STOP.tagalogText);
      utter.rate = 0.9;
      window.speechSynthesis.speak(utter);
    }

    if (onAdvanceResidentStatus) {
      DEMO_STOPS.forEach(s => onAdvanceResidentStatus(s.passengerName, 'delivered'));
    }

    await sleep(4000);
    setIsStoppedAtStation(false);
    setIsPlaying(false);
    if (onVehicleStopStatusChange) onVehicleStopStatusChange(false);
    setStatusMessage('🏆 Natapos nang matagumpay ang evacuation route demo!');
  };

  const handleReset = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setIsPlaying(false);
    setIsStoppedAtStation(false);
    if (onVehicleStopStatusChange) onVehicleStopStatusChange(false);
    setCurrentStopIndex(-1);
    setPassengersBoarded([]);
    setStopCountdown(0);
    // Reset to initial depot
    onUpdateVehiclePosition(vehicleId, [123.708, 13.148]);
    setStatusMessage('Naka-reset ang ruta. Handa nang simulan muli.');
  };

  return (
    <div className="bg-slate-900 border-2 border-amber-500/60 rounded-3xl p-4 sm:p-5 space-y-3.5 shadow-xl">
      {/* Top Header & Simulation Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
            <h3 className="text-sm sm:text-base font-black text-white">
              Live Map Demo: Pagsundo sa mga Seniors (Bus Stops)
            </h3>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Panoorin ang BUS-01 (Kuya Ramon) na humihinto sa mga barangay at nagpapasakay ng mga PWD
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={startDemo}
            className={`px-4 py-2 rounded-xl text-xs font-black uppercase flex items-center gap-2 cursor-pointer transition-all shadow-md active:scale-95 ${
              isPlaying
                ? 'bg-amber-500 text-slate-950 hover:bg-amber-400'
                : 'bg-emerald-600 text-white hover:bg-emerald-500'
            }`}
          >
            {isPlaying ? (
              <>
                <Pause className="w-4 h-4" />
                <span>I-pause</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-white" />
                <span>Simulan ang Demo</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleReset}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 cursor-pointer transition-colors"
            title="I-reset ang bus sa simula"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          {/* Speed Toggle */}
          <button
            type="button"
            onClick={() => setSpeedMultiplier(speedMultiplier === 1 ? 2 : 1)}
            className="text-[11px] font-mono px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 font-bold cursor-pointer"
            title="Bilis ng simulation"
          >
            {speedMultiplier}x Speed
          </button>
        </div>
      </div>

      {/* Real-time Status Card & Countdown Banner */}
      <div
        className={`p-3.5 rounded-2xl border text-xs flex items-center justify-between gap-3 transition-all ${
          isStoppedAtStation
            ? 'bg-red-950/60 border-red-500/80 text-red-100 shadow-md ring-2 ring-red-500/40 animate-pulse'
            : isPlaying
            ? 'bg-amber-950/30 border-amber-500/50 text-amber-100'
            : 'bg-slate-950 border-slate-800 text-slate-300'
        }`}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          {isStoppedAtStation ? (
            <AlertOctagon className="w-5 h-5 text-red-400 shrink-0" />
          ) : (
            <MapPin className="w-4 h-4 text-amber-400 shrink-0" />
          )}
          <span className="font-bold truncate text-xs sm:text-sm">{statusMessage}</span>
        </div>

        {isStoppedAtStation && stopCountdown > 0 && (
          <div className="bg-red-600 text-white font-mono font-black text-xs px-2.5 py-1 rounded-lg shrink-0">
            {stopCountdown}s Boarding
          </div>
        )}
      </div>

      {/* Visual Sequence of Stops on the Map */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
        {DEMO_STOPS.map((stop, idx) => {
          const isDone = passengersBoarded.includes(stop.passengerName);
          const isCurrent = currentStopIndex === idx;

          return (
            <div
              key={stop.id}
              className={`p-2.5 rounded-2xl border transition-all ${
                isCurrent && isStoppedAtStation
                  ? 'bg-red-950/50 border-red-500 ring-2 ring-red-500/40 text-white'
                  : isDone
                  ? 'bg-emerald-950/40 border-emerald-500/60 text-emerald-200'
                  : isCurrent
                  ? 'bg-amber-950/30 border-amber-500/60 text-amber-200'
                  : 'bg-slate-950/60 border-slate-800 text-slate-400'
              }`}
            >
              <div className="flex items-center justify-between font-bold mb-1">
                <span className="text-[10px] uppercase">Stop {idx + 1}</span>
                <span>{stop.needIcon}</span>
              </div>
              <div className="font-extrabold text-white text-xs truncate">{stop.barangay}</div>
              <div className="text-[10px] text-slate-300 truncate mt-0.5">{stop.passengerName.split(' ')[0]} {stop.passengerName.split(' ')[1]}</div>
              <div className="mt-1 text-[9px] font-bold">
                {isDone ? (
                  <span className="text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="w-2.5 h-2.5" /> Nakasakay Na
                  </span>
                ) : isCurrent && isStoppedAtStation ? (
                  <span className="text-red-400 font-black">NAKATIGIL (Sakay)</span>
                ) : isCurrent ? (
                  <span className="text-amber-400">Paparating...</span>
                ) : (
                  <span className="text-slate-500">Naka-schedule</span>
                )}
              </div>
            </div>
          );
        })}

        {/* Shelter Dropoff Box */}
        <div
          className={`p-2.5 rounded-2xl border transition-all ${
            currentStopIndex === 3 && isStoppedAtStation
              ? 'bg-emerald-950/60 border-emerald-400 ring-2 ring-emerald-500 text-white'
              : passengersBoarded.length === 3 && currentStopIndex === 3
              ? 'bg-emerald-950/40 border-emerald-500/60 text-emerald-200'
              : 'bg-slate-950/60 border-slate-800 text-slate-400'
          }`}
        >
          <div className="flex items-center justify-between font-bold mb-1">
            <span className="text-[10px] uppercase">Destination</span>
            <span>🏠</span>
          </div>
          <div className="font-extrabold text-white text-xs truncate">Burgos Court</div>
          <div className="text-[10px] text-slate-300 truncate mt-0.5">High Ground Shelter</div>
          <div className="mt-1 text-[9px] font-bold">
            {currentStopIndex === 3 ? (
              <span className="text-emerald-400 font-bold">Ligtas na Nakababa</span>
            ) : (
              <span className="text-slate-500">Destinasyon</span>
            )}
          </div>
        </div>
      </div>

      {/* Passengers On Board Summary Bar */}
      <div className="flex items-center justify-between text-xs bg-slate-950 p-3 rounded-2xl border border-slate-800/80">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-amber-400" />
          <span className="font-semibold text-slate-300">Nakasakay sa BUS-01:</span>
          <span className="font-mono font-bold text-amber-400">
            {passengersBoarded.length} / 20 pasahero
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
          <span>Driver: <strong className="text-white">Kuya Ramon</strong></span>
        </div>
      </div>
    </div>
  );
};

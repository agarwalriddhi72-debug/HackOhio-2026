import React, { useState, useEffect, useRef } from 'react';
import { TestCaseScenario, Resident, Vehicle } from '../types';
import { Play, Pause, RotateCcw, Sparkles, Calendar, User, Truck, CheckCircle2, AlertTriangle, ArrowRight, Gauge, Clock, ShieldAlert } from 'lucide-react';

interface Props {
  scenarios: TestCaseScenario[];
  activeScenarioId: string;
  onSelectScenario: (scenarioId: string) => Promise<void>;
  onRunLiveDemoSimulation: (customPerson: any) => Promise<{ vehicle: Vehicle; demoRider: Resident }>;
  onUpdateVehiclePosition: (vehicleId: string, coords: [number, number]) => void;
  onAdvanceStop: (vehicleId: string) => Promise<void>;
  onMarkBusFull: (vehicleId: string) => Promise<void>;
  onToggleShelterFull: (shelterId: number) => Promise<void>;
  onResetApp: () => Promise<void>;
  onSwitchToMap: () => void;
  onVehicleStopStatusChange?: (isStopped: boolean, label?: string) => void;
}

const RANDOM_PERSONS = [
  { name: 'Nanay Beatriz Magallanes', age: 86, phone: '0919-888-2341', need: 'wheelchair', barangay: 'Barangay Bañag', notes: 'Severe flood riverbank hazard' },
  { name: 'Tatay Rolando Santos', age: 72, phone: '0928-555-4312', need: 'wheelchair', barangay: 'Barangay Kimantong', notes: 'Needs ramp transport' },
  { name: 'Lola Remedios Alcantara', age: 81, phone: '0917-555-8921', need: 'cane_help', barangay: 'Barangay Tagas', notes: 'Severe arthritis, walking cane' },
  { name: 'Lolo Crisanto Pardo', age: 74, phone: '0949-555-1289', need: 'elderly_general', barangay: 'Barangay Malabog', notes: 'General elderly evacuee (60+)' },
];

export const LiveDemoController: React.FC<Props> = ({
  scenarios,
  activeScenarioId,
  onSelectScenario,
  onRunLiveDemoSimulation,
  onUpdateVehiclePosition,
  onAdvanceStop,
  onMarkBusFull,
  onToggleShelterFull,
  onResetApp,
  onSwitchToMap,
  onVehicleStopStatusChange,
}) => {
  const [selectedScenario, setSelectedScenario] = useState(activeScenarioId || 'typhoon_warning');
  const [personName, setPersonName] = useState(RANDOM_PERSONS[0].name);
  const [personAge, setPersonAge] = useState(RANDOM_PERSONS[0].age);
  const [personNeed, setPersonNeed] = useState(RANDOM_PERSONS[0].need);
  const [personBarangay, setPersonBarangay] = useState(RANDOM_PERSONS[0].barangay);

  // Simulation playback state
  const [isPlaying, setIsPlaying] = useState(false);
  const [isStoppedAtStation, setIsStoppedAtStation] = useState(false);
  const [stopCountdown, setStopCountdown] = useState<number>(0);
  const [simulationStatus, setSimulationStatus] = useState<string>(
    'Ready. Click "Start Live Demo" to watch autonomous bus evacuation with realistic stops.'
  );
  const [speedMultiplier, setSpeedMultiplier] = useState<number>(1); // 0.5x, 1x, 2x
  const [phase, setPhase] = useState<number>(0);

  const animTimerRef = useRef<any>(null);
  const stopTimeoutRef = useRef<any>(null);

  // Roll Random Person
  const handleRollPerson = () => {
    const pick = RANDOM_PERSONS[Math.floor(Math.random() * RANDOM_PERSONS.length)];
    setPersonName(pick.name);
    setPersonAge(pick.age);
    setPersonNeed(pick.need);
    setPersonBarangay(pick.barangay);
  };

  // Helper delay
  const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  // Start Autonomous Live Demo with REALISTIC STOPS
  const handleStartLiveDemo = async () => {
    if (isPlaying) {
      if (animTimerRef.current) clearInterval(animTimerRef.current);
      if (stopTimeoutRef.current) clearTimeout(stopTimeoutRef.current);
      setIsPlaying(false);
      setIsStoppedAtStation(false);
      if (onVehicleStopStatusChange) onVehicleStopStatusChange(false);
      setSimulationStatus('Simulation paused.');
      return;
    }

    setIsPlaying(true);
    setPhase(1);
    onSwitchToMap();

    setSimulationStatus(`[1/5] Activating ${selectedScenario} from testCases.py. Generating Dijkstra shortest path...`);

    const personData = {
      name: personName,
      age: personAge,
      need: personNeed,
      barangay: personBarangay,
      notes: `${personName} (${personAge}yo) &bull; Urgent evacuation demo`,
    };

    const result = await onRunLiveDemoSimulation(personData);
    const vehicle = result.vehicle;
    const polyline = vehicle.routePolyline;

    if (!polyline || polyline.length === 0) {
      setSimulationStatus('Route line ready. Bus starting journey.');
    }

    // Let user see initial route line on map
    await sleep(800);

    let currentIndex = 0;
    const totalPoints = polyline.length > 0 ? polyline.length : 30;
    const pickupIndex = Math.floor(totalPoints * 0.42);

    setPhase(2);
    setSimulationStatus(`[2/5] 🚌 Bus ${vehicle.id} is EN ROUTE along Daraga road network to pick up ${personName}...`);

    // Slower, realistic tick rate: 380ms per road segment at 1x speed
    const baseInterval = 380;
    const intervalMs = Math.max(120, Math.floor(baseInterval / speedMultiplier));

    let isPausedForStop = false;

    animTimerRef.current = setInterval(async () => {
      if (isPausedForStop) return;

      currentIndex++;

      if (polyline.length > 0 && currentIndex < polyline.length) {
        const coords = polyline[currentIndex];
        onUpdateVehiclePosition(vehicle.id, coords);
      }

      // --- STOP 1: ACTUAL STOP AT RIDER'S HOME ---
      if (currentIndex === pickupIndex && !isPausedForStop) {
        isPausedForStop = true;
        setIsStoppedAtStation(true);
        setPhase(3);
        setStopCountdown(4);

        if (onVehicleStopStatusChange) {
          onVehicleStopStatusChange(true, `🛑 VEHICLE STOPPED at ${personBarangay} — Lowering Wheelchair Ramp for ${personName}`);
        }

        setSimulationStatus(`[3/5] 🛑 BUS STOPPED at ${personBarangay}: Lowering hydraulic wheelchair ramp for ${personName}...`);

        // Real countdown timer for the stop
        for (let cd = 4; cd >= 1; cd--) {
          setStopCountdown(cd);
          await sleep(1000 / speedMultiplier);
        }

        // Complete the pickup
        await onAdvanceStop(vehicle.id);
        setIsStoppedAtStation(false);
        setStopCountdown(0);
        if (onVehicleStopStatusChange) onVehicleStopStatusChange(false);
        isPausedForStop = false;

        setSimulationStatus(`[4/5] 🚌 RAMP RETRACTED: ${personName} safely on board. Bus resuming transit towards evacuation shelter.`);
      }

      // Mid-journey reroute event
      if (currentIndex === pickupIndex + 4) {
        setSimulationStatus(`[4/5] ⚠️ Burgos Covered Court reached capacity! Router recalculating path to Daraga High School...`);
        await onToggleShelterFull(1);
      }

      // --- STOP 2: ACTUAL STOP AT EVACUATION SHELTER ---
      if (currentIndex >= totalPoints - 1) {
        clearInterval(animTimerRef.current);
        animTimerRef.current = null;
        isPausedForStop = true;
        setIsStoppedAtStation(true);
        setPhase(5);
        setStopCountdown(3);

        if (onVehicleStopStatusChange) {
          onVehicleStopStatusChange(true, `🛑 VEHICLE STOPPED AT SHELTER — Safe Arrival & Disembarkation`);
        }

        setSimulationStatus(`[5/5] 🛑 BUS STOPPED AT SHELTER: Arrived safely at Evacuation Center. Disembarking evacuees...`);

        for (let cd = 3; cd >= 1; cd--) {
          setStopCountdown(cd);
          await sleep(1000 / speedMultiplier);
        }

        await onAdvanceStop(vehicle.id);
        setIsStoppedAtStation(false);
        setIsPlaying(false);
        if (onVehicleStopStatusChange) onVehicleStopStatusChange(false);
        setSimulationStatus(`[5/5] 🎉 SAFE EVACUATION COMPLETED! ${personName} safely delivered to shelter.`);
      }
    }, intervalMs);
  };

  const handleReset = async () => {
    if (animTimerRef.current) clearInterval(animTimerRef.current);
    if (stopTimeoutRef.current) clearTimeout(stopTimeoutRef.current);
    setIsPlaying(false);
    setIsStoppedAtStation(false);
    if (onVehicleStopStatusChange) onVehicleStopStatusChange(false);
    setStopCountdown(0);
    setPhase(0);
    setSimulationStatus('Resetting all buses, riders, and shelters to clean default state...');
    await onResetApp();
    setSimulationStatus('System reset. Ready to run live demo.');
  };

  useEffect(() => {
    return () => {
      if (animTimerRef.current) clearInterval(animTimerRef.current);
      if (stopTimeoutRef.current) clearTimeout(stopTimeoutRef.current);
    };
  }, []);

  return (
    <div className="bg-slate-900 border-2 border-amber-500/80 rounded-3xl p-5 sm:p-7 shadow-2xl space-y-5">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-red-500 animate-ping" />
            <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              LIVE AUTONOMOUS DEMO (Realistic Speed &amp; Physical Stops)
            </h3>
          </div>
          <p className="text-xs sm:text-sm text-slate-300 mt-0.5">
            The bus physically travels along the road network and actually stops at the house to board the rider with a ramp before driving to the shelter.
          </p>
        </div>

        {/* Speed Multipliers */}
        <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 px-3 py-1.5 rounded-2xl">
          <Gauge className="w-4 h-4 text-amber-400" />
          <span className="text-xs font-bold text-slate-400 mr-1">Speed:</span>
          {[
            { val: 0.5, label: '0.5x (Slow/Realistic)' },
            { val: 1, label: '1x (Normal)' },
            { val: 2, label: '2x (Brisk)' },
          ].map(s => (
            <button
              key={s.val}
              onClick={() => setSpeedMultiplier(s.val)}
              className={`px-2.5 py-1 rounded-xl text-xs font-bold cursor-pointer transition-colors ${
                speedMultiplier === s.val
                  ? 'bg-amber-500 text-slate-950 font-black'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Grid: Scenario Date Selector + Random Person Input */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Column: testCases.py Test Date Selector */}
        <div className="lg:col-span-6 bg-slate-950 border border-slate-800 p-4 rounded-2xl space-y-3">
          <div className="flex justify-between items-center">
            <label className="text-xs font-black uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
              <Calendar className="w-4 h-4" />
              1. Choose Test Date (from testCases.py)
            </label>
            <span className="text-[10px] text-slate-500 font-mono">future1.py Model</span>
          </div>

          <div className="space-y-2">
            {scenarios.map(sc => (
              <button
                key={sc.id}
                onClick={async () => {
                  setSelectedScenario(sc.id);
                  await onSelectScenario(sc.id);
                }}
                className={`w-full p-2.5 rounded-xl border text-left transition-all cursor-pointer flex justify-between items-center text-xs ${
                  selectedScenario === sc.id
                    ? 'border-amber-400 bg-amber-500/20 text-white font-bold ring-1 ring-amber-400'
                    : 'border-slate-800 bg-slate-900/60 text-slate-300 hover:border-slate-700'
                }`}
              >
                <div>
                  <div className="font-extrabold text-white">{sc.name}</div>
                  <div className="text-[11px] text-slate-400">{sc.hazard} &bull; {sc.description}</div>
                </div>
                <span className="font-mono text-[11px] text-amber-400 shrink-0 ml-2">
                  {sc.date}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Right Column: Person Info Input */}
        <div className="lg:col-span-6 bg-slate-950 border border-slate-800 p-4 rounded-2xl space-y-3">
          <div className="flex justify-between items-center">
            <label className="text-xs font-black uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
              <User className="w-4 h-4" />
              2. Evacuee Person Details (Type or Randomize)
            </label>

            <button
              onClick={handleRollPerson}
              className="px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Roll Random Person
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <label className="text-[11px] font-bold text-slate-400 block mb-1">Name:</label>
              <input
                type="text"
                value={personName}
                onChange={e => setPersonName(e.target.value)}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white font-bold"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-400 block mb-1">Age:</label>
              <input
                type="number"
                value={personAge}
                onChange={e => setPersonAge(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white font-bold"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-400 block mb-1">Special Need:</label>
              <select
                value={personNeed}
                onChange={e => setPersonNeed(e.target.value)}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white font-bold cursor-pointer"
              >
                <option value="wheelchair">Wheelchair User (Needs Ramp)</option>
                <option value="cane_help">Walking Cane / Step Assistance</option>
                <option value="stretcher">Bed-Bound / Stretcher</option>
                <option value="elderly_general">General Evacuee (60+)</option>
              </select>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-400 block mb-1">Barangay:</label>
              <input
                type="text"
                value={personBarangay}
                onChange={e => setPersonBarangay(e.target.value)}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white font-bold"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Main Execution Controls & Live Status Ticker */}
      <div className="bg-slate-950 p-4 sm:p-5 rounded-2xl border border-slate-800 space-y-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-amber-400 block">
                Live AI Router Ticker
              </span>
              {isStoppedAtStation && (
                <span className="px-2 py-0.5 rounded-full bg-red-600 text-white font-black text-[10px] animate-pulse flex items-center gap-1">
                  🛑 BUS STOPPED ({stopCountdown}s)
                </span>
              )}
            </div>
            <div className="text-sm sm:text-base font-extrabold text-white mt-0.5 leading-snug">
              {simulationStatus}
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0 w-full sm:w-auto justify-end">
            <button
              onClick={handleReset}
              className="px-4 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Reset</span>
            </button>

            <button
              onClick={handleStartLiveDemo}
              className={`px-6 py-4 rounded-2xl font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-xl transition-all cursor-pointer ${
                isPlaying
                  ? 'bg-amber-600 hover:bg-amber-500 text-white ring-2 ring-amber-400'
                  : 'bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-slate-950 shadow-emerald-500/20 active:scale-95'
              }`}
            >
              {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 fill-current" />}
              <span>{isPlaying ? 'PAUSE DEMO' : 'START LIVE AUTONOMOUS DEMO'}</span>
            </button>
          </div>
        </div>

        {/* Phase Progress Indicator */}
        <div className="grid grid-cols-5 gap-1.5 pt-2">
          {[
            '1. Hazard Alert',
            '2. Bus Driving',
            '3. STOP: House Boarding',
            '4. In Transit',
            '5. STOP: Safe Shelter',
          ].map((title, i) => (
            <div key={i} className="space-y-1">
              <div
                className={`h-2 rounded-full transition-all duration-300 ${
                  phase > i ? 'bg-emerald-500' : phase === i ? 'bg-amber-400 animate-pulse' : 'bg-slate-800'
                }`}
              />
              <span className="text-[10px] font-bold text-slate-400 block truncate text-center">
                {title}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

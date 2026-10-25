import React, { useState } from 'react';
import { Resident, Vehicle, Shelter, WeatherState, AppNotification } from '../types';
import {
  Sparkles,
  Play,
  RotateCcw,
  CheckCircle2,
  Users,
  Truck,
  Home,
  Volume2,
  PhoneCall,
  ArrowRight,
  ShieldAlert,
  AlertTriangle,
  Clock,
  Compass,
  Package,
  Layers,
} from 'lucide-react';
import { playChime, triggerVibration, speakDisasterAlert } from './NotificationCenter';

export type UserRoleType = 'rider' | 'driver' | 'shelter';

interface Props {
  role: UserRoleType;
  userName: string;
  residents: Resident[];
  vehicles: Vehicle[];
  shelters: Shelter[];
  weather: WeatherState | null;
  onAdvanceStop: (vehicleId: string) => Promise<void>;
  onMarkBusFull: (vehicleId: string) => Promise<void>;
  onToggleShelterFull: (shelterId: number) => Promise<void>;
  onToggleWheelchair: (shelterId: number) => Promise<void>;
  onDispatchNotification: (notif: {
    type: AppNotification['type'];
    title: string;
    message: string;
    tagalog?: string;
    recipient: 'all' | 'rider' | 'driver' | 'shelter';
  }) => void;
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
  onSwitchToDashboardTab: () => void;
  onSwitchToMapTab: () => void;
}

export const PhoneRoleDemoSection: React.FC<Props> = ({
  role,
  userName,
  residents,
  vehicles,
  shelters,
  weather,
  onAdvanceStop,
  onMarkBusFull,
  onToggleShelterFull,
  onToggleWheelchair,
  onDispatchNotification,
  onSubmitRiderRequest,
  onSwitchToDashboardTab,
  onSwitchToMapTab,
}) => {
  const [demoActionFeedback, setDemoActionFeedback] = useState<string | null>(null);
  const [simulatedEta, setSimulatedEta] = useState<number | null>(null);
  const [simulatedBoarded, setSimulatedBoarded] = useState<boolean>(false);
  const [simulatedIntakeCount, setSimulatedIntakeCount] = useState<number>(0);
  const [isRunningAction, setIsRunningAction] = useState<boolean>(false);

  // Set brief feedback helper
  const showFeedback = (msg: string) => {
    setDemoActionFeedback(msg);
    setTimeout(() => setDemoActionFeedback(null), 4500);
  };

  // Primary vehicle for driver/rider demo
  const primaryVehicle = vehicles.find(v => v.id === 'BUS-01') || vehicles[0];
  const primaryShelter = shelters.find(s => s.id === 1) || shelters[0];

  // ==========================================
  // RIDER DEMO ACTIONS
  // ==========================================
  const handleRiderDemoRequest = async () => {
    setIsRunningAction(true);
    triggerVibration([100, 50, 100]);
    playChime('info');

    try {
      await onSubmitRiderRequest({
        name: userName || 'Lola Remedios Alcantara',
        phone: '0917-555-8921',
        age: 81,
        need: 'wheelchair',
        barangay: 'Barangay Bañag',
        notes: 'Urgent demo evacuation request: Needs hydraulic ramp assistance.',
        lon: 123.684,
        lat: 13.155,
      });

      onDispatchNotification({
        type: 'driver_assigned',
        title: 'Shuttle Dispatched: BUS-01',
        message: 'Accessible bus assigned to Lola Remedios in Barangay Bañag. ETA: 4 minutes.',
        tagalog: 'Paparating na ang accessible bus para sa iyo. Maghanda sa itinakdang pickup point.',
        recipient: 'rider',
      });

      setSimulatedEta(4);
      showFeedback('✅ Demo Request Sent! Assigned to Kuya Ramon (BUS-01). Audio chime triggered.');
    } catch {
      showFeedback('Simulation request processed successfully.');
    } finally {
      setIsRunningAction(false);
    }
  };

  const handleRiderDemoSimulateArrival = () => {
    setIsRunningAction(true);
    triggerVibration([200, 100, 200]);
    playChime('success');
    setSimulatedEta(1);

    speakDisasterAlert(
      'Your accessible rescue bus has arrived at Barangay Bañag.',
      'Nandito na ang libreng sundo bus sa Barangay Bañag. Mag-ingat sa pagsakay.'
    );

    showFeedback('🚌 Bus Approaching! ETA dropped to 1 minute. Tagalog audio alert announced.');
    setTimeout(() => setIsRunningAction(false), 500);
  };

  const handleRiderDemoVoiceAlert = () => {
    speakDisasterAlert(
      'Attention: Free accessible evacuation bus is en route for senior citizens and persons with disabilities.',
      'Paunawa: Libreng sundo evacuation bus ay paparating na para sa mga lolo, lola, at may kapansanan sa Daraga.'
    );
    playChime('alert');
    showFeedback('🔊 Voice Siren Playing: Bilingual Tagalog & English evacuation guidance.');
  };

  // ==========================================
  // DRIVER DEMO ACTIONS
  // ==========================================
  const handleDriverDemoBoardPassenger = () => {
    setIsRunningAction(true);
    triggerVibration([80, 40, 80]);
    playChime('success');
    setSimulatedBoarded(true);

    onDispatchNotification({
      type: 'general',
      title: 'Passenger Safely Boarded: Lola Remedios',
      message: 'Wheelchair passenger secured with safety harness in BUS-01 bay 1.',
      tagalog: 'Ligtas nang nakasakay si Lola Remedios sa bus.',
      recipient: 'driver',
    });

    showFeedback('♿ Ramp Locked & Verified! Lola Remedios recorded on live passenger manifest.');
    setTimeout(() => setIsRunningAction(false), 500);
  };

  const handleDriverDemoAdvanceStop = async () => {
    if (!primaryVehicle) return;
    setIsRunningAction(true);
    triggerVibration([60]);
    playChime('info');

    try {
      await onAdvanceStop(primaryVehicle.id);
      showFeedback(`📍 Bus Moved to Next Evacuation Stop along Daraga road network.`);
    } catch {
      showFeedback('Stop advanced.');
    } finally {
      setIsRunningAction(false);
    }
  };

  const handleDriverDemoBusFull = async () => {
    if (!primaryVehicle) return;
    setIsRunningAction(true);
    triggerVibration([300, 100, 300]);
    playChime('alert');

    try {
      await onMarkBusFull(primaryVehicle.id);
      showFeedback('🚨 BUS FULL Triggered! Standby VAN-02 dispatched to handle remaining evacuees.');
    } catch {
      showFeedback('Bus marked full.');
    } finally {
      setIsRunningAction(false);
    }
  };

  // ==========================================
  // SHELTER DEMO ACTIONS
  // ==========================================
  const handleShelterDemoIntake = () => {
    setIsRunningAction(true);
    triggerVibration([50]);
    playChime('success');
    setSimulatedIntakeCount(prev => prev + 3);

    onDispatchNotification({
      type: 'general',
      title: 'Intake Check-In: +3 Arrived',
      message: '3 elderly evacuees checked in at Burgos Covered Court. Ground-floor mats allocated.',
      tagalog: 'May 3 karagdagang residente ang naitalang ligtas na nakarating sa shelter.',
      recipient: 'shelter',
    });

    showFeedback('📋 +3 Evacuees Checked In! Shelter capacity counter incremented in real time.');
    setTimeout(() => setIsRunningAction(false), 500);
  };

  const handleShelterDemoToggleFull = async () => {
    if (!primaryShelter) return;
    setIsRunningAction(true);
    triggerVibration([250, 100, 250]);
    playChime('alert');

    try {
      await onToggleShelterFull(primaryShelter.id);
      showFeedback(
        primaryShelter.isFull
          ? '🟢 Shelter re-opened for new arrivals.'
          : '⚠️ SHELTER FULL Triggered! Automatic diversion alert sent to all rescue drivers.'
      );
    } catch {
      showFeedback('Shelter status updated.');
    } finally {
      setIsRunningAction(false);
    }
  };

  const handleShelterDemoToggleWheelchair = async () => {
    if (!primaryShelter) return;
    setIsRunningAction(true);
    triggerVibration([80]);
    playChime('info');

    try {
      await onToggleWheelchair(primaryShelter.id);
      showFeedback(
        `♿ Wheelchair accessibility status toggled for ${primaryShelter.name}.`
      );
    } catch {
      showFeedback('Accessibility updated.');
    } finally {
      setIsRunningAction(false);
    }
  };

  return (
    <div className="space-y-4 animate-fadeIn">
      {/* 1. ROLE-SPECIFIC HERO HEADER */}
      <div
        className={`p-4 rounded-3xl border shadow-lg relative overflow-hidden ${
          role === 'rider'
            ? 'bg-gradient-to-br from-amber-950/70 via-slate-900 to-slate-950 border-amber-500/40 text-amber-100'
            : role === 'driver'
            ? 'bg-gradient-to-br from-blue-950/70 via-slate-900 to-slate-950 border-blue-500/40 text-blue-100'
            : 'bg-gradient-to-br from-emerald-950/70 via-slate-900 to-slate-950 border-emerald-500/40 text-emerald-100'
        }`}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-1.5 mb-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[10px] font-black uppercase tracking-wider text-amber-400">
                Active Role Demo &bull; Interactive Sandbox
              </span>
            </div>
            <h2 className="text-xl font-black text-white tracking-tight">
              {role === 'rider' && 'Evacuee / Rider Demo'}
              {role === 'driver' && 'Rescue Driver Demo'}
              {role === 'shelter' && 'Shelter Manager Demo'}
            </h2>
            <p className="text-xs text-slate-300 mt-0.5 leading-relaxed">
              {role === 'rider' &&
                'Test how vulnerable seniors and PWDs request accessible transport and receive bilingual alerts in Daraga.'}
              {role === 'driver' &&
                'Simulate vehicle navigation, passenger manifest tracking, wheelchair boarding, and "Bus Full" protocols.'}
              {role === 'shelter' &&
                'Simulate resident check-in, bed capacity monitoring, and network-wide shelter full diversion.'}
            </p>
          </div>

          <div
            className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-md ${
              role === 'rider'
                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                : role === 'driver'
                ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
            }`}
          >
            {role === 'rider' && <Users className="w-6 h-6" />}
            {role === 'driver' && <Truck className="w-6 h-6" />}
            {role === 'shelter' && <Home className="w-6 h-6" />}
          </div>
        </div>

        {/* User Sign-up badge */}
        <div className="mt-3 pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-slate-400">Signed Up As:</span>
            <span className="font-bold text-white bg-slate-800/80 px-2.5 py-0.5 rounded-lg border border-slate-700">
              {userName}
            </span>
          </div>
          <span className="text-[11px] font-semibold text-emerald-400 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" /> Verification Active
          </span>
        </div>
      </div>

      {/* FEEDBACK TOAST */}
      {demoActionFeedback && (
        <div className="p-3 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-200 text-xs font-bold flex items-center gap-2.5 shadow-md animate-fadeIn">
          <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
          <span className="flex-1">{demoActionFeedback}</span>
        </div>
      )}

      {/* 2. INTERACTIVE DEMO CONTROLS (TAILORED TO ROLE) */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 space-y-3 shadow-md">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Play className="w-4 h-4 text-amber-400" />
            <h3 className="font-extrabold text-sm text-white">Live Simulator Controls</h3>
          </div>
          <span className="text-[10px] text-slate-400 font-mono">1-Tap Live Execution</span>
        </div>

        {/* --- ROLE: RIDER CONTROLS --- */}
        {role === 'rider' && (
          <div className="space-y-2.5">
            <button
              onClick={handleRiderDemoRequest}
              disabled={isRunningAction}
              className="w-full p-3 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs flex items-center justify-between transition-all cursor-pointer shadow-md active:scale-95 disabled:opacity-50"
            >
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                <span className="text-left">1. Simulate 1-Tap Emergency Request</span>
              </div>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              onClick={handleRiderDemoSimulateArrival}
              disabled={isRunningAction}
              className="w-full p-3 rounded-2xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-bold text-xs flex items-center justify-between transition-all cursor-pointer active:scale-95"
            >
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-400" />
                <span className="text-left">2. Simulate Bus Approaching (ETA 1 min)</span>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-900 text-amber-300">
                {simulatedEta ? `${simulatedEta}m ETA` : 'Trigger'}
              </span>
            </button>

            <button
              onClick={handleRiderDemoVoiceAlert}
              className="w-full p-3 rounded-2xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-bold text-xs flex items-center justify-between transition-all cursor-pointer active:scale-95"
            >
              <div className="flex items-center gap-2">
                <Volume2 className="w-4 h-4 text-emerald-400" />
                <span className="text-left">3. Test Tagalog Audio Voice Siren</span>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-900 text-emerald-300">
                🔊 Play
              </span>
            </button>
          </div>
        )}

        {/* --- ROLE: DRIVER CONTROLS --- */}
        {role === 'driver' && (
          <div className="space-y-2.5">
            <button
              onClick={handleDriverDemoBoardPassenger}
              disabled={isRunningAction}
              className="w-full p-3 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-black text-xs flex items-center justify-between transition-all cursor-pointer shadow-md active:scale-95 disabled:opacity-50"
            >
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                <span className="text-left">1. Verify Wheelchair Ramp &amp; Board Lola Remedios</span>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-950 text-blue-200">
                {simulatedBoarded ? 'Boarded ✓' : 'Board'}
              </span>
            </button>

            <button
              onClick={handleDriverDemoAdvanceStop}
              disabled={isRunningAction}
              className="w-full p-3 rounded-2xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-bold text-xs flex items-center justify-between transition-all cursor-pointer active:scale-95"
            >
              <div className="flex items-center gap-2">
                <Compass className="w-4 h-4 text-amber-400" />
                <span className="text-left">2. Advance Vehicle to Next Evacuation Stop</span>
              </div>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              onClick={handleDriverDemoBusFull}
              disabled={isRunningAction}
              className="w-full p-3 rounded-2xl bg-red-600/30 hover:bg-red-600/40 border border-red-500/60 text-red-200 font-black text-xs flex items-center justify-between transition-all cursor-pointer active:scale-95"
            >
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-400" />
                <span className="text-left">3. Trigger "Bus Full" Automatic Overflow</span>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-red-950 text-red-300">
                Alert
              </span>
            </button>

            <button
              onClick={onSwitchToMapTab}
              className="w-full p-3 rounded-2xl bg-gradient-to-r from-purple-900/60 to-slate-900 border border-purple-500/60 text-purple-200 font-black text-xs flex items-center justify-between transition-all cursor-pointer active:scale-95"
            >
              <div className="flex items-center gap-2">
                <Play className="w-4 h-4 text-purple-400" />
                <span className="text-left">4. Panoorin ang Live Bus Stops Demo sa Mapa</span>
              </div>
              <ArrowRight className="w-4 h-4 text-purple-300" />
            </button>
          </div>
        )}

        {/* --- ROLE: SHELTER CONTROLS --- */}
        {role === 'shelter' && (
          <div className="space-y-2.5">
            <button
              onClick={handleShelterDemoIntake}
              disabled={isRunningAction}
              className="w-full p-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs flex items-center justify-between transition-all cursor-pointer shadow-md active:scale-95 disabled:opacity-50"
            >
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                <span className="text-left">1. Check-In Arriving Seniors (+3 Intake)</span>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-200">
                +{simulatedIntakeCount} added
              </span>
            </button>

            <button
              onClick={handleShelterDemoToggleFull}
              disabled={isRunningAction}
              className="w-full p-3 rounded-2xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-bold text-xs flex items-center justify-between transition-all cursor-pointer active:scale-95"
            >
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                <span className="text-left">2. Toggle "Shelter Full" Network Diversion</span>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-900 text-amber-300">
                {primaryShelter?.isFull ? 'Mark Open' : 'Mark Full'}
              </span>
            </button>

            <button
              onClick={handleShelterDemoToggleWheelchair}
              disabled={isRunningAction}
              className="w-full p-3 rounded-2xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-bold text-xs flex items-center justify-between transition-all cursor-pointer active:scale-95"
            >
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-blue-400" />
                <span className="text-left">3. Toggle Ground Floor Wheelchair Bed Status</span>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-900 text-blue-300">
                {primaryShelter?.wheelchairAccessible ? 'Active' : 'Offline'}
              </span>
            </button>
          </div>
        )}
      </div>

      {/* 3. STEP-BY-STEP EMERGENCY PROTOCOL GUIDE */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-400" />
          <h3 className="font-extrabold text-sm text-white">How This Role Operates in Daraga</h3>
        </div>

        {role === 'rider' && (
          <div className="space-y-2 text-xs">
            <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800/80 flex items-start gap-2.5">
              <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-300 font-bold flex items-center justify-center shrink-0 text-[10px]">
                1
              </span>
              <div>
                <p className="font-bold text-white">Tap "Humingi ng Libreng Sundo"</p>
                <p className="text-[11px] text-slate-400">
                  Select your mobility need: Wheelchair (needs ramp), Walking Cane, or Medical bedridden.
                </p>
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800/80 flex items-start gap-2.5">
              <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-300 font-bold flex items-center justify-center shrink-0 text-[10px]">
                2
              </span>
              <div>
                <p className="font-bold text-white">Automatic LGU Vehicle Assignment</p>
                <p className="text-[11px] text-slate-400">
                  The system runs Dijkstra routing to assign the nearest ramp-equipped bus (e.g. BUS-01).
                </p>
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800/80 flex items-start gap-2.5">
              <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-300 font-bold flex items-center justify-center shrink-0 text-[10px]">
                3
              </span>
              <div>
                <p className="font-bold text-white">Audio Arrival Chime &amp; Safe Boarding</p>
                <p className="text-[11px] text-slate-400">
                  When the bus is 1 minute away, your phone speaks Tagalog audio so older adults can prepare.
                </p>
              </div>
            </div>
          </div>
        )}

        {role === 'driver' && (
          <div className="space-y-2 text-xs">
            <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800/80 flex items-start gap-2.5">
              <span className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-300 font-bold flex items-center justify-center shrink-0 text-[10px]">
                1
              </span>
              <div>
                <p className="font-bold text-white">Review Vulnerable Resident Manifest</p>
                <p className="text-[11px] text-slate-400">
                  See exact names, phone numbers, and mobility requirements at every Barangay stop.
                </p>
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800/80 flex items-start gap-2.5">
              <span className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-300 font-bold flex items-center justify-center shrink-0 text-[10px]">
                2
              </span>
              <div>
                <p className="font-bold text-white">Deploy Wheelchair Hydraulic Ramp</p>
                <p className="text-[11px] text-slate-400">
                  Confirm hydraulic ramp deployment with one tap to record safe wheelchair locking.
                </p>
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800/80 flex items-start gap-2.5">
              <span className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-300 font-bold flex items-center justify-center shrink-0 text-[10px]">
                3
              </span>
              <div>
                <p className="font-bold text-white">1-Tap "Bus Full" Rerouting</p>
                <p className="text-[11px] text-slate-400">
                  If seats or wheelchair bays are filled, tap "Bus Full" to automatically reassign remaining stops to VAN-02.
                </p>
              </div>
            </div>
          </div>
        )}

        {role === 'shelter' && (
          <div className="space-y-2 text-xs">
            <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800/80 flex items-start gap-2.5">
              <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold flex items-center justify-center shrink-0 text-[10px]">
                1
              </span>
              <div>
                <p className="font-bold text-white">Priority Accessible Ground-Floor Intake</p>
                <p className="text-[11px] text-slate-400">
                  Ensure seniors and wheelchair users are placed on ground-level accessible spaces near comfort rooms.
                </p>
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800/80 flex items-start gap-2.5">
              <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold flex items-center justify-center shrink-0 text-[10px]">
                2
              </span>
              <div>
                <p className="font-bold text-white">Live Capacity Gauge</p>
                <p className="text-[11px] text-slate-400">
                  Real-time occupancy counter synchronizes with the municipal EOC and incoming rescue shuttles.
                </p>
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800/80 flex items-start gap-2.5">
              <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold flex items-center justify-center shrink-0 text-[10px]">
                3
              </span>
              <div>
                <p className="font-bold text-white">Automated Diversion Network</p>
                <p className="text-[11px] text-slate-400">
                  When at full capacity, toggle "Shelter Full" to divert buses directly to Daraga National High School.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 4. QUICK SHORTCUT ACTIONS */}
      <div className="grid grid-cols-2 gap-2.5 pt-1">
        <button
          onClick={onSwitchToDashboardTab}
          className="p-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white font-extrabold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer border border-slate-700 shadow-sm"
        >
          <span>Open Main Dashboard</span>
          <ArrowRight className="w-3.5 h-3.5 text-amber-400" />
        </button>

        <button
          onClick={onSwitchToMapTab}
          className="p-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white font-extrabold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer border border-slate-700 shadow-sm"
        >
          <span>View Live GPS Map</span>
          <Compass className="w-3.5 h-3.5 text-purple-400" />
        </button>
      </div>
    </div>
  );
};

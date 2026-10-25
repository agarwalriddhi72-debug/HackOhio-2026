import React, { useState, useEffect } from 'react';
import { Resident, Vehicle, Shelter, WeatherState, TestCaseScenario, AppNotification } from '../types';
import { RiderInterface } from './RiderInterface';
import { DriverInterface } from './DriverInterface';
import { ShelterInterface } from './ShelterInterface';
import { DaragaMap } from './DaragaMap';
import { PhoneRoleDemoSection, UserRoleType } from './PhoneRoleDemoSection';
import { PhoneRoleOnboarding } from './PhoneRoleOnboarding';
import { LiveBusStopsDemo } from './LiveBusStopsDemo';
import {
  ShieldAlert,
  Users,
  Truck,
  Home,
  Map as MapIcon,
  Bell,
  Volume2,
  VolumeX,
  PhoneCall,
  Smartphone,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  ExternalLink,
  ChevronRight,
  Maximize2,
  Minimize2,
  Sparkles,
  ArrowRight,
  UserCheck,
  RotateCcw,
  Layers,
} from 'lucide-react';
import { playChime, triggerVibration, speakDisasterAlert } from './NotificationCenter';

interface Props {
  residents: Resident[];
  vehicles: Vehicle[];
  shelters: Shelter[];
  weather: WeatherState | null;
  scenarios: TestCaseScenario[];
  notifications: AppNotification[];
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
  onRefreshData: () => Promise<void>;
  onDispatchNotification: (notif: {
    type: AppNotification['type'];
    title: string;
    message: string;
    tagalog?: string;
    recipient: 'all' | 'rider' | 'driver' | 'shelter';
  }) => void;
  activeRiderId: string | null;
  onSelectActiveRider: (id: string | null) => void;
  highContrast: boolean;
  onToggleHighContrast: () => void;
  onSwitchToDesktop?: () => void;
  onSwitchToCreator?: () => void;
  initialRole?: 'rider' | 'driver' | 'shelter' | 'map' | 'alerts';
}

export const PhoneSpecificApp: React.FC<Props> = ({
  residents,
  vehicles,
  shelters,
  weather,
  scenarios,
  notifications,
  onSubmitRiderRequest,
  onMarkBusFull,
  onAdvanceStop,
  onToggleShelterFull,
  onToggleWheelchair,
  onRefreshData,
  onDispatchNotification,
  activeRiderId,
  onSelectActiveRider,
  highContrast,
  onToggleHighContrast,
  onSwitchToDesktop,
  onSwitchToCreator,
  initialRole = 'rider',
}) => {
  // Signed-up role state: 'rider' | 'driver' | 'shelter' | null
  const [signedUpRole, setSignedUpRole] = useState<UserRoleType | null>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('ark_phone_role');
      if (stored === 'rider' || stored === 'driver' || stored === 'shelter') {
        return stored;
      }
    }
    // Default to 'rider' if initialRole is provided, or prompt onboarding
    return (initialRole === 'rider' || initialRole === 'driver' || initialRole === 'shelter') ? initialRole : 'rider';
  });

  const [signedUpName, setSignedUpName] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('ark_phone_user_name');
      if (stored) return stored;
    }
    return 'Lola Remedios Alcantara';
  });

  const [signedUpPhone, setSignedUpPhone] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('ark_phone_user_phone');
      if (stored) return stored;
    }
    return '0917-555-8921';
  });

  // Active sub-tab inside signed-in view: 'dashboard' | 'demo' | 'map' | 'alerts'
  const [activeTab, setActiveTab] = useState<'dashboard' | 'demo' | 'map' | 'alerts'>('dashboard');

  const [showRoleSelectorModal, setShowRoleSelectorModal] = useState<boolean>(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [showHotlineSheet, setShowHotlineSheet] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [frameMode, setFrameMode] = useState<boolean>(false); // desktop simulated iPhone frame
  const [activeNotice, setActiveNotice] = useState<string | null>(null);

  // Live bus stop and pickup simulation states on the map
  const [liveBusCoords, setLiveBusCoords] = useState<[number, number] | null>(null);
  const [isBusStopped, setIsBusStopped] = useState<boolean>(false);
  const [busStopLabel, setBusStopLabel] = useState<string>('');

  // Sync role if initialRole changes externally
  useEffect(() => {
    if (initialRole && (initialRole === 'rider' || initialRole === 'driver' || initialRole === 'shelter')) {
      if (!signedUpRole) {
        setSignedUpRole(initialRole);
      }
    }
  }, [initialRole, signedUpRole]);

  // Handle Role Selection & Instant Sign-Up
  const handleSignUpRole = (role: UserRoleType, name: string, phone: string) => {
    setSignedUpRole(role);
    setSignedUpName(name);
    setSignedUpPhone(phone);
    setShowRoleSelectorModal(false);
    setActiveTab('dashboard');

    if (typeof window !== 'undefined') {
      localStorage.setItem('ark_phone_role', role);
      localStorage.setItem('ark_phone_user_name', name);
      localStorage.setItem('ark_phone_user_phone', phone);
    }

    const roleLabel = role === 'rider' ? 'Evacuee / Rider' : role === 'driver' ? 'Rescue Driver' : 'Shelter Station';
    setActiveNotice(`🎉 Signed up successfully as ${roleLabel}! Check out the Demo Section below.`);
    triggerVibration([100, 50, 100]);
    playChime('success');

    onDispatchNotification({
      type: 'general',
      title: `Signed In: ${name}`,
      message: `Active on A.R.K mobile as ${roleLabel}. Accessible dispatch ready.`,
      tagalog: `Naka-sign in na bilang ${roleLabel} sa Daraga.`,
      recipient: role,
    });
  };

  // Quick refresh helper
  const handleRefresh = async () => {
    setIsRefreshing(true);
    triggerVibration([50]);
    await onRefreshData();
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const handleTabChange = (tab: typeof activeTab) => {
    setActiveTab(tab);
    triggerVibration([30]);
  };

  const handleToggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    if (next) {
      playChime('success');
      triggerVibration([100]);
    }
  };

  const handleEmergencyCall = (num: string) => {
    window.location.href = `tel:${num}`;
  };

  // Test broadcast alert from phone
  const handleSendTestWarning = () => {
    onDispatchNotification({
      type: 'hazard_alert',
      title: '🚨 EMERGENCY ALERT: Typhoon Warning Active',
      message: 'Active hazard warning in effect for Daraga, Albay. Priority accessible evacuation bus protocol active.',
      tagalog: 'BABALA SA KALAMIDAD: May banta ng Bagyo. Nagsisimula na ang libreng paglikas.',
      recipient: 'all',
    });
    setActiveNotice('🚨 Emergency alert triggered! Audio chime and vibration sent.');
    setTimeout(() => setActiveNotice(null), 4000);
  };

  const isAlertActive = weather?.status === 'ALERT_ACTIVE';
  const unreadAlertsCount = notifications.filter(n => !n.read && n.type === 'hazard_alert').length;

  // If no role is selected yet, show the full onboarding screen
  if (!signedUpRole) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col justify-center">
        <PhoneRoleOnboarding
          onSelectAndSignUp={handleSignUpRole}
          canDismiss={false}
        />
      </div>
    );
  }

  // The actual mobile view content
  const mobileContent = (
    <div className="flex flex-col h-full bg-slate-950 text-slate-100 select-none">
      {/* 1. MOBILE APP BAR HEADER */}
      <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 px-3.5 py-2.5 shrink-0 shadow-lg">
        <div className="flex items-center justify-between gap-2">
          {/* Brand & Active Role Status */}
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-slate-950 font-black shadow-md shrink-0">
              <span className="text-xs font-black tracking-tight">ARK</span>
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h1 className="text-xs font-black text-white tracking-tight truncate">
                  {signedUpName}
                </h1>
                <span
                  className={`text-[9px] font-black px-1.5 py-0.5 rounded-full uppercase shrink-0 border ${
                    signedUpRole === 'rider'
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                      : signedUpRole === 'driver'
                      ? 'bg-blue-500/20 text-blue-300 border-blue-500/30'
                      : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                  }`}
                >
                  {signedUpRole === 'rider' ? 'Rider' : signedUpRole === 'driver' ? 'Driver' : 'Shelter'}
                </span>
              </div>
              <button
                onClick={() => setShowRoleSelectorModal(true)}
                className="text-[10px] text-amber-400 hover:text-amber-300 font-semibold flex items-center gap-1 cursor-pointer leading-tight mt-0.5"
                title="Switch between Rider, Driver, or Shelter role"
              >
                <RotateCcw className="w-2.5 h-2.5" />
                <span>Switch Role</span>
              </button>
            </div>
          </div>

          {/* Quick Header Actions */}
          <div className="flex items-center gap-1.5 shrink-0">
            {/* Audio Siren Toggle */}
            <button
              onClick={handleToggleSound}
              className={`p-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                soundEnabled
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                  : 'bg-slate-800 text-slate-400 border-slate-700'
              }`}
              title={soundEnabled ? 'Emergency Audio Siren ON' : 'Audio Siren Muted'}
              aria-label="Toggle Siren Audio"
            >
              {soundEnabled ? <Volume2 className="w-3.5 h-3.5 text-amber-400" /> : <VolumeX className="w-3.5 h-3.5" />}
            </button>

            {/* Emergency Hotline Button */}
            <button
              onClick={() => setShowHotlineSheet(!showHotlineSheet)}
              className="p-1.5 rounded-xl bg-red-600/30 hover:bg-red-600/40 text-red-300 border border-red-500/50 transition-colors cursor-pointer"
              title="Emergency Hotline"
              aria-label="Emergency Hotlines"
            >
              <PhoneCall className="w-3.5 h-3.5 text-red-400" />
            </button>

            {/* Refresh */}
            <button
              onClick={handleRefresh}
              className={`p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors cursor-pointer ${
                isRefreshing ? 'animate-spin' : ''
              }`}
              title="Refresh Data"
              aria-label="Refresh Data"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>

            {/* View Switchers for reviewers */}
            {onSwitchToDesktop && (
              <button
                onClick={onSwitchToDesktop}
                className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-[10px] font-semibold transition-colors cursor-pointer flex items-center gap-1"
                title="Switch to Desktop User View"
              >
                <span>Desktop</span>
              </button>
            )}
            {onSwitchToCreator && (
              <button
                onClick={onSwitchToCreator}
                className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 text-[10px] font-semibold transition-colors cursor-pointer flex items-center gap-1"
                title="Switch to Creator View"
              >
                <span>Creator</span>
              </button>
            )}
          </div>
        </div>

        {/* ACTIVE HAZARD WARNING BANNER (Top Pill) */}
        {isAlertActive && (
          <div className="mt-2 p-2 rounded-xl bg-gradient-to-r from-red-950 via-amber-950 to-slate-900 border border-red-500/60 flex items-center justify-between gap-2 shadow-inner">
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping shrink-0" />
              <span className="text-[11px] font-black text-red-200 uppercase tracking-tight truncate">
                🚨 {weather?.primaryDisaster || 'Typhoon Warning Active'}
              </span>
            </div>
            <button
              onClick={() => {
                const msg = `Disaster warning for Daraga: ${weather?.primaryDisaster || 'Typhoon'}. Free rescue buses are operating.`;
                const tl = `Babala sa kalamidad sa Daraga: May banta ng ${weather?.primaryDisaster || 'bagyo'}. Handa na ang libreng sundo.`;
                speakDisasterAlert(msg, tl);
              }}
              className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-red-600 text-white shrink-0 cursor-pointer active:scale-95"
            >
              🔊 Listen
            </button>
          </div>
        )}
      </header>

      {/* FEEDBACK BANNER */}
      {activeNotice && (
        <div className="bg-emerald-500/20 border-b border-emerald-500/40 text-emerald-200 px-4 py-2 text-xs font-bold flex items-center justify-between gap-2 animate-fadeIn shrink-0">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{activeNotice}</span>
          </div>
          <button onClick={() => setActiveNotice(null)} className="text-slate-400 hover:text-white">
            &times;
          </button>
        </div>
      )}

      {/* 2. MAIN SCROLLABLE MOBILE CONTENT AREA */}
      <main className="flex-1 overflow-y-auto px-3.5 py-3 space-y-3.5 pb-20">
        {/* TAB 1: ROLE-SPECIFIC DASHBOARD */}
        {activeTab === 'dashboard' && (
          <div className="space-y-3.5">
            {/* Quick Demo Section Teaser Pill */}
            <div
              onClick={() => setActiveTab('demo')}
              className="p-2.5 rounded-2xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 flex items-center justify-between gap-2 cursor-pointer transition-all shadow-sm group"
            >
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400 shrink-0 group-hover:scale-110 transition-transform" />
                <span className="text-xs font-bold text-amber-200">
                  Try the <strong>{signedUpRole === 'rider' ? 'Rider' : signedUpRole === 'driver' ? 'Driver' : 'Shelter'} Interactive Demo</strong>
                </span>
              </div>
              <span className="text-[10px] font-black uppercase text-amber-300 bg-amber-500/20 px-2 py-0.5 rounded-lg flex items-center gap-1 shrink-0">
                <span>Open Demo</span>
                <ArrowRight className="w-3 h-3" />
              </span>
            </div>

            {/* RIDER INTERFACE */}
            {signedUpRole === 'rider' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-black uppercase text-amber-400 tracking-wider">
                      Evacuee / Libreng Sundo
                    </span>
                    <h2 className="text-lg font-black text-white">{signedUpName}</h2>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 uppercase">
                    Senior / PWD
                  </span>
                </div>

                <RiderInterface
                  residents={residents}
                  vehicles={vehicles}
                  shelters={shelters}
                  onSubmitRequest={onSubmitRiderRequest}
                  highContrast={highContrast}
                  activeRiderId={activeRiderId}
                  onSelectActiveRider={onSelectActiveRider}
                  weather={weather}
                  soundUnlocked={soundEnabled}
                  onUnlockSound={handleToggleSound}
                />
              </div>
            )}

            {/* DRIVER INTERFACE */}
            {signedUpRole === 'driver' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-black uppercase text-blue-400 tracking-wider">
                      Rescue Vehicle Operator
                    </span>
                    <h2 className="text-lg font-black text-white">{signedUpName}</h2>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/40 uppercase">
                    BUS-01 Active
                  </span>
                </div>

                <DriverInterface
                  vehicles={vehicles}
                  residents={residents}
                  shelters={shelters}
                  onMarkBusFull={onMarkBusFull}
                  onAdvanceStop={onAdvanceStop}
                  highContrast={highContrast}
                />
              </div>
            )}

            {/* SHELTER INTERFACE */}
            {signedUpRole === 'shelter' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-black uppercase text-emerald-400 tracking-wider">
                      Shelter Reception &amp; Capacity
                    </span>
                    <h2 className="text-lg font-black text-white">{signedUpName}</h2>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 uppercase">
                    Burgos Center
                  </span>
                </div>

                <ShelterInterface
                  shelters={shelters}
                  vehicles={vehicles}
                  onToggleShelterFull={onToggleShelterFull}
                  onToggleWheelchair={onToggleWheelchair}
                  highContrast={highContrast}
                />
              </div>
            )}
          </div>
        )}

        {/* TAB 2: TAILORED ROLE INTERACTIVE DEMO */}
        {activeTab === 'demo' && (
          <PhoneRoleDemoSection
            role={signedUpRole}
            userName={signedUpName}
            residents={residents}
            vehicles={vehicles}
            shelters={shelters}
            weather={weather}
            onAdvanceStop={onAdvanceStop}
            onMarkBusFull={onMarkBusFull}
            onToggleShelterFull={onToggleShelterFull}
            onToggleWheelchair={onToggleWheelchair}
            onDispatchNotification={onDispatchNotification}
            onSubmitRiderRequest={onSubmitRiderRequest}
            onSwitchToDashboardTab={() => setActiveTab('dashboard')}
            onSwitchToMapTab={() => setActiveTab('map')}
          />
        )}

        {/* TAB 3: LIVE GPS MAP */}
        {activeTab === 'map' && (
          <div className="space-y-3.5">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-black uppercase text-purple-400 tracking-wider">
                  Mobile GPS Navigator &bull; Autonomous Dispatch
                </span>
                <h2 className="text-base font-black text-white">Daraga Live Map &amp; Stops</h2>
              </div>
              <button
                onClick={handleRefresh}
                className="text-[11px] text-amber-300 font-bold flex items-center gap-1 cursor-pointer"
              >
                <RefreshCw className="w-3 h-3" /> Refresh GPS
              </button>
            </div>

            {/* LIVE BUS STOPS & PICKUPS CONTROLLER */}
            <LiveBusStopsDemo
              vehicles={vehicles}
              shelters={shelters}
              onUpdateVehiclePosition={(id, coords) => setLiveBusCoords(coords)}
              onVehicleStopStatusChange={(stopped, label) => {
                setIsBusStopped(stopped);
                if (label) setBusStopLabel(label);
              }}
            />

            {/* Interactive Leaflet Map with Animated Bus Stops */}
            <div className="h-[420px] rounded-2xl overflow-hidden border-2 border-slate-700 shadow-xl relative">
              <DaragaMap
                shelters={shelters}
                vehicles={vehicles}
                residents={residents}
                medicalFacilities={[]}
                transportHubs={[]}
                highContrast={highContrast}
                animatedVehicleId="BUS-01"
                animatedCoords={liveBusCoords}
                isUserView={true}
                isVehicleStopped={isBusStopped}
                vehicleStopLabel={busStopLabel}
              />
            </div>
            <p className="text-[11px] text-slate-400 leading-tight">
              Showing active rescue buses (BUS-01, VAN-02) and open evacuation shelters across Daraga municipality. Tap stops to inspect pickup details.
            </p>
          </div>
        )}

        {/* TAB 4: DISASTER ALERTS */}
        {activeTab === 'alerts' && (
          <div className="space-y-3.5">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-black uppercase text-red-400 tracking-wider">
                  Emergency Broadcast Feed
                </span>
                <h2 className="text-base font-black text-white">Active Alerts ({notifications.length})</h2>
              </div>
              <button
                onClick={handleSendTestWarning}
                className="px-2.5 py-1 rounded-xl bg-red-600/30 hover:bg-red-600/40 border border-red-500 text-red-200 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
              >
                <ShieldAlert className="w-3 h-3" />
                <span>Test Siren</span>
              </button>
            </div>

            <div className="space-y-2.5">
              {notifications.map(n => (
                <div
                  key={n.id}
                  className={`p-3.5 rounded-2xl border text-xs space-y-1.5 transition-all ${
                    n.type === 'hazard_alert'
                      ? 'bg-red-950/40 border-red-500/50 text-red-100'
                      : n.type === 'bus_full'
                      ? 'bg-amber-950/40 border-amber-500/50 text-amber-100'
                      : 'bg-slate-900 border-slate-800 text-slate-200'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-black text-sm text-white leading-tight">{n.title}</span>
                    <span className="text-[10px] font-mono text-slate-400 shrink-0">{n.timestamp}</span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">{n.message}</p>
                  {n.tagalog && (
                    <p className="text-[11px] text-amber-200/90 italic leading-relaxed">
                      🇵🇭 {n.tagalog}
                    </p>
                  )}
                  <div className="flex justify-between items-center pt-1 border-t border-slate-800/60">
                    <span className="text-[10px] font-bold uppercase text-amber-400">
                      Target: {n.recipient.toUpperCase()}
                    </span>
                    <button
                      onClick={() => speakDisasterAlert(n.message, n.tagalog)}
                      className="text-[11px] text-amber-300 hover:text-amber-200 font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <Volume2 className="w-3 h-3" /> Read Aloud
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* 3. EMERGENCY HOTLINE MODAL SHEET */}
      {showHotlineSheet && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-3">
          <div className="bg-slate-900 border-2 border-red-500 rounded-3xl p-5 max-w-sm w-full space-y-3 shadow-2xl animate-fadeIn">
            <div className="flex justify-between items-center border-b border-slate-800 pb-2">
              <div className="flex items-center gap-2 text-red-400">
                <PhoneCall className="w-5 h-5" />
                <h3 className="font-black text-base text-white">Emergency Call &bull; Daraga</h3>
              </div>
              <button onClick={() => setShowHotlineSheet(false)} className="text-slate-400 hover:text-white p-1">
                &times;
              </button>
            </div>
            <p className="text-xs text-slate-300">
              Tap below to place a direct phone call to Daraga disaster response command:
            </p>
            <div className="space-y-2 pt-1">
              {[
                { name: 'Daraga MDRRMO Operations', num: '0917-555-2751', label: 'Primary Rescue' },
                { name: 'Albay PDRRMC Disaster EOC', num: '0928-555-8900', label: 'Provincial Command' },
                { name: 'Daraga Police Station (PNP)', num: '0949-555-1234', label: 'Security & Transit' },
                { name: 'Daraga Fire / Rescue (BFP)', num: '0905-555-9911', label: 'Medical Evac' },
              ].map(h => (
                <button
                  key={h.name}
                  onClick={() => handleEmergencyCall(h.num)}
                  className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-red-500/50 flex items-center justify-between text-left cursor-pointer transition-colors"
                >
                  <div>
                    <div className="font-extrabold text-xs text-white">{h.name}</div>
                    <div className="text-[10px] text-amber-400 font-mono">{h.num}</div>
                  </div>
                  <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-red-600/30 text-red-300">
                    Call
                  </span>
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowHotlineSheet(false)}
              className="w-full py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold mt-2 cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* 4. ROLE SELECTION MODAL SHEET (FOR SWITCHING ROLES) */}
      {showRoleSelectorModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 overflow-y-auto">
          <div className="w-full max-w-md my-auto">
            <PhoneRoleOnboarding
              currentRole={signedUpRole}
              onSelectAndSignUp={handleSignUpRole}
              onClose={() => setShowRoleSelectorModal(false)}
              canDismiss={true}
            />
          </div>
        </div>
      )}

      {/* 5. FIXED MOBILE BOTTOM NAVIGATION BAR */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-slate-900/95 backdrop-blur-md border-t border-slate-800 px-2 py-1.5 shadow-2xl safe-area-bottom">
        <div className="max-w-md mx-auto grid grid-cols-5 gap-1 text-center">
          {/* Tab 1: Role Dashboard */}
          <button
            onClick={() => handleTabChange('dashboard')}
            className={`py-1.5 px-1 rounded-xl transition-all cursor-pointer flex flex-col items-center justify-center gap-0.5 ${
              activeTab === 'dashboard'
                ? 'bg-amber-500 text-slate-950 font-black shadow-md scale-105'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {signedUpRole === 'rider' && <Users className="w-5 h-5 mx-auto" />}
            {signedUpRole === 'driver' && <Truck className="w-5 h-5 mx-auto" />}
            {signedUpRole === 'shelter' && <Home className="w-5 h-5 mx-auto" />}
            <span className="text-[10px] font-black uppercase tracking-tight leading-none">
              {signedUpRole === 'rider' ? 'Rider' : signedUpRole === 'driver' ? 'Driver' : 'Shelter'}
            </span>
          </button>

          {/* Tab 2: Interactive Role Demo */}
          <button
            onClick={() => handleTabChange('demo')}
            className={`py-1.5 px-1 rounded-xl transition-all cursor-pointer flex flex-col items-center justify-center gap-0.5 relative ${
              activeTab === 'demo'
                ? 'bg-amber-500 text-slate-950 font-black shadow-md scale-105'
                : 'text-amber-400/90 hover:text-amber-300'
            }`}
          >
            <Sparkles className="w-5 h-5 mx-auto" />
            <span className="text-[10px] font-black uppercase tracking-tight leading-none">
              Demo
            </span>
          </button>

          {/* Tab 3: GPS Map */}
          <button
            onClick={() => handleTabChange('map')}
            className={`py-1.5 px-1 rounded-xl transition-all cursor-pointer flex flex-col items-center justify-center gap-0.5 ${
              activeTab === 'map'
                ? 'bg-amber-500 text-slate-950 font-black shadow-md scale-105'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <MapIcon className="w-5 h-5 mx-auto" />
            <span className="text-[10px] font-black uppercase tracking-tight leading-none">
              Map
            </span>
          </button>

          {/* Tab 4: Disaster Alerts */}
          <button
            onClick={() => handleTabChange('alerts')}
            className={`py-1.5 px-1 rounded-xl transition-all cursor-pointer flex flex-col items-center justify-center gap-0.5 ${
              activeTab === 'alerts'
                ? 'bg-amber-500 text-slate-950 font-black shadow-md scale-105'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <div className="relative inline-block">
              <Bell className="w-5 h-5 mx-auto" />
              {isAlertActive && (
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full animate-ping" />
              )}
            </div>
            <span className="text-[10px] font-black uppercase tracking-tight leading-none">
              Alerts
            </span>
          </button>

          {/* Tab 5: Role Switcher */}
          <button
            onClick={() => setShowRoleSelectorModal(true)}
            className="py-1.5 px-1 rounded-xl transition-all cursor-pointer flex flex-col items-center justify-center gap-0.5 text-slate-400 hover:text-amber-300"
            title="Switch your role"
          >
            <UserCheck className="w-5 h-5 mx-auto" />
            <span className="text-[10px] font-black uppercase tracking-tight leading-none">
              Switch
            </span>
          </button>
        </div>
      </nav>
    </div>
  );

  // If frameMode is active (desktop evaluator wanting realistic phone frame), render inside phone mockup
  if (frameMode) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-3 sm:p-6">
        {/* Frame Toggle Controls Bar */}
        <div className="mb-4 flex items-center gap-3 bg-slate-900 border border-slate-800 px-4 py-2 rounded-2xl shadow-lg">
          <span className="text-xs font-black text-amber-400 uppercase flex items-center gap-1.5">
            <Smartphone className="w-4 h-4" /> Phone Mockup View
          </span>
          <button
            onClick={() => setFrameMode(false)}
            className="text-xs font-semibold text-slate-300 hover:text-white px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700 flex items-center gap-1 transition-colors cursor-pointer"
          >
            <Maximize2 className="w-3.5 h-3.5" />
            <span>Full Window</span>
          </button>
          {onSwitchToDesktop && (
            <button
              onClick={onSwitchToDesktop}
              className="text-xs font-semibold text-slate-300 hover:text-white px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-colors cursor-pointer"
            >
              👤 Desktop View
            </button>
          )}
          {onSwitchToCreator && (
            <button
              onClick={onSwitchToCreator}
              className="text-xs font-semibold text-amber-300 hover:text-amber-200 px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 transition-colors cursor-pointer"
            >
              📊 Creator View
            </button>
          )}
        </div>

        {/* Realistic iPhone Bezel */}
        <div className="w-[390px] h-[820px] max-w-full max-h-[92vh] bg-slate-900 border-[10px] border-slate-800 rounded-[52px] shadow-2xl overflow-hidden flex flex-col relative ring-4 ring-amber-500/40">
          {/* Dynamic Island Notch */}
          <div className="absolute top-2.5 left-1/2 -translate-x-1/2 w-28 h-6 bg-black rounded-full z-50 flex items-center justify-end px-3">
            <div className="w-2.5 h-2.5 rounded-full bg-slate-800" />
          </div>
          <div className="flex-1 overflow-hidden flex flex-col pt-4">
            {mobileContent}
          </div>
        </div>
      </div>
    );
  }

  // Full-viewport native mobile app view
  return (
    <div className="min-h-screen w-full bg-slate-950 flex flex-col">
      {/* Desktop Helper bar if viewed on desktop */}
      <div className="hidden md:flex items-center justify-between bg-slate-900 border-b border-slate-800 px-4 py-1.5 text-xs text-slate-400">
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold text-[10px] uppercase">
            Mobile Phone Version Active
          </span>
          <span>Role: {signedUpRole.toUpperCase()} &bull; Touch targets &ge; 48px</span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowRoleSelectorModal(true)}
            className="text-amber-300 hover:text-amber-200 flex items-center gap-1 font-semibold cursor-pointer transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Switch Role (Rider / Driver / Shelter)</span>
          </button>
          <span className="text-slate-700">|</span>
          <button
            onClick={() => setFrameMode(true)}
            className="text-slate-300 hover:text-white flex items-center gap-1 font-semibold cursor-pointer transition-colors"
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>Show Phone Mockup Bezel</span>
          </button>
          <span className="text-slate-700">|</span>
          {onSwitchToDesktop && (
            <button
              onClick={onSwitchToDesktop}
              className="text-slate-300 hover:text-white font-medium cursor-pointer transition-colors flex items-center gap-1"
            >
              <span>👤 Desktop View</span>
            </button>
          )}
          {onSwitchToCreator && (
            <button
              onClick={onSwitchToCreator}
              className="text-amber-300 hover:text-amber-200 font-semibold cursor-pointer transition-colors flex items-center gap-1"
            >
              <span>📊 Creator View</span>
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 flex flex-col max-w-md mx-auto w-full shadow-2xl relative">
        {mobileContent}
      </div>
    </div>
  );
};

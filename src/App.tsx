import React, { useState, useEffect, useCallback } from 'react';
import { Resident, Vehicle, Shelter, WeatherState, TestCaseScenario } from './types';
import { HazardWarningBanner } from './components/HazardWarningBanner';
import { RiderInterface } from './components/RiderInterface';
import { DriverInterface } from './components/DriverInterface';
import { ShelterInterface } from './components/ShelterInterface';
import { DaragaMap } from './components/DaragaMap';
import { CreatorDashboard } from './components/CreatorDashboard';
import { LiveDemoController } from './components/LiveDemoController';
import { NotificationCenter, AppNotification, playChime } from './components/NotificationCenter';
import { PhoneDemoModal } from './components/PhoneDemoModal';
import { TriplePhoneSimulator } from './components/TriplePhoneSimulator';
import {
  Shield,
  Users,
  Truck,
  Home,
  Map as MapIcon,
  Sparkles,
  Eye,
  Contrast,
  RefreshCw,
  LayoutDashboard,
  UserCheck,
  Smartphone,
  CheckCircle2,
  Layers,
} from 'lucide-react';

export const App: React.FC = () => {
  // Top-level mode toggle: "User View" vs "Creator View"
  const [appMode, setAppMode] = useState<'user' | 'creator'>('user');

  // Sub-tabs in User View: Rider, Driver, Shelter, Map, Simulator
  const [userTab, setUserTab] = useState<'rider' | 'driver' | 'shelter' | 'map' | 'simulator'>('rider');

  const [highContrast, setHighContrast] = useState<boolean>(false);
  const [largeText, setLargeText] = useState<boolean>(false);
  const [showLiveDemo, setShowLiveDemo] = useState<boolean>(false);
  const [showPhoneModal, setShowPhoneModal] = useState<boolean>(false);

  // App Data State
  const [shelters, setShelters] = useState<Shelter[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [residents, setResidents] = useState<Resident[]>([]);
  const [medicalFacilities, setMedicalFacilities] = useState<any[]>([]);
  const [transportHubs, setTransportHubs] = useState<any[]>([]);
  const [scenarios, setScenarios] = useState<TestCaseScenario[]>([]);
  const [weatherState, setWeatherState] = useState<WeatherState | null>(null);
  const [loading, setLoading] = useState(true);

  // Dedicated single-user state for realistic interface isolation in User View
  const [activeRiderId, setActiveRiderId] = useState<string | null>(null);

  // Live vehicle movement animation state & Physical Stop Indicator
  const [animatedVehicleId, setAnimatedVehicleId] = useState<string | null>(null);
  const [animatedCoords, setAnimatedCoords] = useState<[number, number] | null>(null);
  const [isVehicleStopped, setIsVehicleStopped] = useState<boolean>(false);
  const [vehicleStopLabel, setVehicleStopLabel] = useState<string | undefined>(undefined);

  // Notification System State
  const [notifications, setNotifications] = useState<AppNotification[]>([
    {
      id: 'init-1',
      type: 'general',
      title: 'A.R.K System Initialized',
      message: 'Evacuation routing online for Daraga, Albay. 28,465 road nodes active.',
      tagalog: 'Bukas na ang sistema ng A.R.K para sa paglikas sa Daraga.',
      recipient: 'all',
      timestamp: 'Just now',
      read: false,
    },
  ]);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [activeToast, setActiveToast] = useState<AppNotification | null>(null);

  // Helper to dispatch notifications to specific recipients
  const dispatchNotification = useCallback((notif: {
    type: AppNotification['type'];
    title: string;
    message: string;
    tagalog?: string;
    recipient: 'all' | 'rider' | 'driver' | 'shelter';
  }) => {
    const newNotif: AppNotification = {
      ...notif,
      id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      read: false,
    };

    setNotifications(prev => [newNotif, ...prev.slice(0, 25)]);
    setActiveToast(newNotif);
    playChime(notif.type === 'hazard_alert' ? 'alert' : notif.type === 'bus_full' ? 'alert' : 'info');

    // Auto-dismiss floating toast after 5 seconds
    setTimeout(() => {
      setActiveToast(current => (current?.id === newNotif.id ? null : current));
    }, 5000);
  }, []);

  // Parse URL search parameters and hash on mount (e.g. ?role=driver, ?role=rider, ?role=shelter, #rider) for 3-Phone Live Demo
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const parseUrlRole = () => {
      const searchParams = new URLSearchParams(window.location.search);
      let role = searchParams.get('role') || searchParams.get('view');

      if (!role && window.location.hash) {
        const hash = window.location.hash.replace('#', '').trim().toLowerCase();
        if (hash.includes('=')) {
          const hashParams = new URLSearchParams(hash);
          role = hashParams.get('role') || hashParams.get('view');
        } else if (['rider', 'driver', 'shelter', 'map', 'creator', 'simulator', 'phones'].includes(hash)) {
          role = hash === 'phones' ? 'simulator' : hash;
        }
      }

      if (['rider', 'driver', 'shelter', 'map', 'simulator', 'phones'].includes(role || '')) {
        setUserTab((role === 'phones' ? 'simulator' : role) as any);
        setAppMode('user');
      } else if (role === 'creator') {
        setAppMode('creator');
      }
    };

    parseUrlRole();
    window.addEventListener('popstate', parseUrlRole);
    window.addEventListener('hashchange', parseUrlRole);
    return () => {
      window.removeEventListener('popstate', parseUrlRole);
      window.removeEventListener('hashchange', parseUrlRole);
    };
  }, []);

  // Fetch initial data
  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/initial-data');
      if (res.ok) {
        const data = await res.json();
        setShelters(data.shelters);
        setVehicles(data.vehicles);
        setResidents(data.residents);
        setMedicalFacilities(data.medicalFacilities);
        setTransportHubs(data.transportHubs);
        setWeatherState(data.weatherState);
        setScenarios(data.testCaseScenarios);

        if (!activeRiderId && data.residents && data.residents.length > 0) {
          setActiveRiderId(data.residents[0].id);
        }
      }
    } catch (err) {
      console.error('Failed to load initial data:', err);
    } finally {
      setLoading(false);
    }
  }, [activeRiderId]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 6000);
    return () => clearInterval(interval);
  }, [fetchData]);

  // Handle Rider Request
  const handleSubmitRiderRequest = async (formData: {
    name: string;
    phone: string;
    age: number;
    need: Resident['need'];
    notes: string;
    barangay: string;
    lon: number;
    lat: number;
  }) => {
    const res = await fetch('/api/residents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData),
    });
    if (res.ok) {
      const result = await res.json();
      if (result.resident) {
        setActiveRiderId(result.resident.id);
      }
      await fetchData();

      // Dispatch Notifications to Rider and Driver
      dispatchNotification({
        type: 'driver_assigned',
        title: 'Driver Assigned & En Route',
        message: `BUS-01 (Driver Kuya Ramon) assigned to pick up ${formData.name} at ${formData.barangay}.`,
        tagalog: `Paparating na po ang BUS-01 (Kuya Ramon) para sunduin si ${formData.name}.`,
        recipient: 'rider',
      });

      dispatchNotification({
        type: 'new_rider',
        title: 'New Priority Rider Added',
        message: `${formData.name} (Age: ${formData.age}, ${formData.need}) requested pickup at ${formData.barangay}. Route updated.`,
        tagalog: `May bagong saklolo: ${formData.name} sa ${formData.barangay}. Naidagdag sa ruta.`,
        recipient: 'driver',
      });
    } else {
      throw new Error('Failed to submit request');
    }
  };

  // Handle Driver "Bus Full"
  const handleMarkBusFull = async (vehicleId: string) => {
    const res = await fetch(`/api/vehicles/${vehicleId}/full`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    if (res.ok) {
      await fetchData();

      // Dispatch Notifications to Rider and Driver
      dispatchNotification({
        type: 'bus_full',
        title: 'Bus Marked Full & Overflow Handled',
        message: `${vehicleId} reached maximum capacity. Unserved riders queued for next accessible bus.`,
        recipient: 'driver',
      });

      dispatchNotification({
        type: 'bus_full',
        title: 'Bus is Full — Please Wait for Next Bus',
        message: 'The assigned bus is currently full. You are priority queued for the next rescue vehicle. Please remain safe.',
        tagalog: 'Puno na po ang unang bus. Naka-priority po kayo sa susunod na sasakyan. Manatili po sa ligtas na lugar.',
        recipient: 'rider',
      });
    }
  };

  // Handle Driver Advance Stop
  const handleAdvanceStop = async (vehicleId: string) => {
    const res = await fetch(`/api/vehicles/${vehicleId}/advance-stop`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    if (res.ok) {
      await fetchData();
    }
  };

  // Handle Shelter Full toggle
  const handleToggleShelterFull = async (shelterId: number) => {
    const res = await fetch(`/api/shelters/${shelterId}/toggle-full`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    if (res.ok) {
      await fetchData();

      const sh = shelters.find(s => s.id === shelterId);
      const shName = sh ? sh.name : 'Burgos Covered Court';

      dispatchNotification({
        type: 'shelter_full',
        title: 'Shelter Capacity Reached',
        message: `${shName} marked at capacity. Buses automatically rerouted to next nearest accessible shelter.`,
        recipient: 'driver',
      });

      dispatchNotification({
        type: 'shelter_full',
        title: 'Station Marked Full',
        message: `${shName} capacity reached. Inbound evacuees diverted to secondary shelters.`,
        recipient: 'shelter',
      });
    }
  };

  // Handle Shelter Wheelchair toggle
  const handleToggleWheelchair = async (shelterId: number) => {
    const res = await fetch(`/api/shelters/${shelterId}/toggle-wheelchair`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    if (res.ok) {
      await fetchData();
    }
  };

  // Handle Scenario Select (testCases.py)
  const handleSelectScenario = async (scenarioId: string) => {
    const res = await fetch('/api/forecast/preset', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ preset: scenarioId }),
    });
    if (res.ok) {
      const updatedWeather = await res.json();
      setWeatherState(updatedWeather);
      await fetchData();

      // Dispatch Hazard Warnings to all roles
      const scenarioObj = scenarios.find(s => s.id === scenarioId);
      const hazardTitle = scenarioObj ? scenarioObj.hazard : 'Severe Weather Hazard';

      dispatchNotification({
        type: 'hazard_alert',
        title: `EMERGENCY ALERT: ${hazardTitle} Warning Issued`,
        message: `High risk detected from 50-year Daraga historical model. Priority evacuation protocol active for seniors and PWDs.`,
        tagalog: `BABALA SA KALAMIDAD: May banta ng ${hazardTitle}. Nagsisimula na ang libreng paglikas sa Daraga.`,
        recipient: 'all',
      });

      dispatchNotification({
        type: 'hazard_alert',
        title: 'Action Required: Request Evacuation Bus',
        message: 'Weather hazard alert in effect. Please request your accessible pickup bus now.',
        tagalog: 'May babala sa panahon. Pindutin po ang Request Bus para magpasundo nang maaga.',
        recipient: 'rider',
      });

      dispatchNotification({
        type: 'hazard_alert',
        title: 'Fleet Mobilization: Hazard Active',
        message: 'Prepare accessible vehicles. Dijkstra routes calculated avoiding flooded segments.',
        recipient: 'driver',
      });

      dispatchNotification({
        type: 'hazard_alert',
        title: 'Shelter Alert: Inbound Evacuees Expected',
        message: 'Confirm wheelchair access ramps and intake capacity for incoming evacuees.',
        recipient: 'shelter',
      });
    }
  };

  // Handle Live Autonomous Demo Run with Custom Person
  const handleRunLiveDemoSimulation = async (customPerson: any) => {
    const res = await fetch('/api/demo/run-scenario', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        scenarioId: 'typhoon_warning',
        customPerson,
      }),
    });
    const data = await res.json();
    await fetchData();

    const targetVehicle = data.vehicles?.find((v: any) => v.id === 'VAN-02') || vehicles[0];
    if (data.demoRider) {
      setActiveRiderId(data.demoRider.id);
    }

    // Trigger hazard alert broadcast
    dispatchNotification({
      type: 'hazard_alert',
      title: 'TYPHOON WARNING: Autonomous Demo Active',
      message: `Evacuating ${customPerson.name} (${customPerson.barangay}) using Dijkstra shortest path.`,
      tagalog: `Pinapagana ang paglikas para kay ${customPerson.name} sa ${customPerson.barangay}.`,
      recipient: 'all',
    });

    return { vehicle: targetVehicle, demoRider: data.demoRider };
  };

  // Real-time Vehicle Position Tick Update
  const handleUpdateVehiclePosition = (vehicleId: string, coords: [number, number]) => {
    setAnimatedVehicleId(vehicleId);
    setAnimatedCoords(coords);
  };

  // Handle Reset Demo
  const handleResetApp = async () => {
    setAnimatedVehicleId(null);
    setAnimatedCoords(null);
    setIsVehicleStopped(false);
    setVehicleStopLabel(undefined);
    const res = await fetch('/api/demo/reset', { method: 'POST' });
    if (res.ok) {
      await fetchData();
      dispatchNotification({
        type: 'general',
        title: 'System Reset Complete',
        message: 'All vehicles, riders, and shelters restored to baseline status.',
        recipient: 'all',
      });
    }
  };

  // Handle Road Blockage
  const handleBlockRoad = async (edgeId: number, blocked: boolean, floodPenalty?: number) => {
    await fetch('/api/roads/block', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ edgeId, blocked, floodPenalty }),
    });
    await fetchData();
  };

  if (loading || !weatherState) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-200 p-4 space-y-4">
        <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
        <h1 className="text-xl font-black text-amber-400">Loading A.R.K Evacuation System...</h1>
        <p className="text-xs text-slate-400 font-mono">Parsing 28,465 Daraga road nodes &amp; 162 shelter candidates...</p>
      </div>
    );
  }

  return (
    <div
      className={`min-h-screen flex flex-col bg-slate-950 text-slate-100 ${
        highContrast ? 'high-contrast-mode' : ''
      } ${largeText ? 'text-lg' : 'text-base'}`}
    >
      {/* 1. TOP HEADER & ACCESSIBILITY CONTROLS */}
      <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-40 shadow-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3">
          {/* Logo & Branding: A.R.K */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-slate-950 shadow-md ring-2 ring-amber-400/50">
              <Shield className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                  A.R.K
                </h1>
                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 uppercase tracking-widest">
                  Daraga, Albay
                </span>
              </div>
              <p className="text-[11px] text-amber-300/90 font-medium hidden sm:block">
                Accessible, Rescue, and Kinship &bull; Older Adults &amp; PWD Evacuation
              </p>
            </div>
          </div>

          {/* TOP CONTROLS: CREATOR VS USER VIEW + 3-PHONE + NOTIFICATIONS */}
          <div className="flex flex-wrap items-center gap-2">
            {/* View Mode Switcher: User View vs Creator View */}
            <div className="bg-slate-950 p-1 rounded-2xl border border-slate-800 flex items-center gap-1">
              <button
                onClick={() => setAppMode('user')}
                className={`px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer ${
                  appMode === 'user'
                    ? 'bg-amber-500 text-slate-950 shadow-md ring-1 ring-amber-400'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <UserCheck className="w-3.5 h-3.5" />
                <span>User View</span>
              </button>

              <button
                onClick={() => setAppMode('creator')}
                className={`px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer ${
                  appMode === 'creator'
                    ? 'bg-amber-500 text-slate-950 shadow-md ring-1 ring-amber-400'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <LayoutDashboard className="w-3.5 h-3.5" />
                <span>Creator View</span>
              </button>
            </div>

            {/* 3-Phone / Install on Phone Modal Trigger */}
            <button
              onClick={() => setShowPhoneModal(true)}
              className="px-2.5 py-1.5 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 flex items-center gap-1 transition-colors cursor-pointer"
              title="Open QR Code and install on 3 phones"
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">📱 3 Phones / PWA</span>
            </button>

            {/* Notification Bell with Chime & Dropdown Drawer */}
            <NotificationCenter
              notifications={notifications}
              isOpen={isNotifOpen}
              onToggle={() => setIsNotifOpen(!isNotifOpen)}
              onDismiss={id => setNotifications(prev => prev.filter(n => n.id !== id))}
              onClearAll={() => setNotifications([])}
              currentRole={userTab === 'driver' ? 'driver' : userTab === 'shelter' ? 'shelter' : 'rider'}
              activeToast={activeToast}
              onDismissToast={() => setActiveToast(null)}
            />

            {/* Accessibility Buttons */}
            <button
              onClick={() => setHighContrast(!highContrast)}
              className={`px-2.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer ${
                highContrast
                  ? 'bg-amber-400 text-slate-950 ring-2 ring-amber-300'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700'
              }`}
            >
              <Contrast className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{highContrast ? 'Contrast: ON' : 'Contrast'}</span>
            </button>

            <button
              onClick={() => setLargeText(!largeText)}
              className={`px-2.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer ${
                largeText
                  ? 'bg-blue-500 text-white ring-2 ring-blue-300'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{largeText ? 'Text: LARGE' : 'Large Text'}</span>
            </button>

            {/* Live Demo Trigger */}
            <button
              onClick={() => setShowLiveDemo(!showLiveDemo)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shadow-lg transition-all cursor-pointer ${
                showLiveDemo
                  ? 'bg-amber-400 text-slate-950 ring-4 ring-amber-400/40'
                  : 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 shadow-amber-500/20 active:scale-95'
              }`}
            >
              <Sparkles className="w-4 h-4 fill-current" />
              <span>{showLiveDemo ? 'Hide Demo' : '▶ Live Demo'}</span>
            </button>
          </div>
        </div>

        {/* 2. HAZARD WARNING BANNER */}
        <HazardWarningBanner
          weather={weatherState}
          scenarios={scenarios}
          onSelectScenario={handleSelectScenario}
          onResetDemo={handleResetApp}
          onOpenLiveDemoModal={() => {
            setShowLiveDemo(true);
            if (appMode === 'user') setUserTab('map');
          }}
          highContrast={highContrast}
        />

        {/* 3. USER VIEW: 3-PHONE ROLE QUICK TOGGLE & INTERFACE TABS */}
        {appMode === 'user' && (
          <div className="bg-slate-900 border-t border-slate-800 px-4 sm:px-6">
            <div className="max-w-7xl mx-auto flex items-center justify-between gap-2 overflow-x-auto py-2.5">
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-[11px] font-black uppercase text-amber-400 mr-1 hidden md:inline">
                  3-Phone Live Demo:
                </span>
                {[
                  {
                    id: 'rider',
                    label: '📱 Phone 1: Rider',
                    sub: 'Elderly / PWD Request (Bilingual)',
                    icon: <Users className="w-4 h-4" />,
                  },
                  {
                    id: 'driver',
                    label: '🚐 Phone 2: Driver',
                    sub: 'BUS-01 Console (Kuya Ramon)',
                    icon: <Truck className="w-4 h-4" />,
                  },
                  {
                    id: 'shelter',
                    label: '🏠 Phone 3: Shelter',
                    sub: 'Burgos Covered Court Station',
                    icon: <Home className="w-4 h-4" />,
                  },
                  {
                    id: 'simulator',
                    label: '📱 3-Phone Live View',
                    sub: 'Triple Synchronized Simulator',
                    icon: <Layers className="w-4 h-4" />,
                  },
                  {
                    id: 'map',
                    label: '🗺️ Live Daraga Map',
                    sub: 'Road Network & Moving Buses',
                    icon: <MapIcon className="w-4 h-4" />,
                  },
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setUserTab(tab.id as any)}
                    className={`px-3.5 py-2 rounded-2xl font-bold text-xs sm:text-sm flex items-center gap-2 transition-all shrink-0 cursor-pointer ${
                      userTab === tab.id
                        ? 'bg-amber-500 text-slate-950 shadow-lg ring-2 ring-amber-400 font-extrabold'
                        : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800 hover:text-white border border-slate-700/60'
                    }`}
                  >
                    {tab.icon}
                    <div className="text-left">
                      <div className="font-extrabold leading-tight">{tab.label}</div>
                      <div className="text-[10px] opacity-75 font-normal leading-none hidden lg:block">
                        {tab.sub}
                      </div>
                    </div>
                  </button>
                ))}
              </div>

              {/* Quick Link to open on mobile */}
              <button
                onClick={() => setShowPhoneModal(true)}
                className="text-xs text-amber-300 hover:text-amber-200 underline flex items-center gap-1 shrink-0 ml-auto"
              >
                <span>Setup on 3 Phones</span>
              </button>
            </div>
          </div>
        )}
      </header>

      {/* 4. MAIN CONTENT */}
      <main className="flex-1 py-6 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Autonomous Live Demo Controller */}
          {showLiveDemo && (
            <LiveDemoController
              scenarios={scenarios}
              activeScenarioId={weatherState.scenario}
              onSelectScenario={handleSelectScenario}
              onRunLiveDemoSimulation={handleRunLiveDemoSimulation}
              onUpdateVehiclePosition={handleUpdateVehiclePosition}
              onAdvanceStop={handleAdvanceStop}
              onMarkBusFull={handleMarkBusFull}
              onToggleShelterFull={handleToggleShelterFull}
              onResetApp={handleResetApp}
              onSwitchToMap={() => {
                setAppMode('user');
                setUserTab('map');
              }}
              onVehicleStopStatusChange={(isStopped, label) => {
                setIsVehicleStopped(isStopped);
                setVehicleStopLabel(label);
              }}
            />
          )}

          {/* CREATOR VIEW: Comprehensive EOC Dispatch Dashboard */}
          {appMode === 'creator' && (
            <div className="space-y-6">
              <CreatorDashboard
                residents={residents}
                vehicles={vehicles}
                shelters={shelters}
                weather={weatherState}
                onMarkBusFull={handleMarkBusFull}
                onToggleShelterFull={handleToggleShelterFull}
                onToggleWheelchair={handleToggleWheelchair}
                onBlockRoad={handleBlockRoad}
                onRefreshData={fetchData}
                highContrast={highContrast}
              />

              {/* Also embed the full Map in Creator View */}
              <div className="space-y-3">
                <h3 className="text-lg font-black text-white flex items-center gap-2">
                  <MapIcon className="w-5 h-5 text-amber-400" />
                  EOC Spatial Road Graph &amp; Fleet Overview
                </h3>
                <DaragaMap
                  shelters={shelters}
                  vehicles={vehicles}
                  residents={residents}
                  medicalFacilities={medicalFacilities}
                  transportHubs={transportHubs}
                  highContrast={highContrast}
                  animatedVehicleId={animatedVehicleId}
                  animatedCoords={animatedCoords}
                  isUserView={false}
                  isVehicleStopped={isVehicleStopped}
                  vehicleStopLabel={vehicleStopLabel}
                />
              </div>
            </div>
          )}

          {/* USER VIEW: Dedicated Isolated Interfaces for Rider, Driver, Shelter, Map */}
          {appMode === 'user' && (
            <>
              {userTab === 'rider' && (
                <RiderInterface
                  residents={residents}
                  vehicles={vehicles}
                  shelters={shelters}
                  onSubmitRequest={handleSubmitRiderRequest}
                  highContrast={highContrast}
                  activeRiderId={activeRiderId}
                  onSelectActiveRider={id => setActiveRiderId(id)}
                />
              )}

              {userTab === 'driver' && (
                <DriverInterface
                  vehicles={vehicles}
                  residents={residents}
                  shelters={shelters}
                  onMarkBusFull={handleMarkBusFull}
                  onAdvanceStop={handleAdvanceStop}
                  highContrast={highContrast}
                />
              )}

              {userTab === 'shelter' && (
                <ShelterInterface
                  shelters={shelters}
                  vehicles={vehicles}
                  onToggleShelterFull={handleToggleShelterFull}
                  onToggleWheelchair={handleToggleWheelchair}
                  highContrast={highContrast}
                />
              )}

              {userTab === 'simulator' && (
                <TriplePhoneSimulator
                  residents={residents}
                  vehicles={vehicles}
                  shelters={shelters}
                  onSubmitRiderRequest={handleSubmitRiderRequest}
                  onMarkBusFull={handleMarkBusFull}
                  onAdvanceStop={handleAdvanceStop}
                  onToggleShelterFull={handleToggleShelterFull}
                  onToggleWheelchair={handleToggleWheelchair}
                  onOpenPhoneModal={() => setShowPhoneModal(true)}
                  onSelectSingleRole={role => setUserTab(role)}
                  highContrast={highContrast}
                  activeRiderId={activeRiderId}
                  onSelectActiveRider={id => setActiveRiderId(id)}
                />
              )}

              {userTab === 'map' && (
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-slate-900 border border-slate-800 p-4 rounded-2xl">
                    <div>
                      <h3 className="text-lg font-black text-white flex items-center gap-2">
                        <MapIcon className="w-5 h-5 text-amber-400" />
                        Daraga Road Network &bull; Live Real-Time Vehicle Tracker
                      </h3>
                      <p className="text-xs text-slate-400">
                        Route lines computed with Dijkstra shortest path. Individual rider details hidden for privacy.
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setShowLiveDemo(!showLiveDemo)}
                        className="px-3.5 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        {showLiveDemo ? 'Hide Demo Controls' : 'Show Live Demo Controls'}
                      </button>
                      <button
                        onClick={fetchData}
                        className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <RefreshCw className="w-3.5 h-3.5" /> Refresh State
                      </button>
                    </div>
                  </div>

                  {/* Fix: onMapClickLocation removed so clicking map does NOT switch away! isUserView=true enforces privacy */}
                  <DaragaMap
                    shelters={shelters}
                    vehicles={vehicles}
                    residents={residents}
                    medicalFacilities={medicalFacilities}
                    transportHubs={transportHubs}
                    highContrast={highContrast}
                    animatedVehicleId={animatedVehicleId}
                    animatedCoords={animatedCoords}
                    isUserView={true}
                    isVehicleStopped={isVehicleStopped}
                    vehicleStopLabel={vehicleStopLabel}
                  />
                </div>
              )}
            </>
          )}
        </div>
      </main>

      {/* 5. PHONE DEMO & PWA SETUP MODAL */}
      <PhoneDemoModal
        isOpen={showPhoneModal}
        onClose={() => setShowPhoneModal(false)}
        onSelectRole={role => {
          setAppMode('user');
          setUserTab(role);
        }}
        currentRole={userTab}
      />

      {/* FOOTER: A.R.K */}
      <footer className="bg-slate-900 border-t border-slate-800 py-4 px-6 text-xs text-slate-400 mt-auto">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-2 text-center sm:text-left">
          <div>
            <strong className="text-slate-200">A.R.K &bull; Accessible, Rescue, and Kinship</strong> &bull; Evacuation Response System for Daraga, Albay.
          </div>
          <div className="text-[11px] text-slate-500">
            Dijkstra road routing &bull; 50-yr PastWeather.csv Random Forest model &bull; PWA Multi-Device Ready
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;

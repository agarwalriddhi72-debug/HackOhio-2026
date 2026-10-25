import React, { useState, useEffect, useCallback } from 'react';
import { Resident, Vehicle, Shelter, WeatherState, TestCaseScenario } from './types';
import { HazardWarningBanner } from './components/HazardWarningBanner';
import { RiderInterface } from './components/RiderInterface';
import { DriverInterface } from './components/DriverInterface';
import { ShelterInterface } from './components/ShelterInterface';
import { DaragaMap } from './components/DaragaMap';
import { CreatorDashboard } from './components/CreatorDashboard';
import { LiveDemoController } from './components/LiveDemoController';
import { NotificationCenter, AppNotification, playChime, triggerVibration, triggerSystemNotification, speakDisasterAlert } from './components/NotificationCenter';
import { PhoneDemoModal } from './components/PhoneDemoModal';
import { TriplePhoneSimulator } from './components/TriplePhoneSimulator';
import { PhoneSpecificApp } from './components/PhoneSpecificApp';
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
  // Top-level mode toggle: "User View" vs "Creator View" vs "Phone App"
  // Default to 'phone' as requested ("just give me the phone version for now")
  const [appMode, setAppMode] = useState<'user' | 'creator' | 'phone'>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const mode = params.get('mode');
      if (mode === 'user' || mode === 'creator' || mode === 'phone') {
        return mode;
      }
    }
    return 'user'; // Desktop is the default view
  });

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

  // Sound & Device Notification Unlock State
  const [soundUnlocked, setSoundUnlocked] = useState(false);
  const seenNotifIdsRef = React.useRef<Set<string>>(new Set());
  const prevWeatherScenarioRef = React.useRef<string | null>(null);
  const isFirstLoadRef = React.useRef<boolean>(true);

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

  // Auto-unlock audio and haptics on first tap/click
  const handleUnlockSound = useCallback(() => {
    setSoundUnlocked(true);
    playChime('success');
    triggerVibration([200, 100, 200]);
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {});
    }
  }, []);

  useEffect(() => {
    const handleFirstInteraction = () => {
      setSoundUnlocked(true);
    };
    window.addEventListener('click', handleFirstInteraction, { once: true });
    window.addEventListener('touchstart', handleFirstInteraction, { once: true });
    return () => {
      window.removeEventListener('click', handleFirstInteraction);
      window.removeEventListener('touchstart', handleFirstInteraction);
    };
  }, []);

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

    seenNotifIdsRef.current.add(newNotif.id);
    setNotifications(prev => [newNotif, ...prev.slice(0, 25)]);

    // Only show intrusive floating toast for critical emergency actions, suppressing notification fatigue
    const isCritical =
      notif.type === 'hazard_alert' ||
      notif.type === 'bus_full' ||
      notif.type === 'driver_assigned';

    if (isCritical) {
      setActiveToast(newNotif);
      playChime(notif.type === 'hazard_alert' ? 'alert' : 'info');
      triggerVibration(notif.type === 'hazard_alert' ? [400, 200, 400, 200, 600] : [150, 80, 150]);
      triggerSystemNotification(notif.title, notif.message);
    }

    // Sync to server so any other connected phone also receives this notification!
    fetch('/api/notifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(notif),
    }).catch(() => {});

    // Auto-dismiss floating toast after 4 seconds (reduced from 7s to prevent clutter)
    setTimeout(() => {
      setActiveToast(current => (current?.id === newNotif.id ? null : current));
    }, 4000);
  }, []);

  // Parse URL search parameters and hash on mount (e.g. ?role=driver, ?role=rider, ?role=shelter, #rider) for 3-Phone Live Demo
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const parseUrlRole = () => {
      const searchParams = new URLSearchParams(window.location.search);
      let role = searchParams.get('role') || searchParams.get('view');
      const mode = searchParams.get('mode') || searchParams.get('device') || searchParams.get('app');

      if (mode === 'phone' || mode === 'mobile') {
        setAppMode('phone');
      } else if (mode === 'creator') {
        setAppMode('creator');
      } else if (mode === 'user' || mode === 'desktop') {
        setAppMode('user');
      }

      if (!role && window.location.hash) {
        const hash = window.location.hash.replace('#', '').trim().toLowerCase();
        if (hash.includes('=')) {
          const hashParams = new URLSearchParams(hash);
          role = hashParams.get('role') || hashParams.get('view');
          const hashMode = hashParams.get('mode') || hashParams.get('device');
          if (hashMode === 'phone' || hashMode === 'mobile') {
            setAppMode('phone');
          }
        } else if (['rider', 'driver', 'shelter', 'map', 'creator', 'simulator', 'phones', 'phone'].includes(hash)) {
          if (hash === 'phone') {
            setAppMode('phone');
          } else {
            role = hash === 'phones' ? 'simulator' : hash;
          }
        }
      }

      if (['rider', 'driver', 'shelter', 'map', 'simulator', 'phones'].includes(role || '')) {
        setUserTab((role === 'phones' ? 'simulator' : role) as any);
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

  // Fetch initial data & poll server for state & notification sync
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

        // Process Server-Synced Notifications
        if (data.notifications && Array.isArray(data.notifications)) {
          const incomingList: AppNotification[] = data.notifications;
          setNotifications(incomingList);

          // Detect new notifications not yet seen
          let latestNewNotif: AppNotification | null = null;
          for (const n of incomingList) {
            if (!seenNotifIdsRef.current.has(n.id)) {
              seenNotifIdsRef.current.add(n.id);
              if (!latestNewNotif) {
                latestNewNotif = n;
              }
            }
          }

          if (latestNewNotif) {
            // Only interrupt user with audio / toast if it is a genuine new hazard alert
            if (!isFirstLoadRef.current && latestNewNotif.type === 'hazard_alert') {
              setActiveToast(latestNewNotif);
              playChime('alert');
              triggerVibration([400, 200, 400, 200, 600]);
              triggerSystemNotification(latestNewNotif.title, latestNewNotif.message);
            }
          }
        }

        // Check if weather scenario changed to an active alert
        if (data.weatherState) {
          if (
            !isFirstLoadRef.current &&
            prevWeatherScenarioRef.current &&
            prevWeatherScenarioRef.current !== data.weatherState.scenario &&
            data.weatherState.status === 'ALERT_ACTIVE'
          ) {
            const alertNotif: AppNotification = {
              id: `weather-change-${Date.now()}`,
              type: 'hazard_alert',
              title: `EMERGENCY ALERT: ${data.weatherState.scenarioName}`,
              message: `Active hazard warning in effect for Daraga, Albay. Priority accessible evacuation bus protocol active.`,
              tagalog: `BABALA SA KALAMIDAD: May banta ng ${data.weatherState.primaryDisaster || 'kalamidad'}. Nagsisimula na ang libreng paglikas.`,
              recipient: 'all',
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              read: false,
            };
            setActiveToast(alertNotif);
            playChime('alert');
            triggerVibration([400, 200, 400, 200, 600]);
            triggerSystemNotification(alertNotif.title, alertNotif.message);
          }
          prevWeatherScenarioRef.current = data.weatherState.scenario;
        }

        isFirstLoadRef.current = false;
      }
    } catch (err) {
      console.error('Failed to load initial data:', err);
    } finally {
      setLoading(false);
    }
  }, [activeRiderId]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 3500);
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

  // DEDICATED PHONE SPECIFIC VERSION
  if (appMode === 'phone') {
    return (
      <div className={highContrast ? 'high-contrast-mode' : ''}>
        <PhoneSpecificApp
          residents={residents}
          vehicles={vehicles}
          shelters={shelters}
          weather={weatherState}
          scenarios={scenarios}
          notifications={notifications}
          onSubmitRiderRequest={handleSubmitRiderRequest}
          onMarkBusFull={handleMarkBusFull}
          onAdvanceStop={handleAdvanceStop}
          onToggleShelterFull={handleToggleShelterFull}
          onToggleWheelchair={handleToggleWheelchair}
          onRefreshData={fetchData}
          onDispatchNotification={dispatchNotification}
          activeRiderId={activeRiderId}
          onSelectActiveRider={setActiveRiderId}
          highContrast={highContrast}
          onToggleHighContrast={() => setHighContrast(!highContrast)}
          onSwitchToDesktop={() => setAppMode('user')}
          onSwitchToCreator={() => setAppMode('creator')}
          initialRole={userTab as any}
        />
      </div>
    );
  }

  return (
    <div
      className={`min-h-screen flex flex-col bg-slate-950 text-slate-100 ${
        highContrast ? 'high-contrast-mode' : ''
      } ${largeText ? 'text-lg' : 'text-base'}`}
    >
      {/* 1. TOP HEADER & PRIMARY NAVIGATION */}
      <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-40 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-4">
          {/* Logo & Branding: A.R.K */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-9 h-9 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center shadow-md">
              <Shield className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-black tracking-tight text-white">A.R.K</span>
                <span className="text-[11px] font-semibold text-amber-400">Daraga</span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium hidden sm:block">
                Accessible Evacuation Planning
              </p>
            </div>
          </div>

          {/* Primary View Switcher: User View | Creator View | Phone View */}
          <nav aria-label="Main Navigation" className="flex items-center gap-1 p-1 bg-slate-950/80 rounded-xl border border-slate-800">
            <button
              onClick={() => setAppMode('user')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 ${
                appMode === 'user'
                  ? 'bg-amber-500 text-slate-950 shadow-sm font-bold'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Desktop View</span>
            </button>

            <button
              onClick={() => setAppMode('creator')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 ${
                appMode === 'creator'
                  ? 'bg-amber-500 text-slate-950 shadow-sm font-bold'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              <span>Creator View</span>
            </button>

            <button
              onClick={() => setAppMode('phone')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 ${
                (appMode as string) === 'phone'
                  ? 'bg-amber-500 text-slate-950 shadow-sm font-bold'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>Phone View</span>
            </button>
          </nav>

          {/* Right Utility Actions */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Phone Modal / QR link */}
            <button
              onClick={() => setShowPhoneModal(true)}
              className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Open QR Code to connect mobile phones"
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Connect Phone</span>
            </button>

            {/* Notification Bell */}
            <NotificationCenter
              notifications={notifications}
              isOpen={isNotifOpen}
              onToggle={() => setIsNotifOpen(!isNotifOpen)}
              onDismiss={id => setNotifications(prev => prev.filter(n => n.id !== id))}
              onClearAll={() => setNotifications([])}
              currentRole={userTab === 'driver' ? 'driver' : userTab === 'shelter' ? 'shelter' : 'rider'}
              activeToast={activeToast}
              onDismissToast={() => setActiveToast(null)}
              soundEnabled={soundUnlocked}
              onEnableSound={handleUnlockSound}
            />

            {/* Contrast Toggle */}
            <button
              onClick={() => setHighContrast(!highContrast)}
              className={`p-1.5 rounded-lg text-xs font-semibold flex items-center transition-colors cursor-pointer ${
                highContrast
                  ? 'bg-amber-400 text-slate-950'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700'
              }`}
              title="Toggle High Contrast Mode"
            >
              <Contrast className="w-4 h-4" />
            </button>

            {/* Live Demo Walkthrough Toggle */}
            <button
              onClick={() => setShowLiveDemo(!showLiveDemo)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                showLiveDemo
                  ? 'bg-amber-400 text-slate-950'
                  : 'bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{showLiveDemo ? 'Close Demo' : 'Live Demo'}</span>
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
            <div className="space-y-6">
              {/* Role Selection Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900 border border-slate-800 p-2 rounded-2xl shadow-sm">
                <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-2 hidden sm:inline">Role:</span>
                  {[
                    { id: 'rider', label: 'Evacuee (Rider)', icon: <Users className="w-3.5 h-3.5" /> },
                    { id: 'driver', label: 'Driver', icon: <Truck className="w-3.5 h-3.5" /> },
                    { id: 'shelter', label: 'Shelter', icon: <Home className="w-3.5 h-3.5" /> },
                    { id: 'map', label: 'Live Map', icon: <MapIcon className="w-3.5 h-3.5" /> },
                    { id: 'simulator', label: '3-Phone Simulator', icon: <Layers className="w-3.5 h-3.5" /> },
                  ].map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setUserTab(tab.id as any)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 ${
                        userTab === tab.id
                          ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                          : 'text-slate-300 hover:text-white hover:bg-slate-800'
                      }`}
                    >
                      {tab.icon}
                      <span>{tab.label}</span>
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-2 pr-2 text-xs text-slate-400 hidden md:flex">
                  <span>Selected: <strong className="text-slate-200 capitalize">{userTab === 'rider' ? 'Evacuee / Rider' : userTab}</strong></span>
                </div>
              </div>
              {userTab === 'rider' && (
                <RiderInterface
                  residents={residents}
                  vehicles={vehicles}
                  shelters={shelters}
                  onSubmitRequest={handleSubmitRiderRequest}
                  highContrast={highContrast}
                  activeRiderId={activeRiderId}
                  onSelectActiveRider={id => setActiveRiderId(id)}
                  weather={weatherState}
                  soundUnlocked={soundUnlocked}
                  onUnlockSound={handleUnlockSound}
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
            </div>
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
        onSwitchToPhoneApp={(role) => {
          if (role) setUserTab(role);
          setAppMode('phone');
          setShowPhoneModal(false);
        }}
        onTriggerTestAlert={() => {
          dispatchNotification({
            type: 'hazard_alert',
            title: '🚨 EMERGENCY ALERT: Typhoon Warning Issued',
            message: 'Active hazard warning in effect for Daraga, Albay. Priority accessible evacuation bus protocol active.',
            tagalog: 'BABALA SA KALAMIDAD: May banta ng Bagyo. Nagsisimula na ang libreng paglikas.',
            recipient: 'all',
          });
        }}
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

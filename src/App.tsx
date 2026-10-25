import React, { useState, useEffect, useCallback } from 'react';
import { Resident, Vehicle, Shelter, WeatherState, TestCaseScenario } from './types';
import { HazardWarningBanner } from './components/HazardWarningBanner';
import { RiderInterface } from './components/RiderInterface';
import { DriverInterface } from './components/DriverInterface';
import { ShelterInterface } from './components/ShelterInterface';
import { DaragaMap } from './components/DaragaMap';
import { DemoSimulationModal } from './components/DemoSimulationModal';
import { Shield, Users, Truck, Home, Map as MapIcon, Sparkles, Eye, Contrast, RefreshCw } from 'lucide-react';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'rider' | 'driver' | 'shelter' | 'map'>('rider');
  const [highContrast, setHighContrast] = useState<boolean>(false);
  const [largeText, setLargeText] = useState<boolean>(false);
  const [isDemoModalOpen, setIsDemoModalOpen] = useState<boolean>(false);

  // App Data State
  const [shelters, setShelters] = useState<Shelter[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [residents, setResidents] = useState<Resident[]>([]);
  const [medicalFacilities, setMedicalFacilities] = useState<any[]>([]);
  const [transportHubs, setTransportHubs] = useState<any[]>([]);
  const [scenarios, setScenarios] = useState<TestCaseScenario[]>([]);
  const [weatherState, setWeatherState] = useState<WeatherState | null>(null);
  const [loading, setLoading] = useState(true);

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
      }
    } catch (err) {
      console.error('Failed to load initial data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    // Poll updates every 6 seconds to keep live state synchronized across all tabs
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
      await fetchData();
    } else {
      throw new Error('Failed to submit');
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
    }
  };

  // Handle Demo Run Scenario
  const handleRunDemoScenario = async (scenarioId: string) => {
    const res = await fetch('/api/demo/run-scenario', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scenarioId }),
    });
    if (res.ok) {
      await fetchData();
    }
  };

  // Handle Reset Demo
  const handleResetDemo = async () => {
    const res = await fetch('/api/demo/reset', { method: 'POST' });
    if (res.ok) {
      await fetchData();
    }
  };

  // Simulation helpers for modal walkthrough
  const handleSimulateBusFull = async () => {
    if (vehicles.length > 0) {
      await handleMarkBusFull(vehicles[0].id);
    }
  };

  const handleSimulateShelterFull = async () => {
    if (shelters.length > 0) {
      await handleToggleShelterFull(shelters[0].id);
    }
  };

  const handleSimulateRoadBlock = async () => {
    await fetch('/api/roads/block', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ edgeId: 100, blocked: true, floodPenalty: 3.5 }),
    });
    await fetchData();
  };

  if (loading || !weatherState) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-200 p-4 space-y-4">
        <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
        <h1 className="text-xl font-black text-amber-400">Loading ROUTEY Evacuation System...</h1>
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
      <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-40 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3">
          {/* Logo & Branding */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-slate-950 shadow-md ring-2 ring-amber-400/50">
              <Shield className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                  ROUTEY
                </h1>
                <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 uppercase tracking-widest">
                  Daraga, Albay
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block">
                Accessible Evacuation Planning &bull; Older Adults &amp; PWD Transport
              </p>
            </div>
          </div>

          {/* Quick Stats & Accessibility Toggles */}
          <div className="flex items-center gap-2">
            {/* High Contrast Toggle */}
            <button
              onClick={() => setHighContrast(!highContrast)}
              title="Toggle High Contrast for Visual Clarity"
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                highContrast
                  ? 'bg-amber-400 text-slate-950 ring-2 ring-amber-300'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700'
              }`}
            >
              <Contrast className="w-3.5 h-3.5" />
              <span>{highContrast ? 'High Contrast: ON' : 'High Contrast'}</span>
            </button>

            {/* Large Text Accessibility */}
            <button
              onClick={() => setLargeText(!largeText)}
              title="Toggle Larger Text for Seniors"
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                largeText
                  ? 'bg-blue-500 text-white ring-2 ring-blue-300'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>{largeText ? 'Large Font: ON' : 'Large Font'}</span>
            </button>

            {/* Live Demo Modal Trigger */}
            <button
              onClick={() => setIsDemoModalOpen(true)}
              className="px-3.5 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 flex items-center gap-1.5 shadow-md shadow-amber-500/20 hover:from-amber-400 hover:to-amber-500 active:scale-[0.98] transition-all cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Demo Walkthrough</span>
            </button>
          </div>
        </div>

        {/* 2. HAZARD WARNING BANNER (WEATHER MODULE) */}
        <HazardWarningBanner
          weather={weatherState}
          scenarios={scenarios}
          onSelectScenario={handleSelectScenario}
          onResetDemo={handleResetDemo}
          onOpenLiveDemoModal={() => setIsDemoModalOpen(true)}
          highContrast={highContrast}
        />

        {/* 3. INTERFACE TABS SELECTOR */}
        <div className="bg-slate-900 border-t border-slate-800 px-4 sm:px-6">
          <div className="max-w-7xl mx-auto flex items-center gap-2 overflow-x-auto py-2">
            {[
              {
                id: 'rider',
                label: '1. Rider Assistance',
                sub: 'Elderly & PWD Request',
                icon: <Users className="w-4 h-4" />,
                badge: `${residents.length} Requests`,
              },
              {
                id: 'driver',
                label: '2. Driver Console',
                sub: 'Ordered Route & Bus Full',
                icon: <Truck className="w-4 h-4" />,
                badge: `${vehicles.length} Buses`,
              },
              {
                id: 'shelter',
                label: '3. Shelter Hub',
                sub: 'Shelter Full & Capacity',
                icon: <Home className="w-4 h-4" />,
                badge: `${shelters.length} Centers`,
              },
              {
                id: 'map',
                label: '4. Live Daraga Map',
                sub: 'Road Network & Dijkstra',
                icon: <MapIcon className="w-4 h-4" />,
                badge: 'Road Graph',
              },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-2 transition-all shrink-0 cursor-pointer ${
                  activeTab === tab.id
                    ? 'bg-amber-500 text-slate-950 shadow-md ring-2 ring-amber-400'
                    : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800 hover:text-white border border-slate-700/60'
                }`}
              >
                {tab.icon}
                <div className="text-left">
                  <div className="font-extrabold leading-tight">{tab.label}</div>
                  <div className="text-[10px] opacity-80 font-normal leading-none hidden sm:block">
                    {tab.sub}
                  </div>
                </div>
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono ml-1 ${
                    activeTab === tab.id ? 'bg-slate-950/20 text-slate-950' : 'bg-slate-900 text-slate-400'
                  }`}
                >
                  {tab.badge}
                </span>
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* 4. MAIN INTERFACE CONTENT */}
      <main className="flex-1 py-6 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto">
          {activeTab === 'rider' && (
            <RiderInterface
              residents={residents}
              vehicles={vehicles}
              shelters={shelters}
              onSubmitRequest={handleSubmitRiderRequest}
              highContrast={highContrast}
            />
          )}

          {activeTab === 'driver' && (
            <DriverInterface
              vehicles={vehicles}
              residents={residents}
              shelters={shelters}
              onMarkBusFull={handleMarkBusFull}
              onAdvanceStop={handleAdvanceStop}
              highContrast={highContrast}
            />
          )}

          {activeTab === 'shelter' && (
            <ShelterInterface
              shelters={shelters}
              vehicles={vehicles}
              onToggleShelterFull={handleToggleShelterFull}
              onToggleWheelchair={handleToggleWheelchair}
              highContrast={highContrast}
            />
          )}

          {activeTab === 'map' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-slate-800/80 border border-slate-700 p-4 rounded-xl">
                <div>
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <MapIcon className="w-5 h-5 text-amber-400" />
                    Daraga Municipality Routing &amp; Spatial Operations
                  </h3>
                  <p className="text-xs text-slate-300">
                    Routing graph (28,465 vertices, 29,504 edges). Click on map to place a new rider pickup pin.
                  </p>
                </div>
                <button
                  onClick={fetchData}
                  className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs font-semibold text-slate-300 hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Refresh Network State
                </button>
              </div>

              <DaragaMap
                shelters={shelters}
                vehicles={vehicles}
                residents={residents}
                medicalFacilities={medicalFacilities}
                transportHubs={transportHubs}
                highContrast={highContrast}
                onMapClickLocation={({ lon, lat }) => {
                  setActiveTab('rider');
                }}
              />
            </div>
          )}
        </div>
      </main>

      {/* 5. INTERACTIVE LIVE DEMO WALKTHROUGH MODAL */}
      <DemoSimulationModal
        isOpen={isDemoModalOpen}
        onClose={() => setIsDemoModalOpen(false)}
        weather={weatherState}
        scenarios={scenarios}
        onSelectScenario={handleSelectScenario}
        onRunDemoScenario={handleRunDemoScenario}
        onResetDemo={handleResetDemo}
        onSimulateBusFull={handleSimulateBusFull}
        onSimulateShelterFull={handleSimulateShelterFull}
        onSimulateRoadBlock={handleSimulateRoadBlock}
      />

      {/* 6. ACCESSIBLE FOOTER */}
      <footer className="bg-slate-900 border-t border-slate-800 py-4 px-6 text-xs text-slate-400">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-2 text-center sm:text-left">
          <div>
            <strong className="text-slate-200">ROUTEY &bull; Daraga Evacuation System</strong> &bull; HackOHI/O 2026. Prioritizing older adults and people with disabilities.
          </div>
          <div className="text-[11px] text-slate-500">
            Dijkstra road routing on OpenStreetMap Daraga extract &bull; Random Forest hazard forecasting
          </div>
        </div>
      </footer>
    </div>
  );
};
export default App;

import React, { useState } from 'react';
import { WeatherState, TestCaseScenario } from '../types';
import { AlertTriangle, CloudRain, Wind, Mountain, ShieldCheck, ChevronDown, ChevronUp, Sliders, RefreshCw } from 'lucide-react';

interface Props {
  weather: WeatherState;
  scenarios: TestCaseScenario[];
  onSelectScenario: (scenarioId: string) => void;
  onResetDemo: () => void;
  onOpenLiveDemoModal: () => void;
  highContrast: boolean;
}

export const HazardWarningBanner: React.FC<Props> = ({
  weather,
  scenarios,
  onSelectScenario,
  onResetDemo,
  onOpenLiveDemoModal,
  highContrast,
}) => {
  const [showDetails, setShowDetails] = useState(false);
  const [showScenarioMenu, setShowScenarioMenu] = useState(false);

  const isAlertActive = weather.status === 'ALERT_ACTIVE';
  const primaryAlert = weather.alerts[0];

  const getHazardIcon = (hazardName: string) => {
    switch (hazardName) {
      case 'Cyclone / Typhoon':
        return <Wind className="w-5 h-5 text-amber-300" />;
      case 'Flash Flood':
        return <CloudRain className="w-5 h-5 text-blue-300" />;
      case 'Volcanic Lahar':
        return <Mountain className="w-5 h-5 text-red-300" />;
      case 'Rain-Induced Landslide':
        return <AlertTriangle className="w-5 h-5 text-orange-300" />;
      default:
        return <AlertTriangle className="w-5 h-5 text-amber-300" />;
    }
  };

  return (
    <aside aria-label="Hazard early warning" className="w-full border-b border-slate-800">
      {/* Primary Emergency Bar */}
      <div
        className={`px-4 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-3 text-sm transition-colors ${
          isAlertActive
            ? highContrast
              ? 'bg-amber-950 text-amber-100 border-b border-amber-600'
              : 'bg-red-950/80 text-red-100 border-b border-red-800/60'
            : 'bg-slate-900/90 text-slate-300'
        }`}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div
            className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
              isAlertActive ? 'bg-red-900/60 text-red-300' : 'bg-emerald-950/60 text-emerald-400'
            }`}
          >
            {isAlertActive ? getHazardIcon(primaryAlert?.hazard || 'Flash Flood') : <ShieldCheck className="w-4 h-4" />}
          </div>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 min-w-0">
            <span className="font-bold text-white text-xs sm:text-sm">
              {isAlertActive
                ? `Active Hazard: ${primaryAlert?.hazard || weather.primaryDisaster}`
                : 'Hazard Status: Normal (All Clear)'}
            </span>
            <span className="text-xs text-slate-400 hidden md:inline">·</span>
            <span className="text-xs text-slate-300 line-clamp-1">
              {isAlertActive
                ? 'Priority evacuation buses are deployed for seniors (60+) and persons with disabilities in affected barangays.'
                : 'Continuous monitoring active across 47 barangays in Daraga, Albay.'}
            </span>
          </div>
        </div>

        {/* Clean Controls */}
        <div className="flex items-center gap-2 shrink-0 ml-auto">
          {/* Weather Scenario Switcher Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowScenarioMenu(!showScenarioMenu)}
              className="text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-slate-800/90 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Select weather condition scenario"
            >
              <span className="text-slate-400">Scenario:</span>
              <span className="font-bold text-amber-300 truncate max-w-[120px] sm:max-w-[160px]">
                {weather.scenarioName.replace('Typhoon', '🌀 Typhoon')}
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {showScenarioMenu && (
              <div className="absolute right-0 mt-2 w-72 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl z-50 p-2 space-y-1">
                <div className="px-2 py-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Test Weather Scenarios
                </div>
                {scenarios.map(sc => (
                  <button
                    key={sc.id}
                    onClick={() => {
                      onSelectScenario(sc.id);
                      setShowScenarioMenu(false);
                    }}
                    className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-colors flex flex-col gap-0.5 cursor-pointer ${
                      weather.scenario === sc.id
                        ? 'bg-amber-500/20 text-amber-300 font-bold'
                        : 'text-slate-200 hover:bg-slate-800'
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <span>{sc.name}</span>
                      <span className="text-[10px] text-slate-400 font-mono">{sc.date}</span>
                    </div>
                    <span className="text-[11px] text-slate-400 leading-tight">{sc.description}</span>
                  </button>
                ))}
                <div className="pt-1.5 mt-1 border-t border-slate-800 flex justify-between items-center px-1">
                  <button
                    onClick={() => {
                      onResetDemo();
                      setShowScenarioMenu(false);
                    }}
                    className="text-[11px] text-slate-400 hover:text-slate-200 flex items-center gap-1 cursor-pointer"
                  >
                    <RefreshCw className="w-3 h-3" /> Reset
                  </button>
                  <button
                    onClick={() => {
                      setShowScenarioMenu(false);
                      onOpenLiveDemoModal();
                    }}
                    className="text-[11px] text-amber-400 hover:text-amber-300 font-semibold cursor-pointer"
                  >
                    Guided Walkthrough →
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Toggle Weather Metrics Drawer */}
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="text-xs text-slate-400 hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-800 flex items-center gap-1 transition-colors cursor-pointer"
            title="Toggle weather sensor details"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{showDetails ? 'Less' : 'Details'}</span>
            {showDetails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Expandable Technical Details (Quiet, unobtrusive) */}
      {showDetails && (
        <div className="bg-slate-950 px-4 sm:px-6 py-3 border-t border-slate-800/80 text-xs text-slate-300">
          <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-4">
              <div>
                <span className="text-slate-500 block text-[10px] uppercase font-semibold">Simulated Time</span>
                <span className="font-mono text-slate-200">{weather.simulatedDateTime}</span>
              </div>
              <div className="h-6 w-px bg-slate-800 hidden sm:block" />
              <div>
                <span className="text-slate-500 block text-[10px] uppercase font-semibold">Rainfall Rate</span>
                <span className="font-mono text-slate-200">{weather.rain1h || 0} mm/hr</span>
              </div>
              <div className="h-6 w-px bg-slate-800 hidden sm:block" />
              <div>
                <span className="text-slate-500 block text-[10px] uppercase font-semibold">Wind Speed</span>
                <span className="font-mono text-slate-200">{weather.windSpeed || 0} km/h</span>
              </div>
              <div className="h-6 w-px bg-slate-800 hidden sm:block" />
              <div>
                <span className="text-slate-500 block text-[10px] uppercase font-semibold">Hazard Status</span>
                <span className="text-amber-400 font-bold">{weather.status}</span>
              </div>
            </div>
            <p className="text-[11px] text-slate-500 italic max-w-sm">
              {weather.historicalDisclaimer}
            </p>
          </div>
        </div>
      )}
    </aside>
  );
};

import React, { useState } from 'react';
import { WeatherState, TestCaseScenario } from '../types';
import { AlertTriangle, CloudRain, Wind, Mountain, ShieldAlert, CheckCircle2, Sliders, Calendar, Info, RefreshCw } from 'lucide-react';

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
        return <Wind className="w-5 h-5 text-amber-300 animate-pulse" />;
      case 'Flash Flood':
        return <CloudRain className="w-5 h-5 text-blue-300 animate-bounce" />;
      case 'Volcanic Lahar':
        return <Mountain className="w-5 h-5 text-red-400 animate-pulse" />;
      case 'Rain-Induced Landslide':
        return <AlertTriangle className="w-5 h-5 text-orange-400" />;
      default:
        return <ShieldAlert className="w-5 h-5 text-emerald-400" />;
    }
  };

  return (
    <aside aria-label="Hazard early warning and disaster monitor" className="w-full transition-all">
      {/* Main Alert Bar */}
      <div
        className={`px-4 py-3 sm:px-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 border-b ${
          isAlertActive
            ? highContrast
              ? 'bg-amber-950 border-amber-500 text-amber-100'
              : 'bg-gradient-to-r from-red-950/90 via-amber-950/80 to-slate-900 border-amber-600/60 text-slate-100'
            : 'bg-slate-900 border-slate-700 text-slate-300'
        }`}
      >
        <div className="flex items-start sm:items-center gap-3 flex-1">
          <div
            className={`p-2 rounded-lg flex items-center justify-center shrink-0 ${
              isAlertActive ? 'bg-amber-500/20 text-amber-400 ring-1 ring-amber-400/40' : 'bg-emerald-500/20 text-emerald-400'
            }`}
          >
            {isAlertActive ? getHazardIcon(primaryAlert?.hazard || 'Flash Flood') : <CheckCircle2 className="w-5 h-5" />}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`text-xs uppercase font-extrabold tracking-wider px-2 py-0.5 rounded-full ${
                  isAlertActive
                    ? 'bg-red-600 text-white animate-pulse'
                    : 'bg-emerald-600/80 text-emerald-100'
                }`}
              >
                {isAlertActive ? `${primaryAlert?.severity || 'WARNING'}: ${primaryAlert?.hazard.toUpperCase()}` : 'HAZARD STATUS: ALL CLEAR'}
              </span>

              <span className="text-xs text-amber-200/80 flex items-center gap-1 font-mono">
                <Calendar className="w-3.5 h-3.5" />
                {weather.simulatedDateTime} (Daraga/Manila)
              </span>

              <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 font-medium">
                Scenario: {weather.scenarioName}
              </span>
            </div>

            <p className="text-sm mt-0.5 text-slate-200 font-medium line-clamp-1">
              {isAlertActive
                ? `Historical risk: ${primaryAlert?.confidence}% confidence sustained for ${primaryAlert?.duration}h (needs ${primaryAlert?.required}h). Prioritize low-lying & PWD evacuations.`
                : 'Weather parameters below PAGASA/PHIVOLCS danger thresholds. Normal monitoring active.'}
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-end">
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-slate-800/90 hover:bg-slate-700 text-slate-200 border border-slate-600 flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Sliders className="w-3.5 h-3.5 text-amber-400" />
            {showDetails ? 'Hide Model Stats' : 'Hazard Diagnostics'}
          </button>

          <div className="relative">
            <button
              onClick={() => setShowScenarioMenu(!showScenarioMenu)}
              className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
            >
              <Calendar className="w-3.5 h-3.5" />
              Demo Dates (testCases.py)
            </button>

            {showScenarioMenu && (
              <div className="absolute right-0 mt-2 w-80 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl z-50 p-2 space-y-1">
                <div className="px-3 py-1.5 border-b border-slate-700 text-[11px] font-bold text-slate-400 uppercase tracking-wider flex justify-between items-center">
                  <span>Replay Scenarios (testCases.py)</span>
                  <span className="text-amber-400">Random Forest</span>
                </div>
                {scenarios.map(sc => (
                  <button
                    key={sc.id}
                    onClick={() => {
                      onSelectScenario(sc.id);
                      setShowScenarioMenu(false);
                    }}
                    className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-colors flex flex-col gap-0.5 ${
                      weather.scenario === sc.id
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                        : 'text-slate-200 hover:bg-slate-700/70'
                    }`}
                  >
                    <div className="flex justify-between items-center font-bold">
                      <span>{sc.name}</span>
                      <span className="font-mono text-[10px] text-amber-400">{sc.date}</span>
                    </div>
                    <span className="text-[11px] text-slate-400 leading-tight">{sc.description}</span>
                  </button>
                ))}
                <div className="pt-1 border-t border-slate-700 flex justify-between">
                  <button
                    onClick={() => {
                      onResetDemo();
                      setShowScenarioMenu(false);
                    }}
                    className="text-[11px] text-slate-400 hover:text-slate-200 flex items-center gap-1 px-2 py-1"
                  >
                    <RefreshCw className="w-3 h-3" /> Reset App State
                  </button>
                  <button
                    onClick={() => {
                      setShowScenarioMenu(false);
                      onOpenLiveDemoModal();
                    }}
                    className="text-[11px] text-amber-400 hover:text-amber-300 font-semibold px-2 py-1"
                  >
                    Automated Demo Walkthrough &rarr;
                  </button>
                </div>
              </div>
            )}
          </div>

          <button
            onClick={onOpenLiveDemoModal}
            className="text-xs font-black uppercase tracking-wider px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 flex items-center gap-1.5 shadow-md shadow-amber-500/20 active:scale-95 transition-all cursor-pointer"
          >
            ▶ Launch Live Demo
          </button>
        </div>
      </div>

      {/* Mandatory Historical Risk Disclaimer */}
      <div className="bg-slate-950/80 px-4 py-1 text-[11px] text-slate-400 flex items-center justify-between border-b border-slate-800">
        <span className="flex items-center gap-1.5 text-amber-300/90 font-medium">
          <Info className="w-3.5 h-3.5 shrink-0" />
          {weather.historicalDisclaimer}
        </span>
        <span className="hidden sm:inline text-slate-500 font-mono text-[10px]">
          50-yr PastWeather.csv Random Forest Model &bull; +12h..+24h Forecast Window
        </span>
      </div>

      {/* Detailed Diagnostics Drawer */}
      {showDetails && (
        <div className="bg-slate-900 border-b border-slate-800 p-4 sm:p-6 text-slate-200">
          <div className="max-w-7xl mx-auto space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
              <h2 className="text-sm font-bold uppercase tracking-wider text-amber-400 flex items-center gap-2">
                <Sliders className="w-4 h-4" />
                Daraga Disaster Hazard Risk Matrix (PAGASA / PHIVOLCS Thresholds)
              </h2>
              <span className="text-xs text-slate-400 font-mono">
                Simulation Time: {weather.simulatedDateTime} &bull; Cutoff: 10%
              </span>
            </div>

            {/* 4 Hazard Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Cyclone / Typhoon */}
              <div className="bg-slate-800/90 border border-slate-700 p-3.5 rounded-xl">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <Wind className="w-4 h-4 text-amber-400" />
                    <span className="font-bold text-sm">Cyclone / Typhoon</span>
                  </div>
                  <span
                    className={`text-xs px-2 py-0.5 rounded font-bold ${
                      weather.riskScores['Cyclone / Typhoon'] >= 70
                        ? 'bg-red-500/20 text-red-400'
                        : weather.riskScores['Cyclone / Typhoon'] >= 40
                        ? 'bg-amber-500/20 text-amber-400'
                        : 'bg-slate-700 text-slate-400'
                    }`}
                  >
                    {weather.riskScores['Cyclone / Typhoon']}%
                  </span>
                </div>
                <div className="mt-2 w-full bg-slate-700 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-amber-500 h-full rounded-full transition-all duration-500"
                    style={{ width: `${weather.riskScores['Cyclone / Typhoon']}%` }}
                  />
                </div>
                <div className="mt-2 text-[11px] text-slate-400 space-y-0.5">
                  <div className="flex justify-between">
                    <span>Sustained Streak:</span>
                    <span className="font-semibold text-slate-200">{weather.sustainedHours['Cyclone / Typhoon']}h (Needs 3h)</span>
                  </div>
                  <div className="flex justify-between">
                    <span>PAGASA Wind Gusts:</span>
                    <span className="font-semibold text-slate-200">{weather.windGusts} km/h</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Barometric Pressure:</span>
                    <span className="font-semibold text-slate-200">{weather.pressureMsl} hPa</span>
                  </div>
                </div>
              </div>

              {/* Flash Flood */}
              <div className="bg-slate-800/90 border border-slate-700 p-3.5 rounded-xl">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <CloudRain className="w-4 h-4 text-blue-400" />
                    <span className="font-bold text-sm">Flash Flood</span>
                  </div>
                  <span
                    className={`text-xs px-2 py-0.5 rounded font-bold ${
                      weather.riskScores['Flash Flood'] >= 70
                        ? 'bg-red-500/20 text-red-400'
                        : weather.riskScores['Flash Flood'] >= 40
                        ? 'bg-amber-500/20 text-amber-400'
                        : 'bg-slate-700 text-slate-400'
                    }`}
                  >
                    {weather.riskScores['Flash Flood']}%
                  </span>
                </div>
                <div className="mt-2 w-full bg-slate-700 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-blue-500 h-full rounded-full transition-all duration-500"
                    style={{ width: `${weather.riskScores['Flash Flood']}%` }}
                  />
                </div>
                <div className="mt-2 text-[11px] text-slate-400 space-y-0.5">
                  <div className="flex justify-between">
                    <span>Sustained Streak:</span>
                    <span className="font-semibold text-slate-200">{weather.sustainedHours['Flash Flood']}h (Needs 2h)</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Rainfall Rate:</span>
                    <span className="font-semibold text-slate-200">{weather.rain1h} mm/h</span>
                  </div>
                  <div className="flex justify-between">
                    <span>3-Hour Accumulated:</span>
                    <span className="font-semibold text-slate-200">{weather.rain3h} mm</span>
                  </div>
                </div>
              </div>

              {/* Volcanic Lahar */}
              <div className="bg-slate-800/90 border border-slate-700 p-3.5 rounded-xl">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <Mountain className="w-4 h-4 text-red-400" />
                    <span className="font-bold text-sm">Mayon Lahar</span>
                  </div>
                  <span
                    className={`text-xs px-2 py-0.5 rounded font-bold ${
                      weather.riskScores['Volcanic Lahar'] >= 70
                        ? 'bg-red-500/20 text-red-400'
                        : weather.riskScores['Volcanic Lahar'] >= 40
                        ? 'bg-amber-500/20 text-amber-400'
                        : 'bg-slate-700 text-slate-400'
                    }`}
                  >
                    {weather.riskScores['Volcanic Lahar']}%
                  </span>
                </div>
                <div className="mt-2 w-full bg-slate-700 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-red-500 h-full rounded-full transition-all duration-500"
                    style={{ width: `${weather.riskScores['Volcanic Lahar']}%` }}
                  />
                </div>
                <div className="mt-2 text-[11px] text-slate-400 space-y-0.5">
                  <div className="flex justify-between">
                    <span>Sustained Streak:</span>
                    <span className="font-semibold text-slate-200">{weather.sustainedHours['Volcanic Lahar']}h (Needs 1h)</span>
                  </div>
                  <div className="flex justify-between">
                    <span>PHIVOLCS Rain Trigger:</span>
                    <span className="font-semibold text-slate-200">{weather.rain1h} mm/h (&gt;10)</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Soil Moisture (0-7cm):</span>
                    <span className="font-semibold text-slate-200">{weather.soilMoisture} m³/m³</span>
                  </div>
                </div>
              </div>

              {/* Rain-Induced Landslide */}
              <div className="bg-slate-800/90 border border-slate-700 p-3.5 rounded-xl">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-orange-400" />
                    <span className="font-bold text-sm">Landslide Risk</span>
                  </div>
                  <span
                    className={`text-xs px-2 py-0.5 rounded font-bold ${
                      weather.riskScores['Rain-Induced Landslide'] >= 70
                        ? 'bg-red-500/20 text-red-400'
                        : weather.riskScores['Rain-Induced Landslide'] >= 40
                        ? 'bg-amber-500/20 text-amber-400'
                        : 'bg-slate-700 text-slate-400'
                    }`}
                  >
                    {weather.riskScores['Rain-Induced Landslide']}%
                  </span>
                </div>
                <div className="mt-2 w-full bg-slate-700 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-orange-500 h-full rounded-full transition-all duration-500"
                    style={{ width: `${weather.riskScores['Rain-Induced Landslide']}%` }}
                  />
                </div>
                <div className="mt-2 text-[11px] text-slate-400 space-y-0.5">
                  <div className="flex justify-between">
                    <span>Sustained Streak:</span>
                    <span className="font-semibold text-slate-200">{weather.sustainedHours['Rain-Induced Landslide']}h (Needs 3h)</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Soil Saturation:</span>
                    <span className="font-semibold text-slate-200">{weather.soilMoisture} m³/m³</span>
                  </div>
                  <div className="flex justify-between">
                    <span>3h Rain Infiltration:</span>
                    <span className="font-semibold text-slate-200">{weather.rain3h} mm</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
};

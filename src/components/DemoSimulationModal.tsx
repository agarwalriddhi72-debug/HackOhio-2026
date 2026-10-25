import React, { useState } from 'react';
import { TestCaseScenario, WeatherState } from '../types';
import { Play, RotateCcw, AlertTriangle, ShieldCheck, CheckCircle2, ArrowRight, Sparkles, Calendar, Truck, Home, Navigation, AlertOctagon } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  weather: WeatherState;
  scenarios: TestCaseScenario[];
  onSelectScenario: (scenarioId: string) => void;
  onRunDemoScenario: (scenarioId: string) => Promise<void>;
  onResetDemo: () => Promise<void>;
  onSimulateBusFull: () => Promise<void>;
  onSimulateShelterFull: () => Promise<void>;
  onSimulateRoadBlock: () => Promise<void>;
}

export const DemoSimulationModal: React.FC<Props> = ({
  isOpen,
  onClose,
  weather,
  scenarios,
  onSelectScenario,
  onRunDemoScenario,
  onResetDemo,
  onSimulateBusFull,
  onSimulateShelterFull,
  onSimulateRoadBlock,
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [runningStep, setRunningStep] = useState(false);
  const [demoLog, setDemoLog] = useState<string[]>([
    'Demo initialized. Ready to simulate end-to-end evacuation workflow based on testCases.py data.',
  ]);

  if (!isOpen) return null;

  const demoSteps = [
    {
      title: '1. Disaster Hazard Warning Declared',
      desc: 'Simulate typhoon / torrential monsoon conditions from testCases.py (2026-12-22 23:00 Manila). Predicted risk exceeds 10% cutoff for >=3h.',
      action: async () => {
        await onSelectScenario('typhoon_warning');
        setDemoLog(prev => [
          ...prev,
          '✓ Step 1: Warning declared for Cyclone/Typhoon at 2026-12-22 23:00 (Signal #2 wind gusts & rain).',
        ]);
      },
    },
    {
      title: '2. High-Priority Elderly PWD Request Received',
      desc: '86-year-old wheelchair user Nanay Beatriz requests rescue from low-lying Barangay Bañag riverbank area.',
      action: async () => {
        await onRunDemoScenario('typhoon_warning');
        setDemoLog(prev => [
          ...prev,
          '✓ Step 2: Request received for Nanay Beatriz (86yo, wheelchair). Snapped to nearest road node. Assigned top priority score.',
        ]);
      },
    },
    {
      title: '3. Dijkstra Route Calculated & Van Dispatched',
      desc: 'Router dispatches PWD Wheelchair Shuttle 02 with hydraulic ramp. Generates shortest path along Daraga road network.',
      action: async () => {
        setDemoLog(prev => [
          ...prev,
          '✓ Step 3: Dijkstra router built turn-by-turn route to Barangay Bañag and initial drop-off at Burgos Covered Court.',
        ]);
      },
    },
    {
      title: '4. Driver Clicks "Bus Full" & Automatic Reassignment',
      desc: 'Driver marks the bus as full. Notice that unserved riders immediately receive status: "Bus is full, please wait for the next bus" and return to waiting pool.',
      action: async () => {
        await onSimulateBusFull();
        setDemoLog(prev => [
          ...prev,
          '✓ Step 4: BUS FULL triggered! Unserved riders received "Bus is full, please wait for next bus" and auto-reassigned to available vehicle.',
        ]);
      },
    },
    {
      title: '5. Primary Shelter Marks Full & Dynamic Reroute',
      desc: 'Shelter Manager marks Burgos Covered Court as FULL. Router instantly re-routes the evacuation convoy to Daraga High School.',
      action: async () => {
        await onSimulateShelterFull();
        setDemoLog(prev => [
          ...prev,
          '✓ Step 5: SHELTER FULL triggered! Convoy automatically rerouted to nearest open wheelchair-accessible shelter.',
        ]);
      },
    },
    {
      title: '6. River Crossing Inundated & Road Reroute',
      desc: 'Simulate flash flood hazard blocking low bridge. Router avoids flooded segment and recalculates safe detour.',
      action: async () => {
        await onSimulateRoadBlock();
        setDemoLog(prev => [
          ...prev,
          '✓ Step 6: Road blockage & flood penalty applied. Dijkstra rerouted around impassable corridor.',
        ]);
      },
    },
  ];

  const handleNextStep = async () => {
    if (currentStep >= demoSteps.length) return;
    setRunningStep(true);
    try {
      await demoSteps[currentStep].action();
      setCurrentStep(prev => prev + 1);
    } finally {
      setRunningStep(false);
    }
  };

  const handleReset = async () => {
    setRunningStep(true);
    try {
      await onResetDemo();
      setCurrentStep(0);
      setDemoLog(['System reset to baseline state.']);
    } finally {
      setRunningStep(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-slate-900 border-2 border-amber-500/80 rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col justify-between p-5 sm:p-7 space-y-6">
        {/* Header */}
        <div className="flex justify-between items-start border-b border-slate-800 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-amber-400" />
              <h3 className="text-xl sm:text-2xl font-black text-white">
                ROUTEY &bull; Live Evacuation Demo Lab
              </h3>
            </div>
            <p className="text-xs sm:text-sm text-slate-300 mt-1">
              Test and demonstrate all core features using historical simulation dates from <code className="text-amber-300 font-mono">testCases.py</code>.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 text-2xl font-bold leading-none cursor-pointer"
          >
            &times;
          </button>
        </div>

        {/* Section 1: testCases.py Date Presets */}
        <div className="space-y-3">
          <label className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
            <Calendar className="w-4 h-4" />
            Historical Disaster Scenarios (from testCases.py &amp; future1.py)
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {scenarios.map(sc => (
              <button
                key={sc.id}
                onClick={async () => {
                  setRunningStep(true);
                  try {
                    await onSelectScenario(sc.id);
                    setDemoLog(prev => [
                      ...prev,
                      `Loaded scenario: ${sc.name} (${sc.date}) from testCases.py.`,
                    ]);
                  } finally {
                    setRunningStep(false);
                  }
                }}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  weather.scenario === sc.id
                    ? 'border-amber-400 bg-amber-500/20 text-white ring-1 ring-amber-400'
                    : 'border-slate-800 bg-slate-800/80 text-slate-300 hover:border-slate-600'
                }`}
              >
                <div className="flex justify-between items-center font-bold text-xs">
                  <span>{sc.name}</span>
                  <span className="font-mono text-[10px] text-amber-400">{sc.date}</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">{sc.description}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Section 2: Step-by-Step Guided Walkthrough */}
        <div className="bg-slate-800/80 border border-slate-700 rounded-xl p-4 sm:p-5 space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-2">
              <Play className="w-4 h-4 text-emerald-400" />
              Interactive End-to-End Walkthrough
            </span>
            <span className="text-xs text-amber-400 font-mono font-bold">
              Step {currentStep} of {demoSteps.length}
            </span>
          </div>

          <div className="space-y-2">
            {demoSteps.map((step, idx) => (
              <div
                key={idx}
                className={`p-3 rounded-xl border text-xs transition-all flex items-start gap-3 ${
                  idx < currentStep
                    ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200'
                    : idx === currentStep
                    ? 'bg-amber-500/10 border-amber-400 text-white shadow-md'
                    : 'bg-slate-900/60 border-slate-800 text-slate-500'
                }`}
              >
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center font-bold shrink-0 text-[10px] ${
                    idx < currentStep
                      ? 'bg-emerald-600 text-white'
                      : idx === currentStep
                      ? 'bg-amber-500 text-slate-950'
                      : 'bg-slate-800 text-slate-500'
                  }`}
                >
                  {idx < currentStep ? '✓' : idx + 1}
                </div>
                <div className="flex-1">
                  <span className="font-extrabold text-sm block">{step.title}</span>
                  <span className="text-[11px] opacity-90 leading-relaxed block mt-0.5">
                    {step.desc}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Stepper Buttons */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <button
              onClick={handleReset}
              disabled={runningStep}
              className="px-3.5 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white bg-slate-900 border border-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Reset Walkthrough
            </button>

            {currentStep < demoSteps.length ? (
              <button
                onClick={handleNextStep}
                disabled={runningStep}
                className="px-5 py-2.5 rounded-xl text-xs sm:text-sm font-black uppercase tracking-wider text-slate-950 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 flex items-center gap-2 shadow-lg shadow-amber-500/20 active:scale-[0.98] transition-all cursor-pointer"
              >
                {runningStep ? 'Executing...' : `Execute Step ${currentStep + 1}`}
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold">
                <CheckCircle2 className="w-4 h-4" /> All Simulation Steps Completed Successfully!
              </div>
            )}
          </div>
        </div>

        {/* Console Execution Log */}
        <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 text-[11px] font-mono text-slate-300 space-y-1 max-h-32 overflow-y-auto">
          <div className="text-slate-500 uppercase text-[10px] font-bold">Simulation Event Stream:</div>
          {demoLog.map((log, i) => (
            <div key={i} className="text-amber-200/90">&bull; {log}</div>
          ))}
        </div>

        {/* Footer */}
        <div className="flex justify-end pt-2 border-t border-slate-800">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs cursor-pointer"
          >
            Close &amp; Return to Map
          </button>
        </div>
      </div>
    </div>
  );
};

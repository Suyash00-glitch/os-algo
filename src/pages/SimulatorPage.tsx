import React, { useState, useMemo } from 'react';
import { ProcessInput, SimulatorConfig, SampleQuestion } from '../engine/types';
import {
  DEFAULT_SIMULATOR_CONFIG,
  DEFAULT_PRESET_PROCESSES,
  runAllAlgorithms,
} from '../engine/simulator';
import { generateSampleQuestion } from '../engine/sampleQuestions';
import { ProcessInputTable } from '../components/ProcessInputTable';
import { ConfigurationPanel } from '../components/ConfigurationPanel';
import { GanttChart } from '../components/GanttChart';
import { ComparisonTable } from '../components/ComparisonTable';
import { DartTracePage } from './DartTracePage';
import {
  Sliders,
  Play,
  BarChart2,
  ArrowRight,
  FileText,
  X,
} from 'lucide-react';

export const SimulatorPage: React.FC = () => {
  const [currentView, setCurrentView] = useState<'SIMULATOR' | 'DART_TRACE'>('SIMULATOR');
  const [processes, setProcesses] = useState<ProcessInput[]>(DEFAULT_PRESET_PROCESSES);
  const [config, setConfig] = useState<SimulatorConfig>(DEFAULT_SIMULATOR_CONFIG);
  const [selectedAlgorithm, setSelectedAlgorithm] = useState<string>('DART');
  const [showConfig, setShowConfig] = useState<boolean>(false);
  const [showCompareAll, setShowCompareAll] = useState<boolean>(true);
  const [activeQuestion, setActiveQuestion] = useState<SampleQuestion | null>(null);

  // Compute simulation results whenever processes or config change
  const results = useMemo(() => {
    return runAllAlgorithms(processes, config);
  }, [processes, config]);

  const currentResult = results[selectedAlgorithm] || results['DART'] || Object.values(results)[0];
  const isDartSelected = selectedAlgorithm === 'DART';

  const handleLoadExample = () => {
    setProcesses(DEFAULT_PRESET_PROCESSES);
    setConfig(DEFAULT_SIMULATOR_CONFIG);
    setActiveQuestion(null);
  };

  const handleClearAll = () => {
    setProcesses([
      { pid: 'P1', arrivalTime: 0, burstTime: 4, priority: 1, processType: 'cpu' },
    ]);
    setActiveQuestion(null);
  };

  const handleGenerateQuestion = () => {
    const q = generateSampleQuestion();
    setActiveQuestion(q);
    setProcesses(q.processes);
    if (q.config) {
      setConfig((prev) => ({
        ...prev,
        ...q.config,
        dartBaseline: {
          ...prev.dartBaseline,
          ...(q.config.dartBaseline || q.config.adaptCsBaseline || {}),
        },
        adaptCsBaseline: {
          ...prev.adaptCsBaseline,
          ...(q.config.adaptCsBaseline || q.config.dartBaseline || {}),
        },
      }));
    }
    if (q.targetAlgorithm) {
      setSelectedAlgorithm(
        q.targetAlgorithm === 'ADAPT_CS_V2'
          ? 'DART'
          : q.targetAlgorithm === 'ADAPT_CS'
          ? 'DART'
          : q.targetAlgorithm
      );
    }
  };

  // If currently in the dedicated DART Execution Trace view, render that page
  if (currentView === 'DART_TRACE') {
    return (
      <DartTracePage
        result={currentResult}
        onBackToSimulator={() => setCurrentView('SIMULATOR')}
      />
    );
  }

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      {/* Top Header */}
      <header className="border-b border-neutral-800 bg-black/90 backdrop-blur sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-[30px] sm:text-[34px] font-bold text-white tracking-tight uppercase leading-tight">
              CPU Scheduling Simulator
            </h1>
            <p className="text-base text-neutral-300 font-normal mt-1 leading-relaxed">
              Deterministic simulation engine comparing FCFS, Non-Preemptive SJF, Round Robin, and DART (Dynamic Adaptive Runtime Triage).
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowConfig(!showConfig)}
              className={`flex items-center gap-2 px-4 py-2 text-[15px] font-medium rounded-md border transition ${
                showConfig
                  ? 'bg-neutral-800 text-white border-neutral-600'
                  : 'bg-neutral-900 text-neutral-300 border-neutral-700 hover:text-white hover:bg-neutral-800 hover:border-neutral-600'
              }`}
            >
              <Sliders className="w-4 h-4" />
              {showConfig ? 'Hide Config' : 'Configuration'}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Sample Question Banner if active */}
        {activeQuestion && (
          <div className="mono-panel p-5 rounded-lg border border-neutral-700 bg-neutral-950 space-y-3">
            <div className="flex items-start justify-between gap-3 border-b border-neutral-800 pb-2.5">
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="text-base font-bold text-white uppercase flex items-center gap-2">
                  <FileText className="w-4 h-4 text-white" />
                  Generated Scheduling Question: {activeQuestion.title}
                </span>
                <span className="text-sm px-2.5 py-1 rounded bg-neutral-900 border border-neutral-700 text-neutral-300 font-medium">
                  Difficulty: {activeQuestion.difficulty}
                </span>
                <span className="text-sm px-2.5 py-1 rounded bg-white text-black font-bold">
                  Target: {activeQuestion.targetAlgorithm === 'ADAPT_CS_V2' || activeQuestion.targetAlgorithm === 'ADAPT_CS' ? 'DART' : activeQuestion.targetAlgorithm}
                </span>
              </div>

              <button
                onClick={() => setActiveQuestion(null)}
                className="text-neutral-400 hover:text-white p-1 rounded transition"
                title="Dismiss question banner"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-base text-neutral-200 leading-relaxed">
              {activeQuestion.scenarioDescription}
            </p>

            <div className="bg-neutral-900 p-3.5 rounded-md border border-neutral-800 text-[15px] text-white space-y-1">
              <span className="text-neutral-400 block text-xs uppercase font-bold tracking-wider">Task:</span>
              <p className="leading-relaxed">{activeQuestion.taskPrompt}</p>
            </div>

            <div className="text-sm text-neutral-300 space-y-1">
              <span className="text-neutral-400 font-bold uppercase text-xs tracking-wider block">Assumptions:</span>
              {activeQuestion.assumptions.map((item, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <span className="text-neutral-500">&bull;</span>
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Process Input Table */}
        <ProcessInputTable
          processes={processes}
          onProcessesChange={setProcesses}
          onLoadExample={handleLoadExample}
          onClearAll={handleClearAll}
          onGenerateQuestion={handleGenerateQuestion}
        />

        {/* Scheduling Configuration */}
        {showConfig && (
          <ConfigurationPanel config={config} onConfigChange={setConfig} />
        )}

        {/* Algorithm Selection & Run Controls */}
        <div className="mono-panel p-5 rounded-lg space-y-3.5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            {/* Algorithm Radio / Tabs */}
            <div className="space-y-1.5">
              <span className="text-sm text-neutral-300 uppercase font-bold tracking-wider block">
                Algorithm Selection
              </span>
              <div className="flex flex-wrap items-center gap-2.5">
                {[
                  { id: 'FCFS', label: 'FCFS' },
                  { id: 'SJF', label: 'SJF (Non-Preemptive)' },
                  { id: 'RR', label: `Round Robin (q=${config.rrQuantum}ms)` },
                  { id: 'DART', label: 'DART (Dynamic Adaptive Runtime Triage)' },
                ].map((alg) => (
                  <button
                    key={alg.id}
                    onClick={() => setSelectedAlgorithm(alg.id)}
                    className={`px-4 py-2 rounded-md text-[15px] font-medium transition border ${
                      selectedAlgorithm === alg.id
                        ? 'bg-white text-black font-bold border-white shadow-sm'
                        : 'bg-neutral-900 text-neutral-300 border-neutral-700 hover:text-white hover:bg-neutral-800 hover:border-neutral-600'
                    }`}
                  >
                    {alg.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Actions: Run Simulation, Compare All, View Calculations */}
            <div className="flex items-center gap-2.5 flex-wrap pt-2 md:pt-0">
              <button
                onClick={() => {
                  setShowCompareAll(false);
                }}
                className="flex items-center gap-2 px-4 py-2 bg-neutral-900 hover:bg-neutral-800 text-white font-semibold text-[15px] rounded-md border border-neutral-700 hover:border-neutral-600 transition"
              >
                <Play className="w-4 h-4" />
                Run Simulation
              </button>

              <button
                onClick={() => setShowCompareAll(!showCompareAll)}
                className={`flex items-center gap-2 px-4 py-2 text-[15px] font-semibold rounded-md border transition ${
                  showCompareAll
                    ? 'bg-neutral-800 text-white border-neutral-600'
                    : 'bg-neutral-900 text-neutral-300 border-neutral-700 hover:text-white hover:border-neutral-600'
                }`}
              >
                <BarChart2 className="w-4 h-4" />
                {showCompareAll ? 'Hide Comparison' : 'Compare All'}
              </button>

              {/* View Step-by-Step Calculations: ONLY shown when DART is selected */}
              {isDartSelected && (
                <button
                  onClick={() => setCurrentView('DART_TRACE')}
                  className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-neutral-200 text-black font-bold text-[15px] rounded-md border border-white transition"
                  title="Open full-page step-by-step arithmetic trace for DART"
                >
                  <span>VIEW STEP-BY-STEP CALCULATIONS</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Gantt Chart */}
        <GanttChart
          results={results}
          activeAlgorithm={selectedAlgorithm}
          onSelectAlgorithm={setSelectedAlgorithm}
          standalone={!showCompareAll}
        />

        {/* Final Process Metrics & Algorithm Comparison Results */}
        <ComparisonTable
          results={results}
          activeAlgorithm={selectedAlgorithm}
          onSelectAlgorithm={setSelectedAlgorithm}
          showComparisonMatrix={showCompareAll}
        />
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t border-neutral-900 bg-black py-5 text-center text-sm text-neutral-400">
        <p>CPU Scheduling Simulator &bull; Strict Monochrome OS Educational Suite &bull; FCFS, SJF, RR, DART (Dynamic Adaptive Runtime Triage).</p>
      </footer>
    </div>
  );
};

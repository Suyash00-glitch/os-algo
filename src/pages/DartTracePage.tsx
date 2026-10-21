import React, { useState } from 'react';
import { AlgorithmResult } from '../engine/types';
import { GanttChart } from '../components/GanttChart';
import {
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  Download,
  FileText,
} from 'lucide-react';

interface DartTracePageProps {
  result: AlgorithmResult;
  onBackToSimulator: () => void;
}

export const DartTracePage: React.FC<DartTracePageProps> = ({
  result,
  onBackToSimulator,
}) => {
  const isV2 = result.algorithmId === 'ADAPT_CS_V2';
  const evalEvents = result.events.filter((e) => e.eventType === 'EVAL_TICK');

  // Track expanded state for each event card
  const [expandedMap, setExpandedMap] = useState<Record<number, boolean>>(() => {
    // Expand the first 3 events by default
    const initial: Record<number, boolean> = {};
    evalEvents.slice(0, 3).forEach((e) => {
      initial[e.stepIndex] = true;
    });
    return initial;
  });

  const [filterType, setFilterType] = useState<'ALL' | 'PREEMPT' | 'CONTINUE' | 'SHIELD'>('ALL');

  const toggleExpand = (stepIndex: number) => {
    setExpandedMap((prev) => ({
      ...prev,
      [stepIndex]: !prev[stepIndex],
    }));
  };

  const expandAll = () => {
    const allExpanded: Record<number, boolean> = {};
    evalEvents.forEach((e) => {
      allExpanded[e.stepIndex] = true;
    });
    setExpandedMap(allExpanded);
  };

  const collapseAll = () => {
    setExpandedMap({});
  };

  const filteredEvents = evalEvents.filter((e) => {
    if (filterType === 'PREEMPT') return e.preemptDecision === true;
    if (filterType === 'CONTINUE') return e.preemptDecision === false;
    if (filterType === 'SHIELD') return e.nearFinishShieldApplied === true;
    return true;
  });

  const exportTraceCSV = () => {
    let csv =
      'Step,Time (ms),Trigger Event,Running PID,Candidate PID,Running Remaining (ms),Candidate Remaining (ms),Running Urgency,Candidate Urgency,Urgency Diff,Barrier,Near Finish Shield,Hard Ceiling,Decision,Rule,Justification\n';

    for (const e of evalEvents) {
      const m = e.dartMath || e.adaptCsMath;
      csv += `${e.stepIndex},${e.time},"${m?.triggerEvent || ''}","${m?.current.pid || ''}","${m?.candidate.pid || ''}",${m?.current.remainingTime ?? ''},${m?.candidate.remainingTime ?? ''},${m?.current.urgency ?? ''},${m?.candidate.urgency ?? ''},${m?.urgencyDiff ?? ''},${m?.threshold.barrier ?? ''},${m?.nearFinishShield.applies ?? ''},${m?.hardCeiling.applies ?? ''},"${m?.decision || ''}","${m?.ruleApplied || ''}","${(m?.decisionJustification || '').replace(/"/g, '""')}"\n`;
    }

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `dart_execution_trace_${isV2 ? 'v2' : 'baseline'}_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      {/* Top Header */}
      <header className="border-b border-neutral-800 bg-black/90 backdrop-blur sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3.5">
            <button
              onClick={onBackToSimulator}
              className="flex items-center gap-2 px-4 py-2 text-[15px] font-bold text-white bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 rounded-md transition"
              title="Return to the simulator without losing simulation state"
            >
              <ArrowLeft className="w-4 h-4" />
              BACK TO SIMULATOR
            </button>

            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-[24px] sm:text-[28px] font-bold text-white tracking-tight uppercase leading-tight">
                  {isV2 ? 'DART v2 Execution Trace' : 'DART Execution Trace'}
                </h1>
                <span className="text-sm font-semibold px-2.5 py-0.5 rounded bg-neutral-900 text-white border border-neutral-700">
                  {isV2 ? 'v2 (Barrier Floor 0.1)' : 'Dynamic Adaptive Runtime Triage'}
                </span>
              </div>
              <p className="text-base text-neutral-300 font-normal mt-1 leading-relaxed">
                Chronological student hand-calculation trace showing exact arithmetic substitutions at every evaluation point.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={exportTraceCSV}
              className="flex items-center gap-2 px-4 py-2 text-[15px] font-medium text-neutral-300 bg-neutral-900 hover:text-white hover:bg-neutral-800 border border-neutral-700 rounded-md transition"
            >
              <Download className="w-4 h-4" />
              Export Trace CSV
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Active Version & Mathematical Formulas Banner */}
        <div className="mono-panel rounded-lg p-5 sm:p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-neutral-800 pb-3">
            <div className="text-[17px] font-bold text-white uppercase flex items-center gap-2">
              <FileText className="w-5 h-5 text-white" />
              Mathematical Formulas & Core Specifications
            </div>
            <div className="text-sm text-neutral-400">
              Evaluated at process arrivals and 1.0 ms execution tick boundaries
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            {/* Urgency Formula */}
            <div className="bg-neutral-900 p-4 rounded-lg border border-neutral-800 space-y-2">
              <div className="text-white font-bold text-base">1. Urgency Formula U(Pᵢ, t)</div>
              <div className="bg-black p-3 rounded border border-neutral-800 text-[13px] font-mono text-neutral-200">
                U(Pᵢ, t) = [ (1 + Wᵢ)^1.3 / max(0.5, Rᵢ) ] × PriorityWeightᵢ × TypeBonusᵢ
              </div>
              <p className="text-sm text-neutral-300 leading-relaxed">
                Wᵢ = Accumulated ready-queue wait time &bull; Rᵢ = Remaining CPU burst &bull; PriorityWeight = 1 + 0.5 × max(0, 5 − Prio) &bull; TypeBonus = 1.5 (Interactive) or 1.0 (CPU).
              </p>
            </div>

            {/* Threshold Formula */}
            <div className="bg-neutral-900 p-4 rounded-lg border border-neutral-800 space-y-2">
              <div className="text-white font-bold text-base">
                2. Dynamic Threshold Barrier Θ
              </div>
              <div className="bg-black p-3 rounded border border-neutral-800 text-[13px] font-mono text-neutral-200">
                {isV2 ? (
                  <>Θ = max(0.1, 1.2 × CS + FinishBonus − Penalty_hog)</>
                ) : (
                  <>Θ = 1.2 × CS + FinishBonus − Penalty_hog</>
                )}
              </div>
              <p className="text-sm text-neutral-300 leading-relaxed">
                {isV2 ? (
                  <>
                    <strong className="text-white font-bold">DART v2:</strong> Enforces a positive barrier floor (Θ_min = 0.1) preventing anti-hog decay from creating negative thresholds.
                  </>
                ) : (
                  <>
                    <strong className="text-white font-bold">DART (Dynamic Adaptive Runtime Triage):</strong> Dynamically calculates threshold barrier from hardware context switch cost, finish bonus, and quadratic anti-hogging decay.
                  </>
                )}
              </p>
            </div>
          </div>
        </div>

        {/* Filter and Expand Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-[15px]">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-neutral-300 font-medium">Filter Events:</span>
            {[
              { id: 'ALL', label: `All Evaluations (${evalEvents.length})` },
              { id: 'PREEMPT', label: 'Preemptions Only' },
              { id: 'CONTINUE', label: 'Retained CPU Only' },
              { id: 'SHIELD', label: 'Near-Finish Shields' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setFilterType(tab.id as any)}
                className={`px-3.5 py-1.5 rounded-md border transition font-medium ${
                  filterType === tab.id
                    ? 'bg-white text-black font-bold border-white shadow-sm'
                    : 'bg-neutral-900 text-neutral-300 border-neutral-700 hover:text-white hover:bg-neutral-800'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={expandAll}
              className="px-3.5 py-1.5 bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 rounded-md text-neutral-300 hover:text-white font-medium"
            >
              Expand All
            </button>
            <button
              onClick={collapseAll}
              className="px-3.5 py-1.5 bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 rounded-md text-neutral-300 hover:text-white font-medium"
            >
              Collapse All
            </button>
          </div>
        </div>

        {/* Chronological Evaluation Events List */}
        <div className="space-y-4">
          {filteredEvents.length === 0 ? (
            <div className="mono-panel p-8 rounded-lg text-center text-neutral-500 text-xs">
              No evaluation events match the selected filter.
            </div>
          ) : (
            filteredEvents.map((e) => {
              const isExpanded = !!expandedMap[e.stepIndex];
              const m = e.dartMath || e.adaptCsMath;
              const isPreempt = e.preemptDecision === true;

              return (
                <div
                  key={e.stepIndex}
                  className="mono-panel rounded-lg border border-neutral-800 overflow-hidden transition"
                >
                  {/* Card Header (Always visible) */}
                  <div
                    onClick={() => toggleExpand(e.stepIndex)}
                    className="p-4 bg-neutral-900/80 hover:bg-neutral-900 cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-800/80 select-none"
                  >
                    <div className="flex items-center gap-3 flex-wrap">
                      <button className="text-neutral-400 hover:text-white p-1">
                        {isExpanded ? (
                          <ChevronDown className="w-5 h-5" />
                        ) : (
                          <ChevronRight className="w-5 h-5" />
                        )}
                      </button>

                      <span className="text-sm font-bold text-white px-2.5 py-1 rounded bg-black border border-neutral-700 font-mono">
                        t = {e.time.toFixed(2)} ms
                      </span>

                      <span className="text-[15px] text-neutral-200 font-medium">
                        {m?.triggerEvent || e.reason}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 flex-wrap">
                      {m && (
                        <span className="text-sm text-neutral-300 font-mono">
                          Cand: <strong className="text-white">{m.candidate.pid}</strong> (U={m.candidate.urgency.toFixed(2)}) vs Curr: <strong className="text-white">{m.current.pid}</strong> (U={m.current.urgency.toFixed(2)})
                        </span>
                      )}

                      <span
                        className={`text-sm px-3 py-1 rounded-md font-bold border ${
                          isPreempt
                            ? 'bg-white text-black border-white'
                            : 'bg-neutral-950 text-neutral-200 border-neutral-700'
                        }`}
                      >
                        {isPreempt ? 'PREEMPTION TRIGGERED' : 'CONTINUE EXECUTION'}
                      </span>
                    </div>
                  </div>

                  {/* Card Body: Detailed 13-Point Breakdown (Expanded) */}
                  {isExpanded && m && (
                    <div className="p-5 sm:p-6 space-y-5 bg-black">
                      {/* Top Summary Info Grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3.5">
                        <div className="bg-neutral-900 p-3 rounded-lg border border-neutral-800">
                          <span className="text-neutral-400 text-xs block mb-1">1. Evaluation Trigger</span>
                          <span className="text-white font-semibold text-[15px]">{m.triggerEvent}</span>
                        </div>
                        <div className="bg-neutral-900 p-3 rounded-lg border border-neutral-800">
                          <span className="text-neutral-400 text-xs block mb-1">2. Currently Running</span>
                          <span className="text-white font-semibold text-[15px]">
                            {m.current.pid} (Rem: {m.current.remainingTime.toFixed(1)} ms)
                          </span>
                        </div>
                        <div className="bg-neutral-900 p-3 rounded-lg border border-neutral-800">
                          <span className="text-neutral-400 text-xs block mb-1">3. Highest Candidate</span>
                          <span className="text-white font-semibold text-[15px]">
                            {m.candidate.pid} (Rem: {m.candidate.remainingTime.toFixed(1)} ms)
                          </span>
                        </div>
                        <div className="bg-neutral-900 p-3 rounded-lg border border-neutral-800">
                          <span className="text-neutral-400 text-xs block mb-1">4. Ready Queue Count</span>
                          <span className="text-white font-semibold text-[15px]">{e.readyQueue.length} processes</span>
                        </div>
                      </div>

                      {/* Urgency Calculations Comparison (Candidate vs Current) */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Candidate Urgency */}
                        <div className="bg-neutral-900 p-4 rounded-lg border border-neutral-800 space-y-3">
                          <div className="text-white font-bold text-base flex items-center justify-between">
                            <span>5-6. Candidate {m.candidate.pid} Urgency Score</span>
                            <span className="text-sm bg-black px-2.5 py-1 rounded border border-neutral-700 text-white font-mono">
                              U = {m.candidate.urgency.toFixed(4)}
                            </span>
                          </div>
                          <div className="text-sm text-neutral-300 space-y-1.5 leading-relaxed">
                            <div>Remaining Burst (R): <strong className="text-white font-mono">{m.candidate.remainingTime.toFixed(2)} ms</strong> (est: {m.candidate.estRem.toFixed(2)})</div>
                            <div>Accumulated Ready Wait (W): <strong className="text-white font-mono">{m.candidate.accumulatedWait.toFixed(2)} ms</strong></div>
                            <div>Priority: <strong className="text-white">{m.candidate.priority}</strong> &bull; PriorityWeight = <strong className="text-white font-mono">{m.candidate.prioWeight.toFixed(2)}</strong></div>
                            <div>Process Type: <strong className="text-white capitalize">{m.candidate.processType}</strong> &bull; TypeBonus = <strong className="text-white font-mono">{m.candidate.interactBonus.toFixed(2)}</strong></div>
                          </div>
                          <div className="bg-black p-3 rounded border border-neutral-800 text-[13px] font-mono text-neutral-200">
                            {m.candidate.substitutionString}
                          </div>
                        </div>

                        {/* Current Urgency */}
                        <div className="bg-neutral-900 p-4 rounded-lg border border-neutral-800 space-y-3">
                          <div className="text-white font-bold text-base flex items-center justify-between">
                            <span>5-6. Running {m.current.pid} Urgency Score</span>
                            <span className="text-sm bg-black px-2.5 py-1 rounded border border-neutral-700 text-white font-mono">
                              U = {m.current.urgency.toFixed(4)}
                            </span>
                          </div>
                          <div className="text-sm text-neutral-300 space-y-1.5 leading-relaxed">
                            <div>Remaining Burst (R): <strong className="text-white font-mono">{m.current.remainingTime.toFixed(2)} ms</strong> (est: {m.current.estRem.toFixed(2)})</div>
                            <div>Accumulated Ready Wait (W): <strong className="text-white font-mono">{m.current.accumulatedWait.toFixed(2)} ms</strong></div>
                            <div>Priority: <strong className="text-white">{m.current.priority}</strong> &bull; PriorityWeight = <strong className="text-white font-mono">{m.current.prioWeight.toFixed(2)}</strong></div>
                            <div>Process Type: <strong className="text-white capitalize">{m.current.processType}</strong> &bull; TypeBonus = <strong className="text-white font-mono">{m.current.interactBonus.toFixed(2)}</strong></div>
                          </div>
                          <div className="bg-black p-3 rounded border border-neutral-800 text-[13px] font-mono text-neutral-200">
                            {m.current.substitutionString}
                          </div>
                        </div>
                      </div>

                      {/* Threshold & Preemption Barrier Section */}
                      <div className="bg-neutral-900 p-4 rounded-lg border border-neutral-800 space-y-3">
                        <div className="text-white font-bold text-base flex items-center justify-between">
                          <span>7-8. Preemption Threshold Barrier Calculation (Θ)</span>
                          <span className="text-sm bg-black px-2.5 py-1 rounded border border-neutral-700 text-white font-mono">
                            Θ = {m.threshold.barrier.toFixed(4)}
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                          <div className="bg-black p-3 rounded border border-neutral-800">
                            <span className="text-neutral-400 text-xs block mb-1">Base Friction</span>
                            <span className="text-neutral-200">
                              1.2 × CS ({m.threshold.csOverhead.toFixed(2)}) = <strong className="text-white font-mono">{m.threshold.baseFriction.toFixed(2)}</strong>
                            </span>
                          </div>
                          <div className="bg-black p-3 rounded border border-neutral-800">
                            <span className="text-neutral-400 text-xs block mb-1">Finish Bonus (R ≤ 2.0 ms)</span>
                            <span className="text-neutral-200">{m.threshold.finishBonusSubstitution}</span>
                          </div>
                          <div className="bg-black p-3 rounded border border-neutral-800">
                            <span className="text-neutral-400 text-xs block mb-1">Anti-Hog Penalty</span>
                            <span className="text-neutral-200">{m.threshold.hogPenaltySubstitution}</span>
                          </div>
                        </div>

                        <div className="bg-black p-3 rounded border border-neutral-800 text-[13px] font-mono text-neutral-200">
                          {m.threshold.barrierSubstitution}
                        </div>
                      </div>

                      {/* Rules Evaluation & Final Comparison Grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                        {/* Rule A */}
                        <div className="bg-neutral-900 p-3.5 rounded-lg border border-neutral-800 space-y-1.5">
                          <div className="text-white font-bold text-[15px] flex items-center justify-between">
                            <span>9. Rule A: Shield</span>
                            <span className="text-xs px-2 py-0.5 rounded border border-neutral-700 font-semibold">
                              {m.nearFinishShield.applies ? 'ACTIVE' : 'NO'}
                            </span>
                          </div>
                          <p className="text-sm text-neutral-300 leading-normal">{m.nearFinishShield.explanation}</p>
                        </div>

                        {/* Rule B */}
                        <div className="bg-neutral-900 p-3.5 rounded-lg border border-neutral-800 space-y-1.5">
                          <div className="text-white font-bold text-[15px] flex items-center justify-between">
                            <span>10. Rule B: Ceiling</span>
                            <span className="text-xs px-2 py-0.5 rounded border border-neutral-700 font-semibold">
                              {m.hardCeiling.applies ? 'ACTIVE' : 'NO'}
                            </span>
                          </div>
                          <p className="text-sm text-neutral-300 leading-normal">{m.hardCeiling.explanation}</p>
                        </div>

                        {/* Rule C */}
                        <div className="bg-neutral-900 p-3.5 rounded-lg border border-neutral-800 space-y-1.5">
                          <div className="text-white font-bold text-[15px] flex items-center justify-between">
                            <span>11. Rule C: Gap (ΔU)</span>
                            <span className="text-xs px-2 py-0.5 rounded border border-neutral-700 font-semibold font-mono">
                              {m.urgencyDiff > m.threshold.barrier ? 'ΔU > Θ' : 'ΔU ≤ Θ'}
                            </span>
                          </div>
                          <p className="text-sm text-neutral-300 leading-normal">
                            ΔU = <span className="font-mono">{m.candidate.urgency.toFixed(4)} − {m.current.urgency.toFixed(4)}</span> = <strong className="text-white font-mono">{m.urgencyDiff.toFixed(4)}</strong> vs Θ = <strong className="text-white font-mono">{m.threshold.barrier.toFixed(4)}</strong>
                          </p>
                        </div>
                      </div>

                      {/* Final Decision & Resulting Queue */}
                      <div className="p-4 bg-neutral-950 rounded-lg border border-neutral-700 space-y-2.5">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-neutral-800 pb-2.5">
                          <span className="text-white font-bold text-[15px]">
                            12. Final Decision: {m.decision === 'PREEMPT' ? 'PREEMPT RUNNING TASK' : 'CONTINUE CURRENT TASK'} ({m.ruleApplied})
                          </span>
                          <span className="text-sm text-neutral-300">
                            Justification: {m.decisionJustification}
                          </span>
                        </div>

                        {/* Resulting Ready Queue */}
                        <div className="text-sm text-neutral-300 flex items-center gap-2 flex-wrap">
                          <span className="text-white font-semibold">13. Resulting Ready Queue:</span>
                          {m.resultingReadyQueue.length === 0 ? (
                            <span className="italic text-neutral-500">[Empty]</span>
                          ) : (
                            m.resultingReadyQueue.map((p, idx) => (
                              <span
                                key={idx}
                                className="px-2.5 py-1 rounded bg-neutral-900 border border-neutral-800 text-neutral-200 font-mono text-xs"
                              >
                                {p.pid} (rem: {p.remainingTime.toFixed(1)} ms, wait: {p.accumulatedWait.toFixed(1)} ms)
                              </span>
                            ))
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Section 4: Final Results at the Bottom of Trace Page */}
        <div className="pt-6 border-t border-neutral-800 space-y-6">
          <div className="text-[22px] font-bold text-white tracking-tight uppercase">
            Final Results & Performance Metrics
          </div>

          {/* Final Gantt Chart */}
          <GanttChart
            results={{ [result.algorithmId]: result }}
            activeAlgorithm={result.algorithmId}
            onSelectAlgorithm={() => {}}
            standalone={true}
          />

          {/* Per-Process Metrics Table with Step-by-Step Calculations */}
          <div className="mono-panel rounded-lg p-5 sm:p-6 space-y-5">
            <h4 className="text-[20px] font-bold text-white uppercase">
              Per-Process Turnaround, Waiting, and Response Time Calculations
            </h4>

            <div className="overflow-x-auto min-w-full">
              <table className="w-full text-left text-[15px] border-collapse min-w-[700px]">
                <thead>
                  <tr className="border-b border-neutral-800 text-neutral-300 bg-neutral-900/60 font-semibold">
                    <th className="py-3 px-3.5">PID</th>
                    <th className="py-3 px-3.5">Arrival (AT)</th>
                    <th className="py-3 px-3.5">Burst (BT)</th>
                    <th className="py-3 px-3.5">Completion (C)</th>
                    <th className="py-3 px-3.5">Turnaround Time (C − AT)</th>
                    <th className="py-3 px-3.5">Waiting Time (TAT − BT)</th>
                    <th className="py-3 px-3.5">Response Time (First − AT)</th>
                    <th className="py-3 px-3.5 text-right">Context Switches</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-900">
                  {result.processMetrics.map((p) => {
                    const tatFormula = `${p.completionTime.toFixed(2)} − ${p.arrivalTime.toFixed(2)} = ${p.turnaroundTime.toFixed(2)} ms`;
                    const wtFormula = `${p.turnaroundTime.toFixed(2)} − ${p.burstTime.toFixed(2)} = ${p.standardWaitingTime.toFixed(2)} ms`;
                    const firstStart = p.arrivalTime + p.responseTime;
                    const rtFormula = `${firstStart.toFixed(2)} − ${p.arrivalTime.toFixed(2)} = ${p.responseTime.toFixed(2)} ms`;

                    return (
                      <tr key={p.pid} className="hover:bg-neutral-900/40">
                        <td className="py-2.5 px-3.5 font-bold text-white font-mono">{p.pid}</td>
                        <td className="py-2.5 px-3.5 text-neutral-300 font-mono">{p.arrivalTime.toFixed(1)}</td>
                        <td className="py-2.5 px-3.5 text-neutral-300 font-mono">{p.burstTime.toFixed(1)}</td>
                        <td className="py-2.5 px-3.5 text-white font-bold font-mono">{p.completionTime.toFixed(2)}</td>
                        <td className="py-2.5 px-3.5 text-neutral-200 font-mono">{tatFormula}</td>
                        <td className="py-2.5 px-3.5 text-neutral-200 font-mono">{wtFormula}</td>
                        <td className="py-2.5 px-3.5 text-neutral-200 font-mono">{rtFormula}</td>
                        <td className="py-2.5 px-3.5 text-right text-white font-bold font-mono">{p.contextSwitches}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Global Summary Statistics */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3.5 pt-4 border-t border-neutral-800">
              <div className="bg-neutral-900 p-3 rounded-lg border border-neutral-800">
                <span className="text-neutral-400 text-xs block mb-1">Avg Waiting Time</span>
                <span className="text-base font-bold text-white font-mono">{result.metrics.avgWaitingTime.toFixed(2)} ms</span>
              </div>
              <div className="bg-neutral-900 p-3 rounded-lg border border-neutral-800">
                <span className="text-neutral-400 text-xs block mb-1">Avg Turnaround</span>
                <span className="text-base font-bold text-white font-mono">{result.metrics.avgTurnaroundTime.toFixed(2)} ms</span>
              </div>
              <div className="bg-neutral-900 p-3 rounded-lg border border-neutral-800">
                <span className="text-neutral-400 text-xs block mb-1">Avg Response</span>
                <span className="text-base font-bold text-white font-mono">{result.metrics.avgResponseTime.toFixed(2)} ms</span>
              </div>
              <div className="bg-neutral-900 p-3 rounded-lg border border-neutral-800">
                <span className="text-neutral-400 text-xs block mb-1">Context Switches</span>
                <span className="text-base font-bold text-white font-mono">{result.metrics.totalContextSwitches} ({result.metrics.totalContextSwitchOverhead.toFixed(2)} ms)</span>
              </div>
              <div className="bg-neutral-900 p-3 rounded-lg border border-neutral-800">
                <span className="text-neutral-400 text-xs block mb-1">Total Elapsed</span>
                <span className="text-base font-bold text-white font-mono">{result.metrics.totalElapsedTime.toFixed(2)} ms</span>
              </div>
              <div className="bg-neutral-900 p-3 rounded-lg border border-neutral-800">
                <span className="text-neutral-400 text-xs block mb-1">CPU Utilization</span>
                <span className="text-base font-bold text-white font-mono">{result.metrics.cpuUtilization.toFixed(1)}%</span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export const AdaptCsTracePage = DartTracePage;

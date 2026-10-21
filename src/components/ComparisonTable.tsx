import React from 'react';
import { AlgorithmResult } from '../engine/types';
import { Download, CheckCircle2 } from 'lucide-react';

interface ComparisonTableProps {
  results: Record<string, AlgorithmResult>;
  activeAlgorithm: string;
  onSelectAlgorithm: (algKey: string) => void;
  showComparisonMatrix?: boolean;
}

export const ComparisonTable: React.FC<ComparisonTableProps> = ({
  results,
  activeAlgorithm,
  onSelectAlgorithm,
  showComparisonMatrix = true,
}) => {
  const algKeys = Object.keys(results);
  const currentResult = results[activeAlgorithm] || Object.values(results)[0];

  const getBestValue = (getter: (r: AlgorithmResult) => number, isMin: boolean = true) => {
    const values = algKeys.map((k) => getter(results[k]));
    return isMin ? Math.min(...values) : Math.max(...values);
  };

  const bestAvgWait = getBestValue((r) => r.metrics.avgWaitingTime, true);
  const bestAvgReadyWait = getBestValue((r) => r.metrics.avgReadyQueueWaitingTime, true);
  const bestAvgTat = getBestValue((r) => r.metrics.avgTurnaroundTime, true);
  const bestAvgResp = getBestValue((r) => r.metrics.avgResponseTime, true);
  const bestCs = getBestValue((r) => r.metrics.totalContextSwitches, true);
  const bestCsOverhead = getBestValue((r) => r.metrics.totalContextSwitchOverhead, true);
  const bestUtilization = getBestValue((r) => r.metrics.cpuUtilization, false);
  const bestThroughput = getBestValue((r) => r.metrics.throughput, false);
  const bestTotalTime = getBestValue((r) => r.metrics.totalElapsedTime, true);

  const exportComparisonCSV = () => {
    let csv =
      'Algorithm,Avg Waiting Time (ms),Avg Ready Queue Wait (ms),Avg Turnaround (ms),Avg Response (ms),Context Switches,CS Overhead (ms),Idle Time (ms),Total Elapsed Time (ms),CPU Utilization (%),Throughput (procs/ms),Max Wait Time (ms)\n';

    for (const [, res] of Object.entries(results)) {
      const m = res.metrics;
      csv += `"${res.name}",${m.avgWaitingTime},${m.avgReadyQueueWaitingTime},${m.avgTurnaroundTime},${m.avgResponseTime},${m.totalContextSwitches},${m.totalContextSwitchOverhead},${m.totalIdleTime},${m.totalElapsedTime},${m.cpuUtilization},${m.throughput},${m.maxWaitingTime}\n`;
    }

    csv += '\n\nProcess Breakdown for ' + currentResult.name + '\n';
    csv +=
      'PID,Arrival (ms),Burst (ms),Priority,Type,Completion (ms),Turnaround (ms),Standard Wait (ms),Ready Queue Wait (ms),Response (ms),Context Switches\n';
    for (const p of currentResult.processMetrics) {
      csv += `${p.pid},${p.arrivalTime},${p.burstTime},${p.priority},${p.processType},${p.completionTime},${p.turnaroundTime},${p.standardWaitingTime},${p.readyQueueWaitingTime},${p.responseTime},${p.contextSwitches}\n`;
    }

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `cpu_scheduling_benchmark_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Comparison Matrix Table */}
      {showComparisonMatrix && (
        <div className="mono-panel rounded-lg p-5 sm:p-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3.5 border-b border-neutral-800">
            <div>
              <h3 className="text-[22px] sm:text-2xl font-bold text-white tracking-tight">
                Algorithm Comparison Results
              </h3>
              <p className="text-base text-neutral-300 mt-1">
                Side-by-side performance comparison across all evaluated scheduling algorithms.
              </p>
            </div>

            <button
              onClick={exportComparisonCSV}
              className="flex items-center gap-2 px-4 py-2 text-[15px] font-medium text-neutral-300 bg-neutral-900 hover:text-white hover:bg-neutral-800 border border-neutral-700 rounded-md transition"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </button>
          </div>

          <div className="overflow-x-auto min-w-full">
            <table className="w-full text-left text-[15px] border-collapse min-w-[650px]">
              <thead>
                <tr className="border-b border-neutral-800 text-neutral-300 bg-neutral-900/60 font-semibold">
                  <th className="py-3 px-3.5">Metric</th>
                  {algKeys.map((k) => (
                    <th
                      key={k}
                      onClick={() => onSelectAlgorithm(k)}
                      className={`py-3 px-3.5 text-center cursor-pointer transition ${
                        activeAlgorithm === k
                          ? 'bg-neutral-800 text-white font-bold'
                          : 'text-neutral-300 hover:text-white'
                      }`}
                    >
                      <div className="truncate max-w-[150px] mx-auto">{results[k].name}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-900">
                {/* Context Switches */}
                <tr className="hover:bg-neutral-900/40">
                  <td className="py-3 px-3.5 text-neutral-200 font-medium">
                    Context Switches (count)
                  </td>
                  {algKeys.map((k) => {
                    const val = results[k].metrics.totalContextSwitches;
                    const isBest = Math.abs(val - bestCs) < 1e-4;
                    return (
                      <td
                        key={k}
                        className={`py-3 px-3.5 text-center font-mono ${
                          isBest ? 'text-white font-bold underline bg-neutral-900/80' : 'text-neutral-300'
                        }`}
                      >
                        {val}
                        {isBest && <CheckCircle2 className="inline ml-1.5 w-4 h-4 text-white" />}
                      </td>
                    );
                  })}
                </tr>

                {/* CS Overhead */}
                <tr className="hover:bg-neutral-900/40">
                  <td className="py-3 px-3.5 text-neutral-200 font-medium">
                    Context-Switch Overhead (ms)
                  </td>
                  {algKeys.map((k) => {
                    const val = results[k].metrics.totalContextSwitchOverhead;
                    const isBest = Math.abs(val - bestCsOverhead) < 1e-4;
                    return (
                      <td
                        key={k}
                        className={`py-3 px-3.5 text-center font-mono ${
                          isBest ? 'text-white font-bold underline bg-neutral-900/80' : 'text-neutral-300'
                        }`}
                      >
                        {val.toFixed(2)} ms
                      </td>
                    );
                  })}
                </tr>

                {/* Avg Waiting Time */}
                <tr className="hover:bg-neutral-900/40">
                  <td className="py-3 px-3.5 text-neutral-200 font-medium">
                    Avg Waiting Time (TAT − Burst)
                  </td>
                  {algKeys.map((k) => {
                    const val = results[k].metrics.avgWaitingTime;
                    const isBest = Math.abs(val - bestAvgWait) < 1e-4;
                    return (
                      <td
                        key={k}
                        className={`py-3 px-3.5 text-center font-mono ${
                          isBest ? 'text-white font-bold underline bg-neutral-900/80' : 'text-neutral-300'
                        }`}
                      >
                        {val.toFixed(2)} ms
                      </td>
                    );
                  })}
                </tr>

                {/* Ready Queue Wait */}
                <tr className="hover:bg-neutral-900/40">
                  <td className="py-2.5 px-3.5 text-neutral-400 font-normal text-sm pl-7">
                    ↳ Avg Ready-Queue Wait (Accumulated)
                  </td>
                  {algKeys.map((k) => {
                    const val = results[k].metrics.avgReadyQueueWaitingTime;
                    const isBest = Math.abs(val - bestAvgReadyWait) < 1e-4;
                    return (
                      <td
                        key={k}
                        className={`py-2.5 px-3.5 text-center font-mono text-neutral-400 ${
                          isBest ? 'text-white font-bold' : ''
                        }`}
                      >
                        {val.toFixed(2)} ms
                      </td>
                    );
                  })}
                </tr>

                {/* Avg Turnaround Time */}
                <tr className="hover:bg-neutral-900/40">
                  <td className="py-3 px-3.5 text-neutral-200 font-medium">
                    Avg Turnaround Time (TAT)
                  </td>
                  {algKeys.map((k) => {
                    const val = results[k].metrics.avgTurnaroundTime;
                    const isBest = Math.abs(val - bestAvgTat) < 1e-4;
                    return (
                      <td
                        key={k}
                        className={`py-3 px-3.5 text-center font-mono ${
                          isBest ? 'text-white font-bold underline bg-neutral-900/80' : 'text-neutral-300'
                        }`}
                      >
                        {val.toFixed(2)} ms
                      </td>
                    );
                  })}
                </tr>

                {/* Avg Response Time */}
                <tr className="hover:bg-neutral-900/40">
                  <td className="py-3 px-3.5 text-neutral-200 font-medium">
                    Avg Response Time (First Start)
                  </td>
                  {algKeys.map((k) => {
                    const val = results[k].metrics.avgResponseTime;
                    const isBest = Math.abs(val - bestAvgResp) < 1e-4;
                    return (
                      <td
                        key={k}
                        className={`py-3 px-3.5 text-center font-mono ${
                          isBest ? 'text-white font-bold underline bg-neutral-900/80' : 'text-neutral-300'
                        }`}
                      >
                        {val.toFixed(2)} ms
                      </td>
                    );
                  })}
                </tr>

                {/* CPU Utilization */}
                <tr className="hover:bg-neutral-900/40">
                  <td className="py-3 px-3.5 text-neutral-200 font-medium">
                    CPU Utilization (%)
                  </td>
                  {algKeys.map((k) => {
                    const val = results[k].metrics.cpuUtilization;
                    const isBest = Math.abs(val - bestUtilization) < 1e-4;
                    return (
                      <td
                        key={k}
                        className={`py-3 px-3.5 text-center font-mono ${
                          isBest ? 'text-white font-bold underline bg-neutral-900/80' : 'text-neutral-300'
                        }`}
                      >
                        {val.toFixed(1)}%
                      </td>
                    );
                  })}
                </tr>

                {/* Throughput */}
                <tr className="hover:bg-neutral-900/40">
                  <td className="py-3 px-3.5 text-neutral-200 font-medium">
                    Throughput (procs/ms)
                  </td>
                  {algKeys.map((k) => {
                    const val = results[k].metrics.throughput;
                    const isBest = Math.abs(val - bestThroughput) < 1e-4;
                    return (
                      <td
                        key={k}
                        className={`py-3 px-3.5 text-center font-mono ${
                          isBest ? 'text-white font-bold underline bg-neutral-900/80' : 'text-neutral-300'
                        }`}
                      >
                        {val.toFixed(4)}
                      </td>
                    );
                  })}
                </tr>

                {/* Total Simulation Duration */}
                <tr className="hover:bg-neutral-900/40">
                  <td className="py-3 px-3.5 text-neutral-200 font-medium">
                    Total Elapsed Time (ms)
                  </td>
                  {algKeys.map((k) => {
                    const val = results[k].metrics.totalElapsedTime;
                    const isBest = Math.abs(val - bestTotalTime) < 1e-4;
                    return (
                      <td
                        key={k}
                        className={`py-3 px-3.5 text-center font-mono ${
                          isBest ? 'text-white font-bold underline bg-neutral-900/80' : 'text-neutral-300'
                        }`}
                      >
                        {val.toFixed(2)} ms
                      </td>
                    );
                  })}
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Process Metrics Table */}
      <div className="mono-panel rounded-lg p-5 sm:p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3.5 border-b border-neutral-800">
          <div>
            <h4 className="text-[20px] sm:text-[22px] font-bold text-white tracking-tight">
              Final Process Metrics: {currentResult.name}
            </h4>
            <p className="text-base text-neutral-300 mt-1">
              Individual process turnaround time, waiting time, and response time metrics.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto min-w-full">
          <table className="w-full text-left text-[15px] border-collapse min-w-[650px]">
            <thead>
              <tr className="border-b border-neutral-800 text-neutral-300 bg-neutral-900/60 font-semibold">
                <th className="py-3 px-3">PID</th>
                <th className="py-3 px-3">AT</th>
                <th className="py-3 px-3">BT</th>
                <th className="py-3 px-3">Priority</th>
                <th className="py-3 px-3">Type</th>
                <th className="py-3 px-3 text-white font-bold">CT (ms)</th>
                <th className="py-3 px-3 text-white font-bold">TAT (ms)</th>
                <th className="py-3 px-3 text-neutral-200">WT (ms)</th>
                <th className="py-3 px-3 text-neutral-300">Ready Wait</th>
                <th className="py-3 px-3 text-neutral-200">RT (ms)</th>
                <th className="py-3 px-3 text-right">CS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-900">
              {currentResult.processMetrics.map((p) => (
                <tr key={p.pid} className="hover:bg-neutral-900/50">
                  <td className="py-2.5 px-3 font-bold text-white font-mono">{p.pid}</td>
                  <td className="py-2.5 px-3 text-neutral-300 font-mono">{p.arrivalTime.toFixed(1)}</td>
                  <td className="py-2.5 px-3 text-neutral-300 font-mono">{p.burstTime.toFixed(1)}</td>
                  <td className="py-2.5 px-3 text-neutral-300 font-mono">{p.priority}</td>
                  <td className="py-2.5 px-3 text-neutral-200 capitalize">{p.processType}</td>
                  <td className="py-2.5 px-3 text-white font-bold font-mono">{p.completionTime.toFixed(2)}</td>
                  <td className="py-2.5 px-3 text-white font-bold font-mono">{p.turnaroundTime.toFixed(2)}</td>
                  <td className="py-2.5 px-3 text-neutral-200 font-mono">{p.standardWaitingTime.toFixed(2)}</td>
                  <td className="py-2.5 px-3 text-neutral-300 font-mono">{p.readyQueueWaitingTime.toFixed(2)}</td>
                  <td className="py-2.5 px-3 text-neutral-200 font-mono">{p.responseTime.toFixed(2)}</td>
                  <td className="py-2.5 px-3 text-right text-white font-bold font-mono">{p.contextSwitches}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

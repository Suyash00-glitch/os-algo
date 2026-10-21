import React, { useState } from 'react';
import { AlgorithmResult, ExecutionSegment } from '../engine/types';
import { Layers, Info, Clock, ArrowRight } from 'lucide-react';

interface GanttChartProps {
  results: Record<string, AlgorithmResult>;
  activeAlgorithm: string;
  onSelectAlgorithm: (algKey: string) => void;
  standalone?: boolean;
}

// Deterministic grayscale shades for processes in strict monochrome
const MONO_SHADES = [
  '#262626', // neutral-800
  '#333333',
  '#404040',
  '#4d4d4d',
  '#595959',
  '#666666',
  '#737373',
  '#808080',
];

export const GanttChart: React.FC<GanttChartProps> = ({
  results,
  activeAlgorithm,
  onSelectAlgorithm,
  standalone = false,
}) => {
  const [selectedSegment, setSelectedSegment] = useState<ExecutionSegment | null>(null);
  const [viewMode, setViewMode] = useState<'single' | 'stacked'>('single');

  const currentResult = results[activeAlgorithm] || Object.values(results)[0];

  const getProcessBg = (pid?: string, index: number = 0) => {
    if (!pid) return '#262626';
    const numMatch = pid.match(/\d+/);
    const num = numMatch ? parseInt(numMatch[0], 10) : index;
    return MONO_SHADES[(num - 1) % MONO_SHADES.length];
  };

  const renderTimelineBar = (result: AlgorithmResult, showHeader: boolean = false) => {
    const totalTime = result.metrics.totalElapsedTime;

    return (
      <div key={result.algorithmId} className="space-y-2">
        {showHeader && (
          <div className="flex items-center justify-between text-sm text-neutral-300">
            <span className="text-white font-bold text-base">
              {result.name}
            </span>
            <span className="text-sm text-neutral-300 font-medium">
              Total: <span className="font-mono text-white">{totalTime.toFixed(1)} ms</span> | CS: <span className="font-mono text-white">{result.metrics.totalContextSwitches}</span> (<span className="font-mono text-neutral-200">{result.metrics.totalContextSwitchOverhead.toFixed(1)} ms</span>)
            </span>
          </div>
        )}

        {/* Scrollable Timeline track container */}
        <div className="overflow-x-auto min-w-full pb-1">
          <div className="min-w-[640px] space-y-1.5">
            <div className="relative h-14 bg-neutral-950 rounded-md border border-neutral-700 overflow-hidden flex shadow-inner">
              {result.timeline.map((seg, i) => {
                const widthPct = ((seg.endTime - seg.startTime) / totalTime) * 100;
                const isCs = seg.type === 'CS';
                const isIdle = seg.type === 'IDLE';

                let bgStyle: React.CSSProperties = {};
                if (isCs) {
                  bgStyle = {};
                } else if (isIdle) {
                  bgStyle = {};
                } else {
                  bgStyle = { backgroundColor: getProcessBg(seg.pid, i) };
                }

                return (
                  <div
                    key={i}
                    onClick={() => setSelectedSegment(seg)}
                    style={{ width: `${Math.max(widthPct, 0.5)}%`, ...bgStyle }}
                    className={`h-full relative group cursor-pointer border-r border-neutral-900 flex flex-col items-center justify-center transition-all hover:brightness-125 hover:z-10 ${
                      isCs ? 'cs-striped' : isIdle ? 'idle-striped' : ''
                    } ${
                      selectedSegment === seg ? 'ring-2 ring-white z-20 brightness-125' : ''
                    }`}
                    title={`[${seg.startTime.toFixed(1)} - ${seg.endTime.toFixed(1)} ms] ${seg.description || seg.type}`}
                  >
                    {!isCs && !isIdle && (
                      <span className="text-[15px] font-bold text-white select-none truncate px-1">
                        {seg.pid}
                      </span>
                    )}
                    {isCs && (
                      <span className="text-[13px] text-neutral-200 font-bold select-none tracking-tight">
                        CS
                      </span>
                    )}
                    {isIdle && (
                      <span className="text-[13px] text-neutral-400 font-medium select-none">
                        IDLE
                      </span>
                    )}

                    {!isCs && !isIdle && widthPct > 6 && seg.remainingAfter !== undefined && (
                      <span className="text-xs text-neutral-300 font-mono select-none">
                        rem:{seg.remainingAfter.toFixed(1)}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Timestamp tick marks */}
            <div className="relative h-6 text-[13px] font-mono text-neutral-300 flex justify-between px-1">
              <span>0.0 ms</span>
              {result.timeline.slice(0, 12).map((seg, idx) => (
                <span
                  key={idx}
                  className="hidden sm:inline-block"
                  style={{
                    position: 'absolute',
                    left: `${(seg.endTime / totalTime) * 100}%`,
                    transform: 'translateX(-50%)',
                  }}
                >
                  {seg.endTime.toFixed(1)}
                </span>
              ))}
              <span>{totalTime.toFixed(1)} ms</span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="mono-panel rounded-lg p-5 sm:p-6 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3.5 border-b border-neutral-800">
        <div>
          <h3 className="text-[22px] sm:text-2xl font-bold text-white flex items-center gap-2.5">
            <Layers className="w-5 h-5 text-white" />
            Gantt Chart (Execution Timeline)
          </h3>
          <p className="text-base text-neutral-300 mt-1">
            Click any segment to view start, end, duration, and remaining burst.
          </p>
        </div>

        {!standalone && (
          <div className="flex items-center gap-2">
            <div className="bg-neutral-900 p-1 rounded-md border border-neutral-700 flex items-center text-[15px]">
              <button
                onClick={() => setViewMode('single')}
                className={`px-3.5 py-1.5 rounded transition font-medium ${
                  viewMode === 'single'
                    ? 'bg-neutral-800 text-white font-semibold'
                    : 'text-neutral-300 hover:text-white'
                }`}
              >
                Selected
              </button>
              <button
                onClick={() => setViewMode('stacked')}
                className={`px-3.5 py-1.5 rounded transition font-medium ${
                  viewMode === 'stacked'
                    ? 'bg-neutral-800 text-white font-semibold'
                    : 'text-neutral-300 hover:text-white'
                }`}
              >
                Stacked
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Algorithm Selector Tabs if not standalone */}
      {!standalone && (
        <div className="flex flex-wrap gap-2.5">
          {Object.entries(results).map(([key, res]) => (
            <button
              key={key}
              onClick={() => {
                onSelectAlgorithm(key);
                setSelectedSegment(null);
              }}
              className={`px-4 py-2 rounded-md text-[15px] font-medium transition flex items-center gap-2.5 border ${
                activeAlgorithm === key
                  ? 'bg-white text-black font-bold border-white shadow-sm'
                  : 'bg-neutral-900 text-neutral-300 border-neutral-700 hover:text-white hover:bg-neutral-800 hover:border-neutral-600'
              }`}
            >
              <span>{res.name}</span>
              <span className="text-sm font-mono opacity-80">
                {res.metrics.totalElapsedTime.toFixed(1)} ms
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Render Chart */}
      <div className="space-y-6 pt-1">
        {viewMode === 'single' && currentResult && renderTimelineBar(currentResult, false)}

        {viewMode === 'stacked' && !standalone && (
          <div className="space-y-6">
            {Object.values(results).map((res) => renderTimelineBar(res, true))}
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-6 pt-4 border-t border-neutral-800 text-sm text-neutral-300">
        <div className="flex items-center gap-2">
          <span className="w-4 h-4 rounded bg-neutral-700 border border-neutral-600" />
          <span>Process Execution (CPU Active)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-4 h-4 rounded cs-striped border border-neutral-700" />
          <span>Context Switch Overhead (CS)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-4 h-4 rounded idle-striped border border-neutral-800" />
          <span>CPU Idle (No Ready Tasks)</span>
        </div>
      </div>

      {/* Segment Detail Popup */}
      {selectedSegment && (
        <div className="p-4 rounded-lg bg-neutral-900 border border-neutral-700 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-sm">
          <div className="flex items-center gap-3.5">
            <Info className="w-5 h-5 text-white shrink-0" />
            <div>
              <div className="text-white font-bold text-base flex items-center gap-2.5">
                <span>{selectedSegment.description || selectedSegment.type}</span>
                <span className="text-xs px-2 py-0.5 rounded bg-neutral-800 text-neutral-200 border border-neutral-700 font-mono">
                  {selectedSegment.type}
                </span>
              </div>
              <div className="text-neutral-300 mt-1 flex items-center gap-2.5 flex-wrap text-sm">
                <Clock className="w-4 h-4 text-neutral-400" />
                <span className="font-mono">
                  [{selectedSegment.startTime.toFixed(2)} ms <ArrowRight className="inline w-3.5 h-3.5" /> {selectedSegment.endTime.toFixed(2)} ms]
                </span>
                <span>|</span>
                <span className="text-white font-semibold">
                  Duration: <span className="font-mono">{((selectedSegment.endTime - selectedSegment.startTime)).toFixed(2)} ms</span>
                </span>
                {selectedSegment.remainingAfter !== undefined && (
                  <>
                    <span>|</span>
                    <span className="text-neutral-200">
                      Remaining After Slice: <span className="font-mono font-semibold">{selectedSegment.remainingAfter.toFixed(2)} ms</span>
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          <button
            onClick={() => setSelectedSegment(null)}
            className="text-sm text-neutral-300 hover:text-white px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 rounded-md border border-neutral-700 transition"
          >
            Dismiss
          </button>
        </div>
      )}
    </div>
  );
};

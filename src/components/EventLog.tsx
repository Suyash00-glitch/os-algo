import React, { useState } from 'react';
import { SimulationEvent } from '../engine/types';
import { ListFilter, Search, Download, Clock, ShieldAlert, CheckCircle } from 'lucide-react';

interface EventLogProps {
  events: SimulationEvent[];
  algorithmName: string;
}

export const EventLog: React.FC<EventLogProps> = ({ events, algorithmName }) => {
  const [filterType, setFilterType] = useState<string>('ALL');
  const [searchPid, setSearchPid] = useState<string>('');

  const filteredEvents = events.filter((e) => {
    if (filterType !== 'ALL' && e.eventType !== filterType) {
      return false;
    }
    if (searchPid.trim()) {
      const term = searchPid.toLowerCase();
      const inRunning = e.runningPid?.toLowerCase().includes(term);
      const inCandidate = e.candidatePid?.toLowerCase().includes(term);
      const inQueue = e.readyQueue.some((p) => p.pid.toLowerCase().includes(term));
      const inReason = e.reason.toLowerCase().includes(term);
      if (!inRunning && !inCandidate && !inQueue && !inReason) {
        return false;
      }
    }
    return true;
  });

  const exportEventsCSV = () => {
    let csv = 'Step,Time (ms),Event Type,Running PID,Running Remaining (ms),Slice Time (ms),Candidate PID,Candidate Urgency,Running Urgency,Urgency Diff,Barrier,Near Finish Shield,Hard Ceiling,Preempt Decision,Reason\n';
    for (const e of events) {
      csv += `${e.stepIndex},${e.time},${e.eventType},"${e.runningPid || ''}",${e.runningRemaining ?? ''},${e.runningSliceTime ?? ''},"${e.candidatePid || ''}",${e.candidateUrgency ?? ''},${e.runningUrgency ?? ''},${e.urgencyDiff ?? ''},${e.barrier ?? ''},${e.nearFinishShieldApplied ?? ''},${e.hardCeilingApplied ?? ''},${e.preemptDecision ?? ''},"${e.reason.replace(/"/g, '""')}"\n`;
    }

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `event_log_${algorithmName.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const getBadgeForType = (type: SimulationEvent['eventType']) => {
    switch (type) {
      case 'ARRIVAL':
        return 'bg-blue-950/80 text-blue-300 border-blue-800';
      case 'DISPATCH':
        return 'bg-cyan-950/80 text-cyan-300 border-cyan-800';
      case 'EVAL_TICK':
        return 'bg-indigo-950/80 text-indigo-300 border-indigo-800';
      case 'PREEMPTION':
        return 'bg-amber-950/80 text-amber-300 border-amber-800';
      case 'COMPLETION':
        return 'bg-emerald-950/80 text-emerald-300 border-emerald-800';
      case 'IDLE':
        return 'bg-slate-900 text-slate-400 border-slate-700';
      default:
        return 'bg-slate-900 text-slate-300 border-slate-800';
    }
  };

  return (
    <div className="glass-panel rounded-xl p-5 border border-slate-800 shadow-xl space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-800">
        <div>
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <ListFilter className="w-5 h-5 text-cyan-400" />
            Detailed Simulation Event Trace ({algorithmName})
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Step-by-step mathematical trace of preemption checks, urgency scores, barrier resistance, and queue transitions.
          </p>
        </div>

        <button
          onClick={exportEventsCSV}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-200 bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded-lg transition"
        >
          <Download className="w-4 h-4 text-cyan-400" />
          Export Event Log CSV
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1.5 bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-800 text-xs">
          <Search className="w-3.5 h-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search PID or keyword..."
            value={searchPid}
            onChange={(e) => setSearchPid(e.target.value)}
            className="bg-transparent border-0 text-slate-200 focus:outline-none placeholder-slate-500 w-36 sm:w-48"
          />
        </div>

        <div className="flex items-center gap-1 text-xs">
          {['ALL', 'ARRIVAL', 'DISPATCH', 'EVAL_TICK', 'PREEMPTION', 'COMPLETION'].map((type) => (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              className={`px-2.5 py-1 rounded-md transition text-[11px] font-medium ${
                filterType === type
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                  : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      {/* Event list */}
      <div className="space-y-3 max-h-[550px] overflow-y-auto pr-1">
        {filteredEvents.length === 0 ? (
          <div className="text-center py-8 text-slate-500 text-sm">
            No events match the selected criteria.
          </div>
        ) : (
          filteredEvents.map((e) => (
            <div
              key={e.stepIndex}
              className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/80 hover:border-slate-700 transition space-y-2 text-xs"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-cyan-400 font-semibold flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-slate-500" />
                    {e.time.toFixed(2)} ms
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getBadgeForType(
                      e.eventType
                    )}`}
                  >
                    {e.eventType}
                  </span>
                  {e.runningPid && (
                    <span className="font-mono text-slate-300">
                      Running: <span className="font-bold text-white">{e.runningPid}</span> (rem:{' '}
                      {e.runningRemaining?.toFixed(2)} ms)
                    </span>
                  )}
                </div>

                {e.preemptDecision !== undefined && (
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1 ${
                      e.preemptDecision
                        ? 'bg-amber-950/80 text-amber-300 border border-amber-800'
                        : 'bg-emerald-950/80 text-emerald-300 border border-emerald-800'
                    }`}
                  >
                    {e.preemptDecision ? (
                      <>
                        <ShieldAlert className="w-3 h-3 text-amber-400" />
                        PREEMPTION TRIGGERED
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-3 h-3 text-emerald-400" />
                        PREEMPTION BLOCKED
                      </>
                    )}
                  </span>
                )}
              </div>

              {/* Action Headline & Reason */}
              <p className="text-slate-200 font-medium">{e.reason}</p>

              {/* Math breakdown if available */}
              {e.stepDetails?.formulaBreakdown && e.stepDetails.formulaBreakdown.length > 0 && (
                <div className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800 font-mono text-[11px] text-cyan-300/90 space-y-1">
                  {e.stepDetails.formulaBreakdown.map((line, idx) => (
                    <div key={idx}>{line}</div>
                  ))}
                </div>
              )}

              {/* Ready Queue State */}
              <div className="flex items-center gap-2 text-[11px] text-slate-400 flex-wrap">
                <span className="text-slate-500 font-semibold">Ready Queue:</span>
                {e.readyQueue.length === 0 ? (
                  <span className="italic text-slate-500">[Empty]</span>
                ) : (
                  e.readyQueue.map((p, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono border border-slate-700/60"
                    >
                      {p.pid} (w:{p.accumulatedWait.toFixed(1)}ms, r:{p.remainingTime.toFixed(1)}ms
                      {p.urgency !== undefined && `, U:${p.urgency.toFixed(2)}`})
                    </span>
                  ))
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

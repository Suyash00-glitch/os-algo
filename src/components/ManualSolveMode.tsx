import React, { useState, useEffect } from 'react';
import { AlgorithmResult } from '../engine/types';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  RotateCcw,
  BookOpen,
  Calculator,
  Shield,
  Clock,
  ArrowRight,
  Sparkles,
} from 'lucide-react';

interface ManualSolveModeProps {
  result: AlgorithmResult;
}

export const ManualSolveMode: React.FC<ManualSolveModeProps> = ({ result }) => {
  const events = result.events;
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [speed, setSpeed] = useState<number>(1500); // ms per step

  // Reset to first step if algorithm changes
  useEffect(() => {
    setCurrentStepIndex(0);
    setIsPlaying(false);
  }, [result.algorithmId]);

  // Auto-play timer
  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | null = null;
    if (isPlaying) {
      timer = setInterval(() => {
        setCurrentStepIndex((prev) => {
          if (prev >= events.length - 1) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, speed);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isPlaying, speed, events.length]);

  const event = events[currentStepIndex] || events[0];

  const handlePrev = () => {
    setIsPlaying(false);
    setCurrentStepIndex((prev) => Math.max(0, prev - 1));
  };

  const handleNext = () => {
    setIsPlaying(false);
    setCurrentStepIndex((prev) => Math.min(events.length - 1, prev + 1));
  };

  const handleReset = () => {
    setIsPlaying(false);
    setCurrentStepIndex(0);
  };

  return (
    <div className="space-y-6">
      {/* Educational Banner */}
      <div className="glass-panel-accent rounded-xl p-5 border border-cyan-500/30 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-cyan-400" />
            Step-by-Step Manual Solving Mode ({result.name})
          </h3>
          <p className="text-xs text-slate-300 mt-1 max-w-2xl">
            Simulates how an operating systems engineer or university student solves this scheduling problem by hand on paper. Move through events step-by-step to inspect every mathematical decision.
          </p>
        </div>

        {/* Step Controls */}
        <div className="flex items-center gap-2 bg-slate-900/90 p-2 rounded-xl border border-slate-800">
          <button
            onClick={handleReset}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
            title="Reset to beginning"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <button
            onClick={handlePrev}
            disabled={currentStepIndex <= 0}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition disabled:opacity-30 disabled:cursor-not-allowed"
            title="Previous step"
          >
            <SkipBack className="w-4 h-4" />
          </button>
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs transition shadow-md shadow-cyan-950/50"
          >
            {isPlaying ? (
              <>
                <Pause className="w-3.5 h-3.5" /> Pause
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5" /> Auto-Play
              </>
            )}
          </button>
          <button
            onClick={handleNext}
            disabled={currentStepIndex >= events.length - 1}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition disabled:opacity-30 disabled:cursor-not-allowed"
            title="Next step"
          >
            <SkipForward className="w-4 h-4" />
          </button>

          <span className="text-xs font-mono text-cyan-300 px-2 py-0.5 rounded bg-slate-950/60 border border-slate-800">
            {currentStepIndex + 1} / {events.length}
          </span>

          <select
            value={speed}
            onChange={(e) => setSpeed(Number(e.target.value))}
            className="bg-slate-950 text-slate-300 text-xs rounded border border-slate-800 px-2 py-1 focus:outline-none"
            title="Playback Speed"
          >
            <option value="2500">0.5x</option>
            <option value="1500">1.0x</option>
            <option value="800">2.0x</option>
          </select>
        </div>
      </div>

      {/* Mini Gantt Progress Track */}
      <div className="glass-panel rounded-xl p-4 border border-slate-800">
        <div className="flex items-center justify-between text-xs text-slate-400 mb-2 font-mono">
          <span>Simulation Progress Track</span>
          <span>
            Current Timestamp: <strong className="text-cyan-400">{event.time.toFixed(2)} ms</strong>
          </span>
        </div>
        <div className="relative h-6 bg-slate-900 rounded-lg overflow-hidden flex border border-slate-800">
          {result.timeline.map((seg, i) => {
            const widthPct =
              ((seg.endTime - seg.startTime) / result.metrics.totalElapsedTime) * 100;
            const isCurrent = event.time >= seg.startTime && event.time <= seg.endTime;
            return (
              <div
                key={i}
                style={{
                  width: `${Math.max(widthPct, 0.5)}%`,
                  backgroundColor:
                    seg.type === 'PROCESS'
                      ? seg.color
                      : seg.type === 'CS'
                      ? '#f59e0b'
                      : '#64748b',
                }}
                className={`h-full opacity-60 transition-all ${
                  isCurrent ? 'opacity-100 ring-2 ring-white z-10 brightness-125' : ''
                }`}
              />
            );
          })}
        </div>
      </div>

      {/* 10-Point Paper-and-Pencil Breakdown Card */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Left Column: Machine & Queue State */}
        <div className="glass-panel rounded-xl p-5 border border-slate-800 space-y-4">
          <h4 className="text-sm font-bold text-white flex items-center gap-2 pb-2 border-b border-slate-800">
            <Clock className="w-4 h-4 text-cyan-400" />
            1. Current Time & Machine State
          </h4>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="bg-slate-900/60 p-3 rounded-lg border border-slate-800">
              <span className="text-slate-400 block text-[11px]">Current Time</span>
              <span className="text-base font-bold font-mono text-cyan-300">
                t = {event.time.toFixed(2)} ms
              </span>
            </div>
            <div className="bg-slate-900/60 p-3 rounded-lg border border-slate-800">
              <span className="text-slate-400 block text-[11px]">Event Type</span>
              <span className="text-sm font-bold font-mono text-white">{event.eventType}</span>
            </div>
          </div>

          {/* Running Process State */}
          <div className="p-3.5 rounded-lg bg-slate-900/60 border border-slate-800 space-y-2 text-xs">
            <span className="text-slate-400 font-semibold block">
              2. Running Process on CPU
            </span>
            {event.runningPid ? (
              <div className="space-y-1 font-mono">
                <div className="flex items-center justify-between">
                  <span className="text-white font-bold text-sm">{event.runningPid}</span>
                  <span className="text-emerald-400 font-semibold">
                    Remaining Burst: {event.runningRemaining?.toFixed(2)} ms
                  </span>
                </div>
                {event.runningSliceTime !== null && (
                  <div className="text-slate-400 text-[11px]">
                    Current Unbroken Slice: {event.runningSliceTime.toFixed(2)} ms
                  </div>
                )}
              </div>
            ) : (
              <div className="text-slate-500 italic">No process currently executing (Idle or Switching)</div>
            )}
          </div>

          {/* Ready Queue State */}
          <div className="p-3.5 rounded-lg bg-slate-900/60 border border-slate-800 space-y-2 text-xs">
            <span className="text-slate-400 font-semibold block">
              3. Ready Queue & Waiting Times
            </span>
            {event.readyQueue.length === 0 ? (
              <div className="text-slate-500 italic">Ready queue is currently empty.</div>
            ) : (
              <div className="space-y-1.5 font-mono">
                {event.readyQueue.map((p, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2 rounded bg-slate-950/60 border border-slate-800/80 text-[11px]"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white">{p.pid}</span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400">
                        {p.processType}
                      </span>
                    </div>
                    <div className="text-slate-300">
                      Wait: <span className="text-blue-300 font-semibold">{p.accumulatedWait.toFixed(2)} ms</span> | Rem: <span className="text-emerald-400 font-semibold">{p.remainingTime.toFixed(2)} ms</span>
                      {p.urgency !== undefined && (
                        <> | U: <span className="text-cyan-300 font-bold">{p.urgency.toFixed(2)}</span></>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Preemption Logic & Mathematical Calculations */}
        <div className="glass-panel rounded-xl p-5 border border-slate-800 space-y-4">
          <h4 className="text-sm font-bold text-white flex items-center gap-2 pb-2 border-b border-slate-800">
            <Calculator className="w-4 h-4 text-cyan-400" />
            Decision Engine & Mathematical Evaluation
          </h4>

          {/* Rule A & Rule B Checks */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div
              className={`p-3 rounded-lg border ${
                event.nearFinishShieldApplied
                  ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-300'
                  : 'bg-slate-900/60 border-slate-800 text-slate-400'
              }`}
            >
              <div className="font-semibold flex items-center gap-1.5 text-xs">
                <Shield className="w-3.5 h-3.5 text-emerald-400" />
                4. Near-Finish Shield
              </div>
              <div className="mt-1 font-mono text-[11px]">
                {event.nearFinishShieldApplied ? 'Active (Shielded!)' : 'Not Triggered'}
              </div>
            </div>

            <div
              className={`p-3 rounded-lg border ${
                event.hardCeilingApplied
                  ? 'bg-amber-950/40 border-amber-500/50 text-amber-300'
                  : 'bg-slate-900/60 border-slate-800 text-slate-400'
              }`}
            >
              <div className="font-semibold flex items-center gap-1.5 text-xs">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                5. Hard Ceiling
              </div>
              <div className="mt-1 font-mono text-[11px]">
                {event.hardCeilingApplied ? 'Exceeded Q_max!' : 'Within Bound'}
              </div>
            </div>
          </div>

          {/* Urgency & Barrier Calculations */}
          <div className="p-3.5 rounded-lg bg-slate-900/60 border border-slate-800 space-y-2 text-xs">
            <span className="text-slate-400 font-semibold block">
              6-8. Urgency & Barrier Comparison
            </span>

            {event.candidatePid && event.candidateUrgency !== null ? (
              <div className="space-y-1.5 font-mono text-[11px]">
                <div className="flex justify-between p-1.5 rounded bg-slate-950/60">
                  <span className="text-slate-400">6. Best Candidate {event.candidatePid} Urgency:</span>
                  <span className="text-cyan-300 font-bold">{event.candidateUrgency?.toFixed(4)}</span>
                </div>
                <div className="flex justify-between p-1.5 rounded bg-slate-950/60">
                  <span className="text-slate-400">7. Running Process Urgency:</span>
                  <span className="text-slate-300 font-bold">{event.runningUrgency?.toFixed(4)}</span>
                </div>
                <div className="flex justify-between p-1.5 rounded bg-slate-950/60">
                  <span className="text-slate-400">8. Dynamic Preemption Barrier (Θ):</span>
                  <span className="text-amber-300 font-bold">{event.barrier?.toFixed(4)}</span>
                </div>
                <div className="flex justify-between p-1.5 rounded bg-cyan-950/40 border border-cyan-800/40">
                  <span className="text-cyan-200">9. Urgency Gap (ΔU = Cand − Curr):</span>
                  <span className="text-cyan-300 font-bold">
                    {event.urgencyDiff !== undefined && event.urgencyDiff !== null
                      ? event.urgencyDiff.toFixed(4)
                      : 'N/A'}{' '}
                    {event.barrier !== undefined && event.barrier !== null && (
                      <span className="text-xs text-slate-400 font-normal">
                        ({(event.urgencyDiff ?? 0) > (event.barrier ?? 0) ? '> Θ' : '≤ Θ'})
                      </span>
                    )}
                  </span>
                </div>
              </div>
            ) : (
              <div className="text-slate-500 italic text-[11px]">
                No preemption comparison needed at this event step.
              </div>
            )}

            {/* Arithmetic Formula Breakdown */}
            {event.stepDetails?.formulaBreakdown && (
              <div className="mt-2 p-2.5 rounded bg-slate-950 border border-slate-800 text-[10px] font-mono text-slate-300 space-y-1">
                {event.stepDetails.formulaBreakdown.map((line, i) => (
                  <div key={i}>{line}</div>
                ))}
              </div>
            )}
          </div>

          {/* 10. Final Decision & Action */}
          <div className="p-3.5 rounded-lg bg-slate-950/90 border border-cyan-500/40 space-y-1.5 text-xs">
            <span className="text-cyan-400 font-bold flex items-center gap-1.5">
              <ArrowRight className="w-4 h-4" />
              10. Final Action & Next Step
            </span>
            <p className="text-white font-medium">{event.reason}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

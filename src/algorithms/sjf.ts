import { ProcessInput, AlgorithmResult, ExecutionSegment, SimulationEvent } from '../engine/types';
import { computeMetrics, InternalProcessRecord } from '../engine/metrics';

export function runSJF(
  inputs: ProcessInput[],
  csOverhead: number = 0.5,
  includeInitialDispatchInCount: boolean = true
): AlgorithmResult {
  const processes = inputs.map((p) => ({
    ...p,
    remainingTime: p.burstTime,
    accumulatedReadyWaitTime: 0,
    firstStartTime: null as number | null,
    completionTime: 0,
    contextSwitches: 0,
    color: p.color || '#10b981',
  }));

  processes.sort((a, b) => a.arrivalTime - b.arrivalTime || a.pid.localeCompare(b.pid));

  const timeline: ExecutionSegment[] = [];
  const events: SimulationEvent[] = [];
  const completed: InternalProcessRecord[] = [];
  const readyQueue: typeof processes = [];

  let currentTime = 0;
  let busyTime = 0;
  let totalCsOverhead = 0;
  let totalIdleTime = 0;
  let totalContextSwitches = 0;
  let nextProcIdx = 0;
  let stepIndex = 0;
  const n = processes.length;

  function advanceReadyWait(delta: number) {
    if (delta <= 1e-9) return;
    for (const p of readyQueue) {
      p.accumulatedReadyWaitTime += delta;
    }
  }

  function captureEvent(
    eventType: SimulationEvent['eventType'],
    runningPid: string | null,
    runningRem: number | null,
    reason: string,
    action: string,
    formulaBreakdown?: string[]
  ) {
    events.push({
      stepIndex: stepIndex++,
      time: Number(currentTime.toFixed(4)),
      eventType,
      runningPid,
      runningRemaining: runningRem !== null ? Number(runningRem.toFixed(4)) : null,
      runningSliceTime: null,
      readyQueue: readyQueue.map((p) => ({
        pid: p.pid,
        remainingTime: Number(p.remainingTime.toFixed(4)),
        accumulatedWait: Number(p.accumulatedReadyWaitTime.toFixed(4)),
        priority: p.priority,
        processType: p.processType,
      })),
      reason,
      stepDetails: {
        headline: `[t = ${currentTime.toFixed(2)} ms] ${eventType}: ${action}`,
        action,
        formulaBreakdown,
      },
    });
  }

  while (completed.length < n) {
    // 1. Enqueue all arrivals up to current time
    while (nextProcIdx < n && processes[nextProcIdx].arrivalTime <= currentTime + 1e-9) {
      const arrived = processes[nextProcIdx++];
      readyQueue.push(arrived);
      captureEvent('ARRIVAL', null, null, `Process ${arrived.pid} arrived at t = ${arrived.arrivalTime}`, `Enqueue ${arrived.pid}`);
    }

    // 2. If ready queue empty, jump to next arrival (IDLE)
    if (readyQueue.length === 0) {
      if (nextProcIdx < n) {
        const nextArrival = processes[nextProcIdx].arrivalTime;
        const idleDuration = nextArrival - currentTime;
        timeline.push({
          startTime: Number(currentTime.toFixed(4)),
          endTime: Number(nextArrival.toFixed(4)),
          type: 'IDLE',
          description: 'CPU Idle',
        });
        captureEvent('IDLE', null, null, `No ready processes. CPU idle until ${nextArrival.toFixed(2)} ms`, 'CPU Idles');
        totalIdleTime += idleDuration;
        currentTime = nextArrival;
        continue;
      } else {
        break;
      }
    }

    // 3. Select ready process with shortest remaining burst (tie-breaker: arrival, then PID)
    readyQueue.sort((a, b) => a.remainingTime - b.remainingTime || a.arrivalTime - b.arrivalTime || a.pid.localeCompare(b.pid));
    const currentProc = readyQueue.shift()!;

    // 4. Incur context switch overhead
    if (csOverhead > 0) {
      const isInitialFromIdle = timeline.length === 0 || timeline[timeline.length - 1].type === 'IDLE';
      if (includeInitialDispatchInCount || !isInitialFromIdle) {
        totalContextSwitches++;
      }
      currentProc.contextSwitches++;

      const csStart = currentTime;
      const csEnd = currentTime + csOverhead;
      timeline.push({
        startTime: Number(csStart.toFixed(4)),
        endTime: Number(csEnd.toFixed(4)),
        type: 'CS',
        description: `Context switch to ${currentProc.pid}`,
      });
      advanceReadyWait(csOverhead);
      totalCsOverhead += csOverhead;
      currentTime = csEnd;

      // Catch arrivals during CS window
      while (nextProcIdx < n && processes[nextProcIdx].arrivalTime <= currentTime + 1e-9) {
        const arrived = processes[nextProcIdx++];
        readyQueue.push(arrived);
        captureEvent('ARRIVAL', currentProc.pid, currentProc.remainingTime, `Process ${arrived.pid} arrived during context switch`, `Enqueue ${arrived.pid}`);
      }
    }

    // 5. First start time for response time
    if (currentProc.firstStartTime === null) {
      currentProc.firstStartTime = currentTime;
    }

    captureEvent(
      'DISPATCH',
      currentProc.pid,
      currentProc.remainingTime,
      `Dispatching ${currentProc.pid} with shortest burst (${currentProc.remainingTime.toFixed(2)} ms)`,
      `Run ${currentProc.pid}`
    );

    // 6. Run process to completion (Non-preemptive)
    const runDuration = currentProc.remainingTime;
    const runStart = currentTime;
    const runEnd = currentTime + runDuration;

    timeline.push({
      startTime: Number(runStart.toFixed(4)),
      endTime: Number(runEnd.toFixed(4)),
      type: 'PROCESS',
      pid: currentProc.pid,
      color: currentProc.color,
      remainingAfter: 0,
      description: `Run ${currentProc.pid}`,
    });

    advanceReadyWait(runDuration);
    busyTime += runDuration;
    currentTime = runEnd;
    currentProc.remainingTime = 0;
    currentProc.completionTime = currentTime;

    // Catch arrivals during run
    while (nextProcIdx < n && processes[nextProcIdx].arrivalTime <= currentTime + 1e-9) {
      const arrived = processes[nextProcIdx++];
      readyQueue.push(arrived);
      captureEvent('ARRIVAL', currentProc.pid, 0, `Process ${arrived.pid} arrived while ${currentProc.pid} was running`, `Enqueue ${arrived.pid}`);
    }

    completed.push(currentProc);
    captureEvent('COMPLETION', currentProc.pid, 0, `Process ${currentProc.pid} completed at t = ${currentTime.toFixed(2)} ms`, `${currentProc.pid} Terminated`);
  }

  const { processMetrics, metrics } = computeMetrics(
    completed,
    timeline,
    currentTime,
    busyTime,
    totalCsOverhead,
    totalIdleTime,
    totalContextSwitches
  );

  return {
    algorithmId: 'SJF',
    name: 'Shortest Job First (SJF - Non-Preemptive)',
    description: 'Selects the ready process with the minimum CPU burst time. Minimizes average waiting time among non-preemptive algorithms.',
    timeline,
    events,
    processMetrics,
    metrics,
  };
}

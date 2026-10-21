import { ProcessInput, AlgorithmResult, ExecutionSegment, SimulationEvent } from '../engine/types';
import { computeMetrics, InternalProcessRecord } from '../engine/metrics';

export function runRoundRobin(
  inputs: ProcessInput[],
  quantum: number = 3.0,
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
    color: p.color || '#8b5cf6',
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
  let lastRanPid: string | null = null;
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
    // 1. Enqueue arrivals up to current time
    while (nextProcIdx < n && processes[nextProcIdx].arrivalTime <= currentTime + 1e-9) {
      const arrived = processes[nextProcIdx++];
      readyQueue.push(arrived);
      captureEvent('ARRIVAL', lastRanPid, null, `Process ${arrived.pid} arrived at t = ${arrived.arrivalTime}`, `Enqueue ${arrived.pid}`);
    }

    // 2. If ready queue is empty, jump to next arrival (IDLE)
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
        captureEvent('IDLE', null, null, `Ready queue empty. CPU idle until ${nextArrival.toFixed(2)} ms`, 'CPU Idles');
        totalIdleTime += idleDuration;
        currentTime = nextArrival;
        lastRanPid = null;
        continue;
      } else {
        break;
      }
    }

    // 3. Pop next process from head of ready queue
    const currentProc = readyQueue.shift()!;

    // 4. Incur context switch ONLY if switching from another process or initial dispatch from idle
    const isSwitching = lastRanPid !== currentProc.pid;
    if (isSwitching && csOverhead > 0) {
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

      // Check arrivals during CS
      while (nextProcIdx < n && processes[nextProcIdx].arrivalTime <= currentTime + 1e-9) {
        const arrived = processes[nextProcIdx++];
        readyQueue.push(arrived);
        captureEvent('ARRIVAL', currentProc.pid, currentProc.remainingTime, `Process ${arrived.pid} arrived during context switch`, `Enqueue ${arrived.pid}`);
      }
    }

    lastRanPid = currentProc.pid;

    // 5. First start time for response time
    if (currentProc.firstStartTime === null) {
      currentProc.firstStartTime = currentTime;
    }

    // 6. Execute for up to 1 quantum (or remaining time)
    const runDuration = Math.min(quantum, currentProc.remainingTime);
    captureEvent(
      'DISPATCH',
      currentProc.pid,
      currentProc.remainingTime,
      `Dispatching ${currentProc.pid} for quantum slice of ${runDuration.toFixed(2)} ms (remaining: ${currentProc.remainingTime.toFixed(2)} ms)`,
      `Run ${currentProc.pid}`
    );

    const runStart = currentTime;
    const runEnd = currentTime + runDuration;

    timeline.push({
      startTime: Number(runStart.toFixed(4)),
      endTime: Number(runEnd.toFixed(4)),
      type: 'PROCESS',
      pid: currentProc.pid,
      color: currentProc.color,
      remainingAfter: Number(Math.max(0, currentProc.remainingTime - runDuration).toFixed(4)),
      description: `Run ${currentProc.pid} (slice: ${runDuration.toFixed(2)} ms)`,
    });

    advanceReadyWait(runDuration);
    busyTime += runDuration;
    currentTime = runEnd;
    currentProc.remainingTime -= runDuration;

    // Catch arrivals during execution slice BEFORE deciding requeue order
    while (nextProcIdx < n && processes[nextProcIdx].arrivalTime <= currentTime + 1e-9) {
      const arrived = processes[nextProcIdx++];
      readyQueue.push(arrived);
      captureEvent('ARRIVAL', currentProc.pid, currentProc.remainingTime, `Process ${arrived.pid} arrived during slice execution`, `Enqueue ${arrived.pid}`);
    }

    // 7. Check if process completed
    if (currentProc.remainingTime <= 1e-9) {
      currentProc.remainingTime = 0;
      currentProc.completionTime = currentTime;
      completed.push(currentProc);
      lastRanPid = null; // Next process dispatched will incur a switch
      captureEvent('COMPLETION', currentProc.pid, 0, `Process ${currentProc.pid} completed at t = ${currentTime.toFixed(2)} ms`, `${currentProc.pid} Terminated`);
    } else {
      // Re-enqueue unfinished process at end of ready queue
      readyQueue.push(currentProc);
      captureEvent(
        'PREEMPTION',
        currentProc.pid,
        currentProc.remainingTime,
        `Quantum expired (${quantum} ms). Re-enqueued ${currentProc.pid} with remaining burst of ${currentProc.remainingTime.toFixed(2)} ms`,
        `Preempt ${currentProc.pid}`
      );
    }
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
    algorithmId: 'RR',
    name: `Round Robin (RR, q = ${quantum} ms)`,
    description: `Time-sliced preemptive algorithm allocating equal CPU slices of ${quantum} ms. Ensures fair response times across all processes.`,
    timeline,
    events,
    processMetrics,
    metrics,
  };
}

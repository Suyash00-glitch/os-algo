import { ProcessInput, AlgorithmResult, ExecutionSegment, SimulationEvent, DartConfig, DartMathDetails } from '../engine/types';
import { computeMetrics, InternalProcessRecord } from '../engine/metrics';

export function calculateUrgency(
  accumulatedWait: number,
  remainingTime: number,
  priority: number,
  processType: 'cpu' | 'interactive',
  agingExponent: number = 1.3
): {
  urgency: number;
  estRem: number;
  prioWeight: number;
  interactBonus: number;
  agingTerm: number;
} {
  const estRem = Math.max(0.5, remainingTime);
  const prioWeight = 1.0 + 0.5 * Math.max(0, 5 - priority);
  const interactBonus = processType === 'interactive' ? 1.5 : 1.0;
  const agingTerm = Math.pow(1.0 + Math.max(0, accumulatedWait), agingExponent);
  const urgency = (agingTerm / estRem) * prioWeight * interactBonus;

  return {
    urgency,
    estRem,
    prioWeight,
    interactBonus,
    agingTerm,
  };
}

export function calculateBarrier(
  csOverhead: number,
  remainingTime: number,
  sliceExecuted: number,
  config: DartConfig,
  isV2: boolean = false
): {
  barrier: number;
  rawBarrier: number;
  baseFriction: number;
  finishBonus: number;
  hogPenalty: number;
  floorApplied: boolean;
} {
  const baseFriction = config.thetaBase * Math.max(csOverhead, 0.5);
  let finishBonus = 0;
  if (remainingTime <= config.finishThresh) {
    finishBonus = config.kFinish * (1.0 - remainingTime / config.finishThresh);
  }
  const hogPenalty = config.kHog * Math.pow(sliceExecuted / config.baseQuantum, 2);

  const rawBarrier = baseFriction + finishBonus - hogPenalty;
  let finalBarrier = rawBarrier;
  let floorApplied = false;

  if (isV2) {
    const floor = config.barrierFloor !== undefined ? config.barrierFloor : 0.1;
    if (rawBarrier < floor) {
      finalBarrier = floor;
      floorApplied = true;
    }
  }

  return {
    barrier: finalBarrier,
    rawBarrier,
    baseFriction,
    finishBonus,
    hogPenalty,
    floorApplied,
  };
}

export function runDartEngine(
  inputs: ProcessInput[],
  config: DartConfig,
  csOverhead: number = 0.5,
  includeInitialDispatchInCount: boolean = true,
  isV2: boolean = false
): AlgorithmResult {
  const processes = inputs.map((p) => ({
    ...p,
    remainingTime: p.burstTime,
    accumulatedReadyWaitTime: 0,
    firstStartTime: null as number | null,
    completionTime: 0,
    contextSwitches: 0,
    color: p.color || (isV2 ? '#ec4899' : '#06b6d4'),
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

  let runningProc: (typeof processes)[0] | null = null;
  let executedInSlice = 0.0;
  let nextProcIdx = 0;
  let stepIndex = 0;
  const n = processes.length;

  function advanceReadyWait(duration: number) {
    if (duration <= 0) return;
    for (const p of readyQueue) {
      p.accumulatedReadyWaitTime += duration;
    }
  }

  function getUrgencyForProc(p: (typeof processes)[0]) {
    return calculateUrgency(
      p.accumulatedReadyWaitTime,
      p.remainingTime,
      p.priority,
      p.processType,
      config.agingExponent
    ).urgency;
  }

  function pickBestReady(): (typeof processes)[0] | null {
    if (readyQueue.length === 0) return null;
    let best = readyQueue[0];
    let bestU = getUrgencyForProc(best);

    for (let i = 1; i < readyQueue.length; i++) {
      const cand = readyQueue[i];
      const candU = getUrgencyForProc(cand);
      if (candU > bestU + 1e-9) {
        best = cand;
        bestU = candU;
      } else if (Math.abs(candU - bestU) <= 1e-9) {
        if (cand.arrivalTime < best.arrivalTime - 1e-9) {
          best = cand;
          bestU = candU;
        } else if (Math.abs(cand.arrivalTime - best.arrivalTime) <= 1e-9) {
          if (cand.pid.localeCompare(best.pid) < 0) {
            best = cand;
            bestU = candU;
          }
        }
      }
    }
    return best;
  }

  function captureEvent(
    eventType: SimulationEvent['eventType'],
    details: {
      reason: string;
      action: string;
      candidatePid?: string | null;
      candidateUrgency?: number | null;
      runningUrgency?: number | null;
      urgencyDiff?: number | null;
      barrier?: number | null;
      nearFinishShieldApplied?: boolean;
      hardCeilingApplied?: boolean;
      preemptDecision?: boolean;
      formulaBreakdown?: string[];
      comparison?: string;
      dartMath?: DartMathDetails;
      adaptCsMath?: DartMathDetails;
    }
  ) {
    const queueSnapshot = readyQueue.map((p) => ({
      pid: p.pid,
      remainingTime: Number(p.remainingTime.toFixed(4)),
      accumulatedWait: Number(p.accumulatedReadyWaitTime.toFixed(4)),
      priority: p.priority,
      processType: p.processType,
      urgency: Number(getUrgencyForProc(p).toFixed(4)),
    }));

    const mathObj = details.dartMath || details.adaptCsMath;

    events.push({
      stepIndex: stepIndex++,
      time: Number(currentTime.toFixed(4)),
      eventType,
      runningPid: runningProc ? runningProc.pid : null,
      runningRemaining: runningProc ? Number(runningProc.remainingTime.toFixed(4)) : null,
      runningSliceTime: runningProc ? Number(executedInSlice.toFixed(4)) : null,
      readyQueue: queueSnapshot,
      candidatePid: details.candidatePid,
      candidateUrgency: details.candidateUrgency !== undefined ? Number(details.candidateUrgency?.toFixed(4)) : null,
      runningUrgency: details.runningUrgency !== undefined ? Number(details.runningUrgency?.toFixed(4)) : null,
      urgencyDiff: details.urgencyDiff !== undefined ? Number(details.urgencyDiff?.toFixed(4)) : null,
      barrier: details.barrier !== undefined ? Number(details.barrier?.toFixed(4)) : null,
      nearFinishShieldApplied: details.nearFinishShieldApplied,
      hardCeilingApplied: details.hardCeilingApplied,
      preemptDecision: details.preemptDecision,
      reason: details.reason,
      stepDetails: {
        headline: `[t = ${currentTime.toFixed(2)} ms] ${eventType}: ${details.action}`,
        action: details.action,
        formulaBreakdown: details.formulaBreakdown,
        comparison: details.comparison,
      },
      dartMath: mathObj,
      adaptCsMath: mathObj,
    });
  }

  while (completed.length < n) {
    // 1. Enqueue new arrivals
    while (nextProcIdx < n && processes[nextProcIdx].arrivalTime <= currentTime + 1e-9) {
      const arrived = processes[nextProcIdx++];
      readyQueue.push(arrived);
      captureEvent('ARRIVAL', {
        reason: `Process ${arrived.pid} arrived at t = ${arrived.arrivalTime.toFixed(2)} ms (burst: ${arrived.burstTime} ms, prio: ${arrived.priority}, type: ${arrived.processType})`,
        action: `Enqueue ${arrived.pid} into ready queue`,
      });
    }

    // 2. If CPU is idle, schedule highest urgency ready process
    if (!runningProc) {
      if (readyQueue.length === 0) {
        if (nextProcIdx < n) {
          const nextArr = processes[nextProcIdx].arrivalTime;
          const idleDur = nextArr - currentTime;
          if (idleDur > 1e-9) {
            timeline.push({
              startTime: currentTime,
              endTime: nextArr,
              type: 'IDLE',
              description: 'CPU idle waiting for arrival',
            });
            totalIdleTime += idleDur;
            advanceReadyWait(idleDur);
            currentTime = nextArr;
            captureEvent('IDLE', {
              reason: `CPU idle until next arrival at t = ${nextArr.toFixed(2)} ms`,
              action: `Advance simulation time to ${nextArr.toFixed(2)} ms`,
            });
          }
          continue;
        } else {
          break; // All processes completed
        }
      }

      // Pick best ready process
      const best = pickBestReady()!;
      const idx = readyQueue.indexOf(best);
      readyQueue.splice(idx, 1);
      runningProc = best;
      executedInSlice = 0.0;

      // Handle context switch overhead
      if (csOverhead > 0) {
        const isInitialFromIdle = timeline.length === 0 || timeline[timeline.length - 1].type === 'IDLE';
        if (includeInitialDispatchInCount || !isInitialFromIdle) {
          totalContextSwitches++;
        }
        const csStart = currentTime;
        const csEnd = currentTime + csOverhead;
        timeline.push({
          startTime: csStart,
          endTime: csEnd,
          type: 'CS',
          description: `Context switch dispatching ${runningProc.pid}`,
        });
        advanceReadyWait(csOverhead);
        runningProc.accumulatedReadyWaitTime += csOverhead;
        totalCsOverhead += csOverhead;
        currentTime = csEnd;

        // Catch arrivals during CS
        while (nextProcIdx < n && processes[nextProcIdx].arrivalTime <= currentTime + 1e-9) {
          const arrived = processes[nextProcIdx++];
          readyQueue.push(arrived);
          captureEvent('ARRIVAL', {
            reason: `Process ${arrived.pid} arrived during context switch`,
            action: `Enqueue ${arrived.pid}`,
          });
        }
      }

      if (runningProc.firstStartTime === null) {
        runningProc.firstStartTime = currentTime;
      }

      captureEvent('DISPATCH', {
        reason: `Dispatched ${runningProc.pid} with urgency ${getUrgencyForProc(runningProc).toFixed(3)}`,
        action: `Execute ${runningProc.pid}`,
      });
    }

    // 3. Compute time delta to next discrete evaluation boundary
    const tNextArrival = nextProcIdx < n ? processes[nextProcIdx].arrivalTime : Infinity;
    const dtToArrival = tNextArrival > currentTime ? tNextArrival - currentTime : Infinity;
    const dtToCompletion = runningProc.remainingTime;

    const timeSinceLastTick = currentTime % 1.0;
    let dtToNextTick = 1.0 - timeSinceLastTick;
    if (dtToNextTick < 1e-9) dtToNextTick = 1.0;

    let dt = Math.min(dtToCompletion, dtToNextTick);
    let triggerEvent = '1.0ms Periodic Tick Boundary';

    if (dtToArrival < dt - 1e-9) {
      dt = dtToArrival;
      triggerEvent = `Process Arrival Boundary (${processes[nextProcIdx].pid})`;
    } else if (Math.abs(dt - dtToCompletion) < 1e-9) {
      triggerEvent = `Process Completion Boundary (${runningProc.pid})`;
    }

    // Execute running process for dt
    timeline.push({
      startTime: currentTime,
      endTime: currentTime + dt,
      type: 'PROCESS',
      pid: runningProc.pid,
      color: runningProc.color,
      remainingAfter: Number((runningProc.remainingTime - dt).toFixed(4)),
      description: `Run ${runningProc.pid} (rem: ${(runningProc.remainingTime - dt).toFixed(2)} ms)`,
    });

    currentTime += dt;
    runningProc.remainingTime -= dt;
    executedInSlice += dt;
    busyTime += dt;
    advanceReadyWait(dt);

    // Enqueue arrivals that landed at exactly currentTime
    while (nextProcIdx < n && processes[nextProcIdx].arrivalTime <= currentTime + 1e-9) {
      const arrived = processes[nextProcIdx++];
      readyQueue.push(arrived);
      captureEvent('ARRIVAL', {
        reason: `Process ${arrived.pid} arrived at t = ${currentTime.toFixed(2)} ms`,
        action: `Enqueue ${arrived.pid}`,
      });
    }

    // Check completion
    if (runningProc.remainingTime <= 1e-9) {
      runningProc.completionTime = currentTime;
      runningProc.contextSwitches += 1;
      completed.push({
        pid: runningProc.pid,
        arrivalTime: runningProc.arrivalTime,
        burstTime: runningProc.burstTime,
        priority: runningProc.priority,
        processType: runningProc.processType,
        color: runningProc.color,
        completionTime: runningProc.completionTime,
        firstStartTime: runningProc.firstStartTime!,
        contextSwitches: runningProc.contextSwitches,
        accumulatedReadyWaitTime: runningProc.accumulatedReadyWaitTime,
      });

      captureEvent('COMPLETION', {
        reason: `Process ${runningProc.pid} finished burst at t = ${currentTime.toFixed(2)} ms`,
        action: `Retire ${runningProc.pid}`,
      });

      runningProc = null;
      executedInSlice = 0.0;
      continue;
    }

    // 4. Evaluation at this boundary
    if (readyQueue.length > 0) {
      const candidate = pickBestReady()!;
      const uCandObj = calculateUrgency(
        candidate.accumulatedReadyWaitTime,
        candidate.remainingTime,
        candidate.priority,
        candidate.processType,
        config.agingExponent
      );

      const uCurrObj = calculateUrgency(
        runningProc.accumulatedReadyWaitTime,
        runningProc.remainingTime,
        runningProc.priority,
        runningProc.processType,
        config.agingExponent
      );

      const urgencyDiff = uCandObj.urgency - uCurrObj.urgency;
      const barrierObj = calculateBarrier(
        csOverhead,
        runningProc.remainingTime,
        executedInSlice,
        config,
        isV2
      );

      // Rule A: Near-Finish Shield
      let nearFinishShieldApplied = false;
      let shieldExplanation = 'Shield does not apply';
      if (
        runningProc.remainingTime <= config.nearFinishShieldLimit &&
        executedInSlice < config.qMax
      ) {
        nearFinishShieldApplied = true;
        shieldExplanation = `Rule A Applied: Remaining burst (${runningProc.remainingTime.toFixed(2)} ms) ≤ limit (${config.nearFinishShieldLimit.toFixed(2)} ms) and slice (${executedInSlice.toFixed(2)} ms) < Q_max (${config.qMax} ms).`;
      }

      // Rule B: Hard Ceiling Q_max
      let hardCeilingApplied = false;
      let ceilingExplanation = 'Hard ceiling not exceeded';
      if (executedInSlice >= config.qMax - 1e-9) {
        hardCeilingApplied = true;
        ceilingExplanation = `Rule B Applied: Executed slice (${executedInSlice.toFixed(2)} ms) reached hard ceiling Q_max (${config.qMax} ms).`;
      }

      // Determine decision
      let shouldPreempt = false;
      let ruleApplied: 'RULE_A' | 'RULE_B' | 'RULE_C' = 'RULE_C';
      let decisionReason = '';

      if (hardCeilingApplied) {
        shouldPreempt = true;
        ruleApplied = 'RULE_B';
        decisionReason = `Rule B (Hard Ceiling): Executed continuous slice ${executedInSlice.toFixed(2)} ms ≥ Q_max (${config.qMax} ms) with ready candidate ${candidate.pid}. Mandatory preemption.`;
      } else if (nearFinishShieldApplied) {
        shouldPreempt = false;
        ruleApplied = 'RULE_A';
        decisionReason = `Rule A (Near-Finish Shield): Process ${runningProc.pid} remaining ${runningProc.remainingTime.toFixed(2)} ms ≤ ${config.nearFinishShieldLimit} ms. Preemption blocked to complete task.`;
      } else {
        ruleApplied = 'RULE_C';
        if (urgencyDiff > barrierObj.barrier + 1e-9) {
          shouldPreempt = true;
          decisionReason = `Rule C (Dynamic Barrier): Urgency difference ΔU (${urgencyDiff.toFixed(3)}) > preemption barrier Θ (${barrierObj.barrier.toFixed(3)}). Preempting ${runningProc.pid} for ${candidate.pid}.`;
        } else {
          shouldPreempt = false;
          decisionReason = `Rule C (Dynamic Barrier): Urgency difference ΔU (${urgencyDiff.toFixed(3)}) ≤ preemption barrier Θ (${barrierObj.barrier.toFixed(3)}). Context switch friction protects ${runningProc.pid}.`;
        }
      }

      const formulaBreakdown: string[] = [
        `Candidate ${candidate.pid}: U = ((1 + ${candidate.accumulatedReadyWaitTime.toFixed(2)})^${config.agingExponent} / max(0.5, ${candidate.remainingTime.toFixed(2)})) × ${uCandObj.prioWeight.toFixed(2)} × ${uCandObj.interactBonus.toFixed(1)} = ${uCandObj.urgency.toFixed(3)}`,
        `Running ${runningProc.pid}: U = ((1 + ${runningProc.accumulatedReadyWaitTime.toFixed(2)})^${config.agingExponent} / max(0.5, ${runningProc.remainingTime.toFixed(2)})) × ${uCurrObj.prioWeight.toFixed(2)} × ${uCurrObj.interactBonus.toFixed(1)} = ${uCurrObj.urgency.toFixed(3)}`,
        `Urgency Difference: ΔU = ${uCandObj.urgency.toFixed(3)} − ${uCurrObj.urgency.toFixed(3)} = ${urgencyDiff.toFixed(3)}`,
        `Dynamic Barrier: Θ = ${config.thetaBase} × max(${csOverhead}, 0.5) + ${barrierObj.finishBonus.toFixed(3)} − ${barrierObj.hogPenalty.toFixed(3)} = ${barrierObj.rawBarrier.toFixed(3)}${barrierObj.floorApplied ? ` -> Clamped to Floor ${barrierObj.barrier.toFixed(3)}` : ''}`,
      ];

      const resultingReadyQueue = shouldPreempt
        ? [runningProc, ...readyQueue.filter((p) => p.pid !== candidate.pid)].map((p) => ({
            pid: p.pid,
            remainingTime: Number(p.remainingTime.toFixed(4)),
            accumulatedWait: Number(p.accumulatedReadyWaitTime.toFixed(4)),
          }))
        : readyQueue.map((p) => ({
            pid: p.pid,
            remainingTime: Number(p.remainingTime.toFixed(4)),
            accumulatedWait: Number(p.accumulatedReadyWaitTime.toFixed(4)),
          }));

      const dartMath: DartMathDetails = {
        triggerEvent,
        candidate: {
          pid: candidate.pid,
          remainingTime: Number(candidate.remainingTime.toFixed(4)),
          accumulatedWait: Number(candidate.accumulatedReadyWaitTime.toFixed(4)),
          priority: candidate.priority,
          processType: candidate.processType,
          prioWeight: uCandObj.prioWeight,
          interactBonus: uCandObj.interactBonus,
          estRem: uCandObj.estRem,
          agingTerm: uCandObj.agingTerm,
          urgency: Number(uCandObj.urgency.toFixed(4)),
          substitutionString: `((1 + ${candidate.accumulatedReadyWaitTime.toFixed(2)})^1.3 / max(0.5, ${candidate.remainingTime.toFixed(2)})) × ${uCandObj.prioWeight.toFixed(2)} × ${uCandObj.interactBonus.toFixed(2)} = (${uCandObj.agingTerm.toFixed(3)} / ${uCandObj.estRem.toFixed(2)}) × ${(uCandObj.prioWeight * uCandObj.interactBonus).toFixed(2)} = ${uCandObj.urgency.toFixed(4)}`,
        },
        current: {
          pid: runningProc.pid,
          remainingTime: Number(runningProc.remainingTime.toFixed(4)),
          accumulatedWait: Number(runningProc.accumulatedReadyWaitTime.toFixed(4)),
          priority: runningProc.priority,
          processType: runningProc.processType,
          prioWeight: uCurrObj.prioWeight,
          interactBonus: uCurrObj.interactBonus,
          estRem: uCurrObj.estRem,
          agingTerm: uCurrObj.agingTerm,
          urgency: Number(uCurrObj.urgency.toFixed(4)),
          substitutionString: `((1 + ${runningProc.accumulatedReadyWaitTime.toFixed(2)})^1.3 / max(0.5, ${runningProc.remainingTime.toFixed(2)})) × ${uCurrObj.prioWeight.toFixed(2)} × ${uCurrObj.interactBonus.toFixed(2)} = (${uCurrObj.agingTerm.toFixed(3)} / ${uCurrObj.estRem.toFixed(2)}) × ${(uCurrObj.prioWeight * uCurrObj.interactBonus).toFixed(2)} = ${uCurrObj.urgency.toFixed(4)}`,
        },
        threshold: {
          csOverhead,
          baseFriction: Number(barrierObj.baseFriction.toFixed(4)),
          sliceExecuted: Number(executedInSlice.toFixed(4)),
          baseQuantum: config.baseQuantum,
          finishThresh: config.finishThresh,
          kFinish: config.kFinish,
          kHog: config.kHog,
          finishBonus: Number(barrierObj.finishBonus.toFixed(4)),
          hogPenalty: Number(barrierObj.hogPenalty.toFixed(4)),
          rawBarrier: Number(barrierObj.rawBarrier.toFixed(4)),
          barrier: Number(barrierObj.barrier.toFixed(4)),
          isV2,
          floorApplied: barrierObj.floorApplied,
          barrierFloor: config.barrierFloor,
          finishBonusSubstitution:
            runningProc.remainingTime <= config.finishThresh
              ? `${config.kFinish} × (1 − ${runningProc.remainingTime.toFixed(2)} / ${config.finishThresh}) = ${barrierObj.finishBonus.toFixed(4)}`
              : `0 (remaining ${runningProc.remainingTime.toFixed(2)} > ${config.finishThresh})`,
          hogPenaltySubstitution: `${config.kHog} × (${executedInSlice.toFixed(2)} / ${config.baseQuantum})² = ${barrierObj.hogPenalty.toFixed(4)}`,
          barrierSubstitution: `${barrierObj.baseFriction.toFixed(2)} + ${barrierObj.finishBonus.toFixed(3)} − ${barrierObj.hogPenalty.toFixed(3)} = ${barrierObj.rawBarrier.toFixed(4)}${
            barrierObj.floorApplied ? ` (Floor clamped to ${barrierObj.barrier.toFixed(4)})` : ''
          }`,
        },
        nearFinishShield: {
          applies: nearFinishShieldApplied,
          remainingTime: Number(runningProc.remainingTime.toFixed(4)),
          shieldLimit: config.nearFinishShieldLimit,
          sliceTime: Number(executedInSlice.toFixed(4)),
          qMax: config.qMax,
          explanation: shieldExplanation,
        },
        hardCeiling: {
          applies: hardCeilingApplied,
          sliceTime: Number(executedInSlice.toFixed(4)),
          qMax: config.qMax,
          hasReadyCandidate: readyQueue.length > 0,
          explanation: ceilingExplanation,
        },
        urgencyDiff: Number(urgencyDiff.toFixed(4)),
        decision: shouldPreempt ? 'PREEMPT' : 'CONTINUE',
        ruleApplied,
        decisionJustification: decisionReason,
        resultingReadyQueue,
      };

      captureEvent('EVAL_TICK', {
        reason: decisionReason,
        action: shouldPreempt ? `Preempt ${runningProc.pid} for ${candidate.pid}` : `Keep ${runningProc.pid} running`,
        candidatePid: candidate.pid,
        candidateUrgency: uCandObj.urgency,
        runningUrgency: uCurrObj.urgency,
        urgencyDiff,
        barrier: barrierObj.barrier,
        nearFinishShieldApplied,
        hardCeilingApplied,
        preemptDecision: shouldPreempt,
        formulaBreakdown,
        comparison: `ΔU (${urgencyDiff.toFixed(3)}) vs Θ (${barrierObj.barrier.toFixed(3)})`,
        dartMath,
        adaptCsMath: dartMath,
      });

      if (shouldPreempt) {
        // Preempt running process
        const preempted = runningProc;
        const candIdx = readyQueue.indexOf(candidate);
        if (candIdx >= 0) {
          readyQueue.splice(candIdx, 1);
        }
        readyQueue.push(preempted);
        runningProc = candidate;
        executedInSlice = 0.0;

        captureEvent('PREEMPTION', {
          reason: `Process ${preempted.pid} preempted by candidate ${runningProc.pid}`,
          action: `Context switch: ${preempted.pid} -> ${runningProc.pid}`,
        });

        if (csOverhead > 0) {
          totalContextSwitches++;
          const csStart = currentTime;
          const csEnd = currentTime + csOverhead;
          timeline.push({
            startTime: csStart,
            endTime: csEnd,
            type: 'CS',
            description: `Context switch from ${preempted.pid} to ${runningProc.pid}`,
          });
          advanceReadyWait(csOverhead);
          runningProc.accumulatedReadyWaitTime += csOverhead;
          totalCsOverhead += csOverhead;
          currentTime = csEnd;

          // Catch arrivals during CS
          while (nextProcIdx < n && processes[nextProcIdx].arrivalTime <= currentTime + 1e-9) {
            const arrived = processes[nextProcIdx++];
            readyQueue.push(arrived);
            captureEvent('ARRIVAL', {
              reason: `Process ${arrived.pid} arrived during context switch`,
              action: `Enqueue ${arrived.pid}`,
            });
          }
        }

        if (runningProc.firstStartTime === null) {
          runningProc.firstStartTime = currentTime;
        }
      }
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
    algorithmId: isV2 ? 'ADAPT_CS_V2' : 'DART',
    name: isV2
      ? 'DART v2 (With Configurable Barrier Floor)'
      : 'DART (Dynamic Adaptive Runtime Triage)',
    description: isV2
      ? 'DART v2 enforces a configurable positive barrier floor (default 0.1) on the preemption threshold to prevent thrashing when anti-hog decay is strong.'
      : 'Dynamic Adaptive Runtime Triage (DART) dynamically evaluates hardware context-switch friction, superlinear aging, and a near-finish shield to minimize cache flushes.',
    timeline,
    events,
    processMetrics,
    metrics,
  };
}

export const runAdaptCsEngine = runDartEngine;

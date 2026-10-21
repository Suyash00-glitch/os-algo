import { describe, it, expect } from 'vitest';
import { runDart } from '../algorithms/dart';
import { runDartV2 } from '../algorithms/adaptCsV2';
import { ProcessInput } from '../engine/types';

describe('DART Execution Trace 13-Point Math Engine', () => {
  const benchmarkProcesses: ProcessInput[] = [
    { pid: 'P1', arrivalTime: 0.0, burstTime: 8.0, priority: 3, processType: 'cpu' },
    { pid: 'P2', arrivalTime: 1.0, burstTime: 4.0, priority: 1, processType: 'interactive' },
    { pid: 'P3', arrivalTime: 2.0, burstTime: 2.0, priority: 2, processType: 'interactive' },
    { pid: 'P4', arrivalTime: 3.0, burstTime: 1.0, priority: 3, processType: 'interactive' },
    { pid: 'P5', arrivalTime: 4.0, burstTime: 6.0, priority: 2, processType: 'cpu' },
  ];

  it('populates full 13-point mathematical breakdown on every EVAL_TICK event under DART', () => {
    const result = runDart(benchmarkProcesses, {}, 0.5, true);

    const evalEvents = result.events.filter((e) => e.eventType === 'EVAL_TICK');
    expect(evalEvents.length).toBeGreaterThan(0);

    for (const event of evalEvents) {
      // 1. Current simulation time
      expect(typeof event.time).toBe('number');

      const math = event.dartMath || event.adaptCsMath;
      expect(math).toBeDefined();
      if (!math) continue;

      // 1. Event trigger
      expect(typeof math.triggerEvent).toBe('string');

      // 2. Ready queue
      expect(Array.isArray(event.readyQueue)).toBe(true);

      // 3. Currently running process and candidate process
      expect(typeof math.current.pid).toBe('string');
      expect(typeof math.candidate.pid).toBe('string');

      // 4. Remaining burst time and ready-queue waiting time
      expect(typeof math.current.remainingTime).toBe('number');
      expect(typeof math.current.accumulatedWait).toBe('number');
      expect(typeof math.candidate.remainingTime).toBe('number');
      expect(typeof math.candidate.accumulatedWait).toBe('number');

      // 5. Priority weight and process-type bonus
      expect(typeof math.current.prioWeight).toBe('number');
      expect(typeof math.current.interactBonus).toBe('number');
      expect(typeof math.candidate.prioWeight).toBe('number');
      expect(typeof math.candidate.interactBonus).toBe('number');

      // 6. Urgency calculation and substitution
      expect(typeof math.current.urgency).toBe('number');
      expect(typeof math.candidate.urgency).toBe('number');
      expect(math.current.substitutionString).toContain('max(0.5,');
      expect(math.candidate.substitutionString).toContain('max(0.5,');

      // 7 & 8. Threshold calculation, finish bonus, hog penalty with substitutions
      expect(typeof math.threshold.barrier).toBe('number');
      expect(typeof math.threshold.finishBonus).toBe('number');
      expect(typeof math.threshold.hogPenalty).toBe('number');
      expect(math.threshold.finishBonusSubstitution.length).toBeGreaterThan(0);
      expect(math.threshold.hogPenaltySubstitution.length).toBeGreaterThan(0);
      expect(math.threshold.barrierSubstitution.length).toBeGreaterThan(0);

      // 9. Near-finish shield
      expect(typeof math.nearFinishShield.applies).toBe('boolean');
      expect(math.nearFinishShield.explanation.length).toBeGreaterThan(0);

      // 10. Max CPU slice / hard ceiling
      expect(typeof math.hardCeiling.applies).toBe('boolean');
      expect(math.hardCeiling.explanation.length).toBeGreaterThan(0);

      // 11. Urgency difference
      expect(typeof math.urgencyDiff).toBe('number');

      // 12. Final decision and rule comparison
      expect(['PREEMPT', 'CONTINUE']).toContain(math.decision);
      expect(['RULE_A', 'RULE_B', 'RULE_C']).toContain(math.ruleApplied);
      expect(math.decisionJustification.length).toBeGreaterThan(0);

      // 13. Resulting ready queue
      expect(Array.isArray(math.resultingReadyQueue)).toBe(true);
    }
  });

  it('correctly records v2 enhancements in DART v2 trace events', () => {
    const resultV2 = runDartV2(benchmarkProcesses, {}, 0.5, true);

    const evalEvents = resultV2.events.filter((e) => e.eventType === 'EVAL_TICK');
    expect(evalEvents.length).toBeGreaterThan(0);

    for (const event of evalEvents) {
      const math = event.dartMath || event.adaptCsMath;
      expect(math).toBeDefined();
      if (!math) continue;

      expect(math.threshold.isV2).toBe(true);
      expect(math.threshold.barrier).toBeGreaterThanOrEqual((math.threshold.barrierFloor ?? 0.1) - 1e-9);
    }
  });

  it('generates exact numerical preemption at t = 1.0 in standard benchmark', () => {
    const result = runDart(benchmarkProcesses, {}, 0.5, true);

    const evalAt1 = result.events.find(
      (e) => e.eventType === 'EVAL_TICK' && Math.abs(e.time - 1.0) < 1e-6
    );
    expect(evalAt1).toBeDefined();
    const math = evalAt1?.dartMath || evalAt1?.adaptCsMath;
    expect(math).toBeDefined();
    expect(math?.candidate.pid).toBe('P2');
    expect(math?.current.pid).toBe('P1');
    expect(math?.decision).toBe('PREEMPT');
    expect(math?.ruleApplied).toBe('RULE_C');
    expect(math?.urgencyDiff).toBeGreaterThan(math?.threshold.barrier ?? 0);
  });
});

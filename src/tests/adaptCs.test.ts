import { describe, it, expect } from 'vitest';
import { runDart, runAdaptCs } from '../algorithms/dart';
import { runDartV2 } from '../algorithms/adaptCsV2';
import { ProcessInput } from '../engine/types';

describe('DART & DART v2 Algorithms', () => {
  const concreteProcesses: ProcessInput[] = [
    { pid: 'P1', arrivalTime: 0.0, burstTime: 8.0, priority: 3, processType: 'cpu' },
    { pid: 'P2', arrivalTime: 1.0, burstTime: 4.0, priority: 1, processType: 'interactive' },
    { pid: 'P3', arrivalTime: 2.0, burstTime: 2.0, priority: 2, processType: 'interactive' },
    { pid: 'P4', arrivalTime: 3.0, burstTime: 1.0, priority: 3, processType: 'interactive' },
    { pid: 'P5', arrivalTime: 4.0, burstTime: 6.0, priority: 2, processType: 'cpu' },
  ];

  it('accurately reproduces the concrete 5-process benchmark under DART', () => {
    const result = runDart(concreteProcesses, {}, 0.5, true);

    expect(result.algorithmId).toBe('DART');
    expect(result.metrics.totalContextSwitches).toBe(7);
    expect(result.metrics.totalElapsedTime).toBe(24.5);
    expect(result.metrics.avgWaitingTime).toBeCloseTo(6.8, 1);
    expect(result.metrics.avgTurnaroundTime).toBeCloseTo(11.0, 1);
    expect(result.metrics.avgResponseTime).toBeCloseTo(4.0, 1);
    expect(result.metrics.cpuUtilization).toBeCloseTo(85.71, 1);

    const p1 = result.processMetrics.find((p) => p.pid === 'P1')!;
    const p2 = result.processMetrics.find((p) => p.pid === 'P2')!;
    const p3 = result.processMetrics.find((p) => p.pid === 'P3')!;
    const p4 = result.processMetrics.find((p) => p.pid === 'P4')!;
    const p5 = result.processMetrics.find((p) => p.pid === 'P5')!;

    expect(p1.completionTime).toBe(18.0);
    expect(p2.completionTime).toBe(10.0);
    expect(p3.completionTime).toBe(5.5);
    expect(p4.completionTime).toBe(7.0);
    expect(p5.completionTime).toBe(24.5);
  });

  it('demonstrates Rule A (Near-finish shield) protecting almost-done processes', () => {
    // P1 runs and reaches remainingTime <= 1.5. A high-priority interactive P2 arrives.
    // Near-finish shield should prevent P1 from being preempted.
    const inputs: ProcessInput[] = [
      { pid: 'P1', arrivalTime: 0.0, burstTime: 2.0, priority: 3, processType: 'cpu' },
      { pid: 'P2', arrivalTime: 1.0, burstTime: 1.0, priority: 1, processType: 'interactive' },
    ];

    const result = runDart(inputs, {}, 0.5, true);
    const p1 = result.processMetrics.find((p) => p.pid === 'P1')!;

    // P1 CS [0 - 0.5], runs [0.5 - 1.0] (rem = 1.5).
    // At t = 1.0, P2 arrives. Because P1's remaining time is 1.5 <= 1.5,
    // the near-finish shield keeps P1 running to completion at t = 2.5!
    expect(p1.completionTime).toBe(2.5);
  });

  it('demonstrates Rule B (Hard ceiling) forcing preemption at Q_max = 8 ms', () => {
    // Process P1 arrives at 0.0 with long burst.
    // P2 arrives at 7.5 ms. P1 reaches 8.0 ms of continuous slice at t = 8.5 ms.
    const inputs: ProcessInput[] = [
      { pid: 'P1', arrivalTime: 0.0, burstTime: 20.0, priority: 1, processType: 'cpu' },
      { pid: 'P2', arrivalTime: 7.5, burstTime: 4.0, priority: 3, processType: 'cpu' },
    ];

    const result = runDart(inputs, { qMax: 8.0, baseQuantum: 10.0, kHog: 0.0 }, 0.5, true);

    const hardCeilingEvent = result.events.find(
      (e) => e.eventType === 'EVAL_TICK' && e.hardCeilingApplied === true
    );
    expect(hardCeilingEvent).toBeDefined();
    expect(hardCeilingEvent?.preemptDecision).toBe(true);
    expect(hardCeilingEvent?.reason).toContain('Rule B (Hard Ceiling)');
  });

  it('handles negative barrier in baseline DART', () => {
    // When a process executes uninterrupted, hog penalty = 1.2 * (slice / 3)^2
    // If slice = 6 ms, hog penalty = 1.2 * 4 = 4.8.
    // Base friction = 1.2 * 0.5 = 0.6. Raw barrier = 0.6 - 4.8 = -4.2.
    const inputs: ProcessInput[] = [
      { pid: 'P1', arrivalTime: 0.0, burstTime: 7.0, priority: 1, processType: 'cpu' },
      { pid: 'P2', arrivalTime: 5.0, burstTime: 3.0, priority: 3, processType: 'cpu' },
    ];

    const baselineResult = runDart(inputs, { qMax: 8.0 }, 0.5, true);
    const negativeBarrierEvent = baselineResult.events.find(
      (e) => e.eventType === 'EVAL_TICK' && (e.barrier ?? 0) < 0
    );
    expect(negativeBarrierEvent).toBeDefined();
  });

  it('enforces positive barrier floor in DART v2', () => {
    const inputs: ProcessInput[] = [
      { pid: 'P1', arrivalTime: 0.0, burstTime: 7.0, priority: 1, processType: 'cpu' },
      { pid: 'P2', arrivalTime: 5.0, burstTime: 3.0, priority: 3, processType: 'cpu' },
    ];

    const v2Result = runDartV2(inputs, { qMax: 8.0, barrierFloor: 0.1 }, 0.5, true);
    // In v2, barrier should never drop below floor (0.1)
    const evalEvents = v2Result.events.filter((e) => e.eventType === 'EVAL_TICK' && e.barrier !== null);
    for (const e of evalEvents) {
      expect(e.barrier!).toBeGreaterThanOrEqual(0.1 - 1e-9);
    }
  });

  it('tracks ready-queue waiting time distinctly from standard waiting time', () => {
    const inputs: ProcessInput[] = [
      { pid: 'P1', arrivalTime: 0.0, burstTime: 4.0, priority: 2, processType: 'cpu' },
      { pid: 'P2', arrivalTime: 1.0, burstTime: 2.0, priority: 1, processType: 'cpu' },
    ];

    const result = runAdaptCs(inputs, {}, 1.0, true);
    const p1 = result.processMetrics.find((p) => p.pid === 'P1')!;

    // Standard waiting time includes time spent delayed during context switches
    // Ready queue waiting time is accumulated strictly while in READY state
    expect(p1.standardWaitingTime).toBeGreaterThanOrEqual(p1.readyQueueWaitingTime);
  });
});

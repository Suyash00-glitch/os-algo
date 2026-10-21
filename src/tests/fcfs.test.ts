import { describe, it, expect } from 'vitest';
import { runFCFS } from '../algorithms/fcfs';
import { ProcessInput } from '../engine/types';

describe('FCFS Algorithm', () => {
  it('correctly executes 3 processes with different arrival times', () => {
    const inputs: ProcessInput[] = [
      { pid: 'P1', arrivalTime: 0, burstTime: 4, priority: 1, processType: 'cpu' },
      { pid: 'P2', arrivalTime: 2, burstTime: 3, priority: 2, processType: 'cpu' },
      { pid: 'P3', arrivalTime: 4, burstTime: 1, priority: 3, processType: 'interactive' },
    ];

    const result = runFCFS(inputs, 0.5, true);
    expect(result.processMetrics).toHaveLength(3);

    // P1: arrives at 0, CS [0 - 0.5], runs [0.5 - 4.5] -> C = 4.5, TAT = 4.5, WT = 0.5, RT = 0.5
    const p1 = result.processMetrics.find((p) => p.pid === 'P1')!;
    expect(p1.completionTime).toBe(4.5);
    expect(p1.turnaroundTime).toBe(4.5);
    expect(p1.standardWaitingTime).toBe(0.5);
    expect(p1.responseTime).toBe(0.5);

    // P2: arrives at 2, CS [4.5 - 5.0], runs [5.0 - 8.0] -> C = 8.0, TAT = 6.0, WT = 3.0, RT = 3.0
    const p2 = result.processMetrics.find((p) => p.pid === 'P2')!;
    expect(p2.completionTime).toBe(8.0);
    expect(p2.turnaroundTime).toBe(6.0);
    expect(p2.standardWaitingTime).toBe(3.0);
    expect(p2.responseTime).toBe(3.0);

    // P3: arrives at 4, CS [8.0 - 8.5], runs [8.5 - 9.5] -> C = 9.5, TAT = 5.5, WT = 4.5, RT = 4.5
    const p3 = result.processMetrics.find((p) => p.pid === 'P3')!;
    expect(p3.completionTime).toBe(9.5);
    expect(p3.turnaroundTime).toBe(5.5);
    expect(p3.standardWaitingTime).toBe(4.5);
    expect(p3.responseTime).toBe(4.5);

    expect(result.metrics.totalContextSwitches).toBe(3);
    expect(result.metrics.totalContextSwitchOverhead).toBe(1.5);
    expect(result.metrics.busyTime).toBe(8.0);
    expect(result.metrics.totalElapsedTime).toBe(9.5);
  });

  it('handles simultaneous arrivals with deterministic PID tie-breaking', () => {
    const inputs: ProcessInput[] = [
      { pid: 'P2', arrivalTime: 0, burstTime: 2, priority: 2, processType: 'cpu' },
      { pid: 'P1', arrivalTime: 0, burstTime: 2, priority: 1, processType: 'cpu' },
    ];

    const result = runFCFS(inputs, 0.0, true);
    const p1 = result.processMetrics.find((p) => p.pid === 'P1')!;
    const p2 = result.processMetrics.find((p) => p.pid === 'P2')!;

    // P1 runs before P2 due to alphabetical tie-breaking
    expect(p1.completionTime).toBe(2);
    expect(p2.completionTime).toBe(4);
  });

  it('handles empty ready queue and CPU idle intervals', () => {
    const inputs: ProcessInput[] = [
      { pid: 'P1', arrivalTime: 0, burstTime: 2, priority: 1, processType: 'cpu' },
      { pid: 'P2', arrivalTime: 6, burstTime: 2, priority: 1, processType: 'cpu' },
    ];

    const result = runFCFS(inputs, 0.5, true);
    const idleSeg = result.timeline.find((s) => s.type === 'IDLE');
    expect(idleSeg).toBeDefined();
    expect(idleSeg?.startTime).toBe(2.5);
    expect(idleSeg?.endTime).toBe(6.0);
    expect(result.metrics.totalIdleTime).toBe(3.5);
  });
});

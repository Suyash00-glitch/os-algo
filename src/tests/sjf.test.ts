import { describe, it, expect } from 'vitest';
import { runSJF } from '../algorithms/sjf';
import { ProcessInput } from '../engine/types';

describe('SJF Algorithm (Non-preemptive)', () => {
  it('selects the shortest job when CPU becomes available', () => {
    // P1 arrives at 0, long job. P2 and P3 arrive during P1.
    // P3 is shorter than P2, so P3 should run before P2.
    const inputs: ProcessInput[] = [
      { pid: 'P1', arrivalTime: 0, burstTime: 6, priority: 3, processType: 'cpu' },
      { pid: 'P2', arrivalTime: 1, burstTime: 4, priority: 1, processType: 'cpu' },
      { pid: 'P3', arrivalTime: 2, burstTime: 2, priority: 2, processType: 'interactive' },
    ];

    const result = runSJF(inputs, 0.5, true);
    const p1 = result.processMetrics.find((p) => p.pid === 'P1')!;
    const p2 = result.processMetrics.find((p) => p.pid === 'P2')!;
    const p3 = result.processMetrics.find((p) => p.pid === 'P3')!;

    // P1 runs [0.5 - 6.5]
    expect(p1.completionTime).toBe(6.5);
    // At 6.5, ready queue has P2 (burst 4) and P3 (burst 2). P3 runs next!
    // P3 CS [6.5 - 7.0], runs [7.0 - 9.0]
    expect(p3.completionTime).toBe(9.0);
    // P2 CS [9.0 - 9.5], runs [9.5 - 13.5]
    expect(p2.completionTime).toBe(13.5);
  });

  it('uses arrival time and PID as tie-breaker for equal burst times', () => {
    const inputs: ProcessInput[] = [
      { pid: 'P1', arrivalTime: 0, burstTime: 2, priority: 1, processType: 'cpu' },
      { pid: 'P3', arrivalTime: 1, burstTime: 3, priority: 1, processType: 'cpu' },
      { pid: 'P2', arrivalTime: 1, burstTime: 3, priority: 1, processType: 'cpu' },
    ];

    const result = runSJF(inputs, 0.0, true);
    const p2 = result.processMetrics.find((p) => p.pid === 'P2')!;
    const p3 = result.processMetrics.find((p) => p.pid === 'P3')!;

    // Equal burst and arrival -> P2 should execute before P3 alphabetically
    expect(p2.completionTime).toBe(5);
    expect(p3.completionTime).toBe(8);
  });
});

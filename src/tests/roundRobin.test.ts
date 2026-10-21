import { describe, it, expect } from 'vitest';
import { runRoundRobin } from '../algorithms/roundRobin';
import { ProcessInput } from '../engine/types';

describe('Round Robin Algorithm', () => {
  it('correctly time-slices with quantum = 2.0 ms', () => {
    const inputs: ProcessInput[] = [
      { pid: 'P1', arrivalTime: 0, burstTime: 5, priority: 1, processType: 'cpu' },
      { pid: 'P2', arrivalTime: 0, burstTime: 3, priority: 1, processType: 'cpu' },
    ];

    const result = runRoundRobin(inputs, 2.0, 0.0, true);
    // P1 runs [0 - 2], rem 3
    // P2 runs [2 - 4], rem 1
    // P1 runs [4 - 6], rem 1
    // P2 runs [6 - 7], completed at 7
    // P1 runs [7 - 8], completed at 8
    const p1 = result.processMetrics.find((p) => p.pid === 'P1')!;
    const p2 = result.processMetrics.find((p) => p.pid === 'P2')!;

    expect(p2.completionTime).toBe(7);
    expect(p1.completionTime).toBe(8);
  });

  it('avoids charging context switch when process continues running alone', () => {
    const inputs: ProcessInput[] = [
      { pid: 'P1', arrivalTime: 0, burstTime: 6, priority: 1, processType: 'cpu' },
    ];

    // Single process runs for 3 quanta of 2.0 ms each.
    // Initial dispatch incurs 1 switch (0.5 ms), subsequent slices should incur 0 switch overhead.
    const result = runRoundRobin(inputs, 2.0, 0.5, true);
    expect(result.metrics.totalContextSwitches).toBe(1);
    expect(result.metrics.totalContextSwitchOverhead).toBe(0.5);
    expect(result.metrics.totalElapsedTime).toBe(6.5);
  });

  it('enqueues newly arrived processes before requeuing preempted process', () => {
    const inputs: ProcessInput[] = [
      { pid: 'P1', arrivalTime: 0, burstTime: 4, priority: 1, processType: 'cpu' },
      { pid: 'P2', arrivalTime: 2, burstTime: 2, priority: 1, processType: 'cpu' },
    ];

    // P1 runs [0 - 2]. At t = 2, P2 arrives and P1 quantum expires.
    // P2 must be serviced before P1's second slice!
    const result = runRoundRobin(inputs, 2.0, 0.0, true);
    const p1 = result.processMetrics.find((p) => p.pid === 'P1')!;
    const p2 = result.processMetrics.find((p) => p.pid === 'P2')!;

    expect(p2.completionTime).toBe(4);
    expect(p1.completionTime).toBe(6);
  });
});

import { describe, it, expect } from 'vitest';
import { runAllAlgorithms } from '../engine/simulator';
import { runDart } from '../algorithms/dart';
import { ProcessInput } from '../engine/types';

describe('Edge Cases & Advanced Simulation Mechanics', () => {
  it('handles arrival and completion occurring at the exact same timestamp', () => {
    // P1 arrives at 0.0, burst 3.5. With CS = 0.5, P1 finishes exactly at t = 4.0 ms.
    // P2 arrives exactly at t = 4.0 ms.
    const inputs: ProcessInput[] = [
      { pid: 'P1', arrivalTime: 0.0, burstTime: 3.5, priority: 2, processType: 'cpu' },
      { pid: 'P2', arrivalTime: 4.0, burstTime: 2.0, priority: 1, processType: 'interactive' },
    ];

    const results = runAllAlgorithms(inputs);

    for (const [, res] of Object.entries(results)) {
      expect(res.processMetrics).toHaveLength(2);
      const p1 = res.processMetrics.find((p) => p.pid === 'P1')!;
      const p2 = res.processMetrics.find((p) => p.pid === 'P2')!;

      // P1 must complete at 4.0
      expect(p1.completionTime).toBe(4.0);
      // P2 arrives at 4.0 and must be processed without deadlocks
      expect(p2.completionTime).toBeGreaterThan(4.0);
      // No idle time between 4.0 and P2's context switch
      const idleIntervals = res.timeline.filter((s) => s.type === 'IDLE');
      expect(idleIntervals).toHaveLength(0);
    }
  });

  it('handles process finishing exactly at a 1.0 ms evaluation tick', () => {
    // P1 has burst 2.0 ms. Starts at 0.5 after CS, runs until 1.5, then 2.5 (completed).
    // Exactly on a 1.0 ms tick boundary.
    const inputs: ProcessInput[] = [
      { pid: 'P1', arrivalTime: 0.0, burstTime: 2.0, priority: 1, processType: 'cpu' },
      { pid: 'P2', arrivalTime: 1.0, burstTime: 3.0, priority: 2, processType: 'cpu' },
    ];

    const res = runDart(inputs, {}, 0.5, true);
    const p1 = res.processMetrics.find((p) => p.pid === 'P1')!;
    expect(p1.completionTime).toBe(2.5);
    expect(p1.turnaroundTime).toBe(2.5);
    expect(p1.standardWaitingTime).toBe(0.5);
  });

  it('prevents zero-time loops under extreme burst / timing values', () => {
    const inputs: ProcessInput[] = [
      { pid: 'P1', arrivalTime: 0.0, burstTime: 0.1, priority: 1, processType: 'interactive' },
      { pid: 'P2', arrivalTime: 0.0, burstTime: 0.2, priority: 2, processType: 'interactive' },
      { pid: 'P3', arrivalTime: 0.0, burstTime: 0.1, priority: 3, processType: 'cpu' },
    ];

    const results = runAllAlgorithms(inputs);
    for (const [, res] of Object.entries(results)) {
      expect(res.processMetrics).toHaveLength(3);
      expect(res.metrics.totalElapsedTime).toBeGreaterThan(0);
      expect(res.timeline.length).toBeGreaterThan(0);
    }
  });

  it('runs all algorithms with 3 processes deterministically', () => {
    const inputs: ProcessInput[] = [
      { pid: 'P1', arrivalTime: 0.0, burstTime: 3.0, priority: 2, processType: 'cpu' },
      { pid: 'P2', arrivalTime: 1.0, burstTime: 2.0, priority: 1, processType: 'interactive' },
      { pid: 'P3', arrivalTime: 2.0, burstTime: 1.0, priority: 3, processType: 'cpu' },
    ];

    const results = runAllAlgorithms(inputs);
    expect(Object.keys(results)).toEqual(['FCFS', 'SJF', 'RR', 'DART']);

    for (const [, res] of Object.entries(results)) {
      expect(res.processMetrics).toHaveLength(3);
      expect(res.metrics.busyTime).toBe(6.0); // 3 + 2 + 1 = 6 ms
      expect(res.metrics.cpuUtilization).toBeGreaterThan(0);
      expect(res.metrics.throughput).toBeGreaterThan(0);
    }
  });
});

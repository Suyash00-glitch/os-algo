import { describe, it, expect } from 'vitest';
import { computeMetrics, InternalProcessRecord } from '../engine/metrics';
import { ExecutionSegment } from '../engine/types';

describe('Metrics Calculation Engine', () => {
  it('correctly calculates Turnaround, Standard Wait, and Response Time', () => {
    const completed: InternalProcessRecord[] = [
      {
        pid: 'P1',
        arrivalTime: 0,
        burstTime: 5,
        priority: 1,
        processType: 'cpu',
        color: '#3b82f6',
        completionTime: 7,
        firstStartTime: 0.5,
        accumulatedReadyWaitTime: 1.5,
        contextSwitches: 1,
      },
      {
        pid: 'P2',
        arrivalTime: 2,
        burstTime: 3,
        priority: 2,
        processType: 'interactive',
        color: '#10b981',
        completionTime: 11,
        firstStartTime: 7.5,
        accumulatedReadyWaitTime: 5.5,
        contextSwitches: 1,
      },
    ];

    const timeline: ExecutionSegment[] = [
      { startTime: 0, endTime: 0.5, type: 'CS' },
      { startTime: 0.5, endTime: 5.5, type: 'PROCESS', pid: 'P1' },
      { startTime: 5.5, endTime: 7.5, type: 'PROCESS', pid: 'P1' },
      { startTime: 7.5, endTime: 10.5, type: 'PROCESS', pid: 'P2' },
      { startTime: 10.5, endTime: 11.0, type: 'CS' },
    ];

    const totalElapsedTime = 11.0;
    const busyTime = 8.0;
    const totalCsOverhead = 1.0;
    const totalIdleTime = 2.0;
    const totalContextSwitches = 2;

    const { processMetrics, metrics } = computeMetrics(
      completed,
      timeline,
      totalElapsedTime,
      busyTime,
      totalCsOverhead,
      totalIdleTime,
      totalContextSwitches
    );

    // P1: TAT = 7 - 0 = 7, WT = 7 - 5 = 2, RT = 0.5 - 0 = 0.5
    const p1 = processMetrics.find((p) => p.pid === 'P1')!;
    expect(p1.turnaroundTime).toBe(7);
    expect(p1.standardWaitingTime).toBe(2);
    expect(p1.readyQueueWaitingTime).toBe(1.5);
    expect(p1.responseTime).toBe(0.5);

    // P2: TAT = 11 - 2 = 9, WT = 9 - 3 = 6, RT = 7.5 - 2 = 5.5
    const p2 = processMetrics.find((p) => p.pid === 'P2')!;
    expect(p2.turnaroundTime).toBe(9);
    expect(p2.standardWaitingTime).toBe(6);
    expect(p2.readyQueueWaitingTime).toBe(5.5);
    expect(p2.responseTime).toBe(5.5);

    // Averages:
    expect(metrics.avgTurnaroundTime).toBe(8); // (7 + 9) / 2
    expect(metrics.avgWaitingTime).toBe(4); // (2 + 6) / 2
    expect(metrics.avgResponseTime).toBe(3); // (0.5 + 5.5) / 2

    // CPU Utilization = (8 / 11) * 100 = 72.727%
    expect(metrics.cpuUtilization).toBeCloseTo(72.73, 2);
    // Throughput = 2 / 11 = 0.1818
    expect(metrics.throughput).toBeCloseTo(0.1818, 4);
    expect(metrics.maxWaitingTime).toBe(6);
  });
});

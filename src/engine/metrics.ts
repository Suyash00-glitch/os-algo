import { ProcessMetrics, GlobalMetrics, ExecutionSegment } from './types';

export interface InternalProcessRecord {
  pid: string;
  arrivalTime: number;
  burstTime: number;
  priority: number;
  processType: 'cpu' | 'interactive';
  color: string;
  completionTime: number;
  firstStartTime: number | null;
  accumulatedReadyWaitTime: number;
  contextSwitches: number;
}

export function computeMetrics(
  completed: InternalProcessRecord[],
  _timeline: ExecutionSegment[],
  totalElapsedTime: number,
  busyTime: number,
  totalCsOverhead: number,
  totalIdleTime: number,
  totalContextSwitches: number
): { processMetrics: ProcessMetrics[]; metrics: GlobalMetrics } {
  // Sort processes deterministically by PID
  const sorted = [...completed].sort((a, b) => a.pid.localeCompare(b.pid));
  const n = sorted.length;

  const processMetrics: ProcessMetrics[] = sorted.map((p) => {
    const turnaroundTime = p.completionTime - p.arrivalTime;
    const standardWaitingTime = turnaroundTime - p.burstTime;
    const responseTime = (p.firstStartTime !== null ? p.firstStartTime : p.completionTime) - p.arrivalTime;

    return {
      pid: p.pid,
      arrivalTime: p.arrivalTime,
      burstTime: p.burstTime,
      priority: p.priority,
      processType: p.processType,
      color: p.color,
      completionTime: Number(p.completionTime.toFixed(4)),
      turnaroundTime: Number(turnaroundTime.toFixed(4)),
      standardWaitingTime: Number(standardWaitingTime.toFixed(4)),
      readyQueueWaitingTime: Number(p.accumulatedReadyWaitTime.toFixed(4)),
      responseTime: Number(responseTime.toFixed(4)),
      contextSwitches: p.contextSwitches,
    };
  });

  const avgWaitingTime = n > 0 ? processMetrics.reduce((acc, p) => acc + p.standardWaitingTime, 0) / n : 0;
  const avgReadyQueueWaitingTime = n > 0 ? processMetrics.reduce((acc, p) => acc + p.readyQueueWaitingTime, 0) / n : 0;
  const avgTurnaroundTime = n > 0 ? processMetrics.reduce((acc, p) => acc + p.turnaroundTime, 0) / n : 0;
  const avgResponseTime = n > 0 ? processMetrics.reduce((acc, p) => acc + p.responseTime, 0) / n : 0;
  const maxWaitingTime = n > 0 ? Math.max(...processMetrics.map((p) => p.standardWaitingTime)) : 0;

  const cpuUtilization = totalElapsedTime > 0 ? (busyTime / totalElapsedTime) * 100 : 0;
  const throughput = totalElapsedTime > 0 ? n / totalElapsedTime : 0;

  const metrics: GlobalMetrics = {
    avgWaitingTime: Number(avgWaitingTime.toFixed(4)),
    avgReadyQueueWaitingTime: Number(avgReadyQueueWaitingTime.toFixed(4)),
    avgTurnaroundTime: Number(avgTurnaroundTime.toFixed(4)),
    avgResponseTime: Number(avgResponseTime.toFixed(4)),
    totalContextSwitches,
    totalContextSwitchOverhead: Number(totalCsOverhead.toFixed(4)),
    totalIdleTime: Number(totalIdleTime.toFixed(4)),
    totalElapsedTime: Number(totalElapsedTime.toFixed(4)),
    busyTime: Number(busyTime.toFixed(4)),
    cpuUtilization: Number(cpuUtilization.toFixed(4)),
    throughput: Number(throughput.toFixed(4)),
    maxWaitingTime: Number(maxWaitingTime.toFixed(4)),
  };

  return { processMetrics, metrics };
}

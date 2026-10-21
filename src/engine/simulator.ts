import { ProcessInput, AlgorithmResult, SimulatorConfig } from './types';
import { runFCFS } from '../algorithms/fcfs';
import { runSJF } from '../algorithms/sjf';
import { runRoundRobin } from '../algorithms/roundRobin';
import { runDart, DEFAULT_DART_CONFIG } from '../algorithms/dart';
import { DEFAULT_DART_V2_CONFIG } from '../algorithms/adaptCsV2';

export const DEFAULT_SIMULATOR_CONFIG: SimulatorConfig = {
  contextSwitchOverhead: 0.5,
  includeInitialDispatchInCount: true,
  rrQuantum: 3.0,
  dartBaseline: DEFAULT_DART_CONFIG,
  adaptCsBaseline: DEFAULT_DART_CONFIG,
  adaptCsV2: DEFAULT_DART_V2_CONFIG,
};

export const DEFAULT_PRESET_PROCESSES: ProcessInput[] = [
  { pid: 'P1', arrivalTime: 0.0, burstTime: 8.0, priority: 3, processType: 'cpu', color: '#3b82f6' },
  { pid: 'P2', arrivalTime: 1.0, burstTime: 4.0, priority: 1, processType: 'interactive', color: '#10b981' },
  { pid: 'P3', arrivalTime: 2.0, burstTime: 2.0, priority: 2, processType: 'interactive', color: '#f59e0b' },
  { pid: 'P4', arrivalTime: 3.0, burstTime: 1.0, priority: 3, processType: 'interactive', color: '#ec4899' },
  { pid: 'P5', arrivalTime: 4.0, burstTime: 6.0, priority: 2, processType: 'cpu', color: '#8b5cf6' },
];

export const WORKLOAD_PRESETS: { name: string; description: string; processes: ProcessInput[] }[] = [
  {
    name: 'Concrete 5-Process Benchmark (Standard)',
    description: 'The standard 5-process workload comparing interactive bursts against long CPU tasks.',
    processes: DEFAULT_PRESET_PROCESSES,
  },
  {
    name: 'Simultaneous Arrivals (Convoy Test)',
    description: 'All processes arrive at t = 0 ms with varying burst lengths and priority levels.',
    processes: [
      { pid: 'P1', arrivalTime: 0.0, burstTime: 12.0, priority: 3, processType: 'cpu', color: '#3b82f6' },
      { pid: 'P2', arrivalTime: 0.0, burstTime: 3.0, priority: 1, processType: 'interactive', color: '#10b981' },
      { pid: 'P3', arrivalTime: 0.0, burstTime: 2.0, priority: 2, processType: 'interactive', color: '#f59e0b' },
      { pid: 'P4', arrivalTime: 0.0, burstTime: 1.0, priority: 1, processType: 'interactive', color: '#ec4899' },
    ],
  },
  {
    name: 'Equal Burst Times (Tie-Breaker Test)',
    description: 'Processes share identical burst times to test deterministic tie-breaking logic.',
    processes: [
      { pid: 'P1', arrivalTime: 0.0, burstTime: 4.0, priority: 2, processType: 'cpu', color: '#3b82f6' },
      { pid: 'P2', arrivalTime: 1.0, burstTime: 4.0, priority: 2, processType: 'interactive', color: '#10b981' },
      { pid: 'P3', arrivalTime: 2.0, burstTime: 4.0, priority: 1, processType: 'interactive', color: '#f59e0b' },
    ],
  },
  {
    name: 'CPU-Hogging & Starvation Stress Test',
    description: 'A massive 25 ms CPU-bound calculation thread tested against late-arriving interactive mouse clicks.',
    processes: [
      { pid: 'P1', arrivalTime: 0.0, burstTime: 25.0, priority: 3, processType: 'cpu', color: '#ef4444' },
      { pid: 'P2', arrivalTime: 5.0, burstTime: 2.0, priority: 1, processType: 'interactive', color: '#10b981' },
      { pid: 'P3', arrivalTime: 7.0, burstTime: 1.0, priority: 1, processType: 'interactive', color: '#38bdf8' },
      { pid: 'P4', arrivalTime: 12.0, burstTime: 3.0, priority: 2, processType: 'interactive', color: '#eab308' },
    ],
  },
  {
    name: 'Near-Finish Shield Showcase',
    description: 'Designed to demonstrate how DART shields almost-done processes from tail preemption.',
    processes: [
      { pid: 'P1', arrivalTime: 0.0, burstTime: 3.5, priority: 2, processType: 'cpu', color: '#3b82f6' },
      { pid: 'P2', arrivalTime: 2.0, burstTime: 2.0, priority: 1, processType: 'interactive', color: '#10b981' },
      { pid: 'P3', arrivalTime: 3.0, burstTime: 1.0, priority: 2, processType: 'interactive', color: '#f59e0b' },
    ],
  },
];

export function runAllAlgorithms(
  inputs: ProcessInput[],
  config: SimulatorConfig = DEFAULT_SIMULATOR_CONFIG
): Record<string, AlgorithmResult> {
  const cs = config.contextSwitchOverhead;
  const incInit = config.includeInitialDispatchInCount;
  const dartConfig = config.dartBaseline || config.adaptCsBaseline || DEFAULT_DART_CONFIG;

  return {
    FCFS: runFCFS(inputs, cs, incInit),
    SJF: runSJF(inputs, cs, incInit),
    RR: runRoundRobin(inputs, config.rrQuantum, cs, incInit),
    DART: runDart(inputs, dartConfig, cs, incInit),
  };
}

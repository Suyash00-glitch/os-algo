export type ProcessType = 'cpu' | 'interactive';

export interface ProcessInput {
  pid: string;
  arrivalTime: number;
  burstTime: number;
  priority: number; // 1 = highest
  processType: ProcessType;
  color?: string;
}

export interface ProcessMetrics {
  pid: string;
  arrivalTime: number;
  burstTime: number;
  priority: number;
  processType: ProcessType;
  color: string;
  completionTime: number;
  turnaroundTime: number;
  standardWaitingTime: number; // Turnaround - Burst
  readyQueueWaitingTime: number; // Explicit accumulated wait in ready queue
  responseTime: number;
  contextSwitches: number;
}

export type SegmentType = 'PROCESS' | 'CS' | 'IDLE';

export interface ExecutionSegment {
  startTime: number;
  endTime: number;
  type: SegmentType;
  pid?: string;
  color?: string;
  remainingAfter?: number;
  description?: string;
}

export interface DartMathDetails {
  triggerEvent: string;
  candidate: {
    pid: string;
    remainingTime: number;
    accumulatedWait: number;
    priority: number;
    processType: ProcessType;
    prioWeight: number;
    interactBonus: number;
    estRem: number;
    agingTerm: number;
    urgency: number;
    substitutionString: string;
  };
  current: {
    pid: string;
    remainingTime: number;
    accumulatedWait: number;
    priority: number;
    processType: ProcessType;
    prioWeight: number;
    interactBonus: number;
    estRem: number;
    agingTerm: number;
    urgency: number;
    substitutionString: string;
  };
  threshold: {
    csOverhead: number;
    baseFriction: number;
    sliceExecuted: number;
    baseQuantum: number;
    finishThresh: number;
    kFinish: number;
    kHog: number;
    finishBonus: number;
    hogPenalty: number;
    rawBarrier: number;
    barrier: number;
    isV2: boolean;
    floorApplied: boolean;
    barrierFloor?: number;
    finishBonusSubstitution: string;
    hogPenaltySubstitution: string;
    barrierSubstitution: string;
  };
  nearFinishShield: {
    applies: boolean;
    remainingTime: number;
    shieldLimit: number;
    sliceTime: number;
    qMax: number;
    explanation: string;
  };
  hardCeiling: {
    applies: boolean;
    sliceTime: number;
    qMax: number;
    hasReadyCandidate: boolean;
    explanation: string;
  };
  urgencyDiff: number;
  decision: 'PREEMPT' | 'CONTINUE';
  ruleApplied: 'RULE_A' | 'RULE_B' | 'RULE_C';
  decisionJustification: string;
  resultingReadyQueue: Array<{
    pid: string;
    remainingTime: number;
    accumulatedWait: number;
  }>;
}

export type AdaptCsMathDetails = DartMathDetails;

export interface SimulationEvent {
  stepIndex: number;
  time: number;
  eventType: 'ARRIVAL' | 'DISPATCH' | 'PREEMPTION' | 'COMPLETION' | 'EVAL_TICK' | 'IDLE' | 'CS_START' | 'CS_END';
  runningPid: string | null;
  runningRemaining: number | null;
  runningSliceTime: number | null;
  readyQueue: Array<{
    pid: string;
    remainingTime: number;
    accumulatedWait: number;
    priority: number;
    processType: ProcessType;
    urgency?: number;
  }>;
  candidatePid?: string | null;
  candidateUrgency?: number | null;
  runningUrgency?: number | null;
  urgencyDiff?: number | null;
  barrier?: number | null;
  nearFinishShieldApplied?: boolean;
  hardCeilingApplied?: boolean;
  preemptDecision?: boolean;
  reason: string;
  stepDetails?: {
    headline: string;
    formulaBreakdown?: string[];
    comparison?: string;
    action: string;
  };
  dartMath?: DartMathDetails;
  adaptCsMath?: DartMathDetails;
}

export interface GlobalMetrics {
  avgWaitingTime: number;
  avgReadyQueueWaitingTime: number;
  avgTurnaroundTime: number;
  avgResponseTime: number;
  totalContextSwitches: number;
  totalContextSwitchOverhead: number;
  totalIdleTime: number;
  totalElapsedTime: number;
  busyTime: number;
  cpuUtilization: number;
  throughput: number;
  maxWaitingTime: number;
}

export interface AlgorithmResult {
  algorithmId: 'FCFS' | 'SJF' | 'RR' | 'DART' | 'ADAPT_CS' | 'ADAPT_CS_V2';
  name: string;
  description: string;
  timeline: ExecutionSegment[];
  events: SimulationEvent[];
  processMetrics: ProcessMetrics[];
  metrics: GlobalMetrics;
}

export interface DartConfig {
  baseQuantum: number; // default 3.0
  thetaBase: number; // default 1.2
  finishThresh: number; // default 2.0
  kFinish: number; // default 5.0
  kHog: number; // default 1.2
  qMax: number; // default 8.0
  agingExponent: number; // default 1.3
  nearFinishShieldLimit: number; // default 1.5
  barrierFloor?: number; // default undefined (baseline) or 0.1 (v2)
}

export type AdaptCsConfig = DartConfig;

export interface SimulatorConfig {
  contextSwitchOverhead: number; // default 0.5
  includeInitialDispatchInCount: boolean; // default true
  rrQuantum: number; // default 3.0
  dartBaseline: DartConfig;
  adaptCsBaseline: DartConfig;
  adaptCsV2?: DartConfig;
}

export interface SampleQuestion {
  id: string;
  title: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  targetAlgorithm: 'DART' | 'ADAPT_CS' | 'ADAPT_CS_V2' | 'RR' | 'SJF' | 'FCFS';
  scenarioDescription: string;
  taskPrompt: string;
  assumptions: string[];
  processes: ProcessInput[];
  config: Partial<SimulatorConfig>;
}

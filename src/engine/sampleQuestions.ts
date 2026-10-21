import { SampleQuestion, ProcessInput, SimulatorConfig } from './types';
import { DEFAULT_SIMULATOR_CONFIG } from './simulator';

interface QuestionTemplate {
  title: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  targetAlgorithm: 'DART' | 'ADAPT_CS' | 'ADAPT_CS_V2' | 'RR' | 'SJF' | 'FCFS';
  scenarioDescription: string;
  taskPrompt: string;
  assumptions: string[];
  generate: () => {
    processes: ProcessInput[];
    config: Partial<SimulatorConfig>;
  };
}

const TEMPLATES: QuestionTemplate[] = [
  {
    title: 'Tail Preemption Shield & Interactive Responsiveness',
    difficulty: 'Intermediate',
    targetAlgorithm: 'DART',
    scenarioDescription:
      'A user is streaming high-definition audio while running an image processing loop. At t = 2.0 ms, the user clicks the pause button, queuing a high-priority interactive task (P2). P1 is within 1.5 ms of completing its CPU burst.',
    taskPrompt:
      'Determine whether DART grants P1 a tail grace extension under Rule A (Near-Finish Shield) or allows P2 to preempt immediately. Calculate the urgency difference ΔU vs the preemption barrier Θ at t = 2.0 ms.',
    assumptions: [
      'Context Switch Overhead CS = 0.5 ms.',
      'Base Quantum Q = 3.0 ms, Hard Ceiling Q_max = 8.0 ms.',
      'Near-Finish Shield Limit = 1.5 ms.',
      'Urgency formula uses exponent 1.3 with priority weight = 1 + 0.5 × (5 − Prio).',
    ],
    generate: () => {
      const p1Burst = Math.round((2.5 + Math.random() * 1.5) * 2) / 2; // 2.5 - 4.0
      const p2Burst = Math.round((1.0 + Math.random() * 1.0) * 2) / 2; // 1.0 - 2.0
      const p3Burst = Math.round((3.0 + Math.random() * 2.0) * 2) / 2; // 3.0 - 5.0
      const dartBaseline = {
        ...DEFAULT_SIMULATOR_CONFIG.dartBaseline,
        nearFinishShieldLimit: 1.5,
      };
      return {
        processes: [
          { pid: 'P1', arrivalTime: 0.0, burstTime: p1Burst, priority: 3, processType: 'cpu' },
          { pid: 'P2', arrivalTime: 1.5, burstTime: p2Burst, priority: 1, processType: 'interactive' },
          { pid: 'P3', arrivalTime: 2.5, burstTime: p3Burst, priority: 2, processType: 'interactive' },
        ],
        config: {
          contextSwitchOverhead: 0.5,
          rrQuantum: 2.0,
          dartBaseline,
          adaptCsBaseline: dartBaseline,
        },
      };
    },
  },
  {
    title: 'CPU Hogging & Hard Ceiling Preemption Under Q_max',
    difficulty: 'Advanced',
    targetAlgorithm: 'DART',
    scenarioDescription:
      'A compute-heavy crypto-mining process (P1) monopolizes the processor core. A lower-priority logging thread (P2) is queued. P1 executes continuously until reaching the hard preemption ceiling.',
    taskPrompt:
      'Identify the exact timestamp at which P1 reaches Q_max = 8.0 ms. Verify whether Rule B forces preemption regardless of the candidate urgency difference, and compute the total turnaround time for both tasks.',
    assumptions: [
      'Context Switch Overhead CS = 0.5 ms.',
      'Hard Ceiling Q_max = 8.0 ms.',
      'Anti-Hog Penalty coefficient k_hog = 1.2.',
      'Initial dispatch from idle incurs CS overhead and is counted in switches.',
    ],
    generate: () => {
      const p1Burst = Math.round((14.0 + Math.random() * 4.0) * 2) / 2; // 14 - 18
      const p2Burst = Math.round((2.0 + Math.random() * 2.0) * 2) / 2; // 2 - 4
      const p3Burst = Math.round((3.0 + Math.random() * 2.0) * 2) / 2; // 3 - 5
      const dartBaseline = {
        ...DEFAULT_SIMULATOR_CONFIG.dartBaseline,
        qMax: 8.0,
        baseQuantum: 3.0,
      };
      return {
        processes: [
          { pid: 'P1', arrivalTime: 0.0, burstTime: p1Burst, priority: 1, processType: 'cpu' },
          { pid: 'P2', arrivalTime: 4.0, burstTime: p2Burst, priority: 3, processType: 'cpu' },
          { pid: 'P3', arrivalTime: 7.0, burstTime: p3Burst, priority: 2, processType: 'interactive' },
        ],
        config: {
          contextSwitchOverhead: 0.5,
          dartBaseline,
          adaptCsBaseline: dartBaseline,
        },
      };
    },
  },
  {
    title: 'Friction Barrier vs Thrashing in Similar Urgency Threads',
    difficulty: 'Intermediate',
    targetAlgorithm: 'DART',
    scenarioDescription:
      'Two processes of comparable priority and burst length arrive in rapid succession. Under naive Round Robin, constant thrashing occurs every 2 ms. Under DART, the friction barrier Θ = 1.2 × CS prevents pointless cache flushes.',
    taskPrompt:
      'Calculate the preemption barrier Θ at t = 1.0 ms. Compare the total number of context switches incurred by Round Robin (q = 2.0) versus DART.',
    assumptions: [
      'Context Switch Overhead CS = 0.5 ms (Base friction = 0.60).',
      'Round Robin Quantum q = 2.0 ms.',
      'DART Base Quantum Q = 3.0 ms.',
    ],
    generate: () => {
      const p1Burst = Math.round((5.0 + Math.random() * 2.0) * 2) / 2; // 5 - 7
      const p2Burst = Math.round((4.0 + Math.random() * 2.0) * 2) / 2; // 4 - 6
      const p3Burst = Math.round((2.0 + Math.random() * 1.5) * 2) / 2; // 2 - 3.5
      const dartBaseline = {
        ...DEFAULT_SIMULATOR_CONFIG.dartBaseline,
        thetaBase: 1.2,
      };
      return {
        processes: [
          { pid: 'P1', arrivalTime: 0.0, burstTime: p1Burst, priority: 2, processType: 'cpu' },
          { pid: 'P2', arrivalTime: 1.0, burstTime: p2Burst, priority: 2, processType: 'cpu' },
          { pid: 'P3', arrivalTime: 2.5, burstTime: p3Burst, priority: 1, processType: 'interactive' },
        ],
        config: {
          contextSwitchOverhead: 0.5,
          rrQuantum: 2.0,
          dartBaseline,
          adaptCsBaseline: dartBaseline,
        },
      };
    },
  },
  {
    title: 'Superlinear Aging & Starvation Prevention',
    difficulty: 'Beginner',
    targetAlgorithm: 'DART',
    scenarioDescription:
      'A low-priority background worker (P3, Priority 5) waits while high-priority bursts (P1, P2) occupy the system. As P3 sits in the ready queue, its urgency grows as (1 + W)^1.3.',
    taskPrompt:
      'Compute the urgency of P3 at t = 0.0 ms vs t = 6.0 ms. Verify whether superlinear aging enables P3 to overcome the running process barrier before starvation occurs.',
    assumptions: [
      'Priority Weight = 1 + 0.5 × max(0, 5 − Priority).',
      'Interactive Bonus = 1.5 for Interactive; 1.0 for CPU-bound.',
      'Superlinear Aging Exponent = 1.3.',
    ],
    generate: () => {
      const p1Burst = Math.round((3.0 + Math.random() * 2.0) * 2) / 2; // 3 - 5
      const p2Burst = Math.round((3.0 + Math.random() * 2.0) * 2) / 2; // 3 - 5
      const p3Burst = Math.round((2.0 + Math.random() * 1.0) * 2) / 2; // 2 - 3
      const dartBaseline = {
        ...DEFAULT_SIMULATOR_CONFIG.dartBaseline,
        agingExponent: 1.3,
      };
      return {
        processes: [
          { pid: 'P1', arrivalTime: 0.0, burstTime: p1Burst, priority: 1, processType: 'interactive' },
          { pid: 'P2', arrivalTime: 1.0, burstTime: p2Burst, priority: 2, processType: 'interactive' },
          { pid: 'P3', arrivalTime: 0.0, burstTime: p3Burst, priority: 5, processType: 'cpu' },
        ],
        config: {
          contextSwitchOverhead: 0.5,
          dartBaseline,
          adaptCsBaseline: dartBaseline,
        },
      };
    },
  },
  {
    title: 'Dynamic Preemption Barrier & Anti-Hogging Decay',
    difficulty: 'Advanced',
    targetAlgorithm: 'DART',
    scenarioDescription:
      'Under heavy CPU execution, the anti-hogging penalty diminishes the preemption barrier over time. P1 executes a compute-intensive thread while higher-priority tasks arrive in the ready queue.',
    taskPrompt:
      'Evaluate the dynamic preemption barrier Θ = 1.2 × CS + FinishBonus − Penalty_hog at each evaluation tick. Determine the exact timestamp where the candidate urgency overcomes the decaying barrier to preempt P1.',
    assumptions: [
      'Barrier Formula: Θ = 1.2 × CS + FinishBonus − 1.2 × (t / 3.0)²',
      'Context Switch Overhead CS = 0.5 ms.',
      'Hard Ceiling Q_max = 8.0 ms.',
      'Base Quantum Q = 3.0 ms.',
    ],
    generate: () => {
      const p1Burst = Math.round((8.0 + Math.random() * 2.0) * 2) / 2; // 8 - 10
      const p2Burst = Math.round((3.0 + Math.random() * 2.0) * 2) / 2; // 3 - 5
      const p3Burst = Math.round((2.0 + Math.random() * 1.5) * 2) / 2; // 2 - 3.5
      const dartBaseline = {
        ...DEFAULT_SIMULATOR_CONFIG.dartBaseline,
      };
      return {
        processes: [
          { pid: 'P1', arrivalTime: 0.0, burstTime: p1Burst, priority: 1, processType: 'cpu' },
          { pid: 'P2', arrivalTime: 4.5, burstTime: p2Burst, priority: 3, processType: 'cpu' },
          { pid: 'P3', arrivalTime: 6.0, burstTime: p3Burst, priority: 2, processType: 'interactive' },
        ],
        config: {
          contextSwitchOverhead: 0.5,
          dartBaseline,
          adaptCsBaseline: dartBaseline,
        },
      };
    },
  },
];

export const SAMPLE_QUESTION_TEMPLATES = TEMPLATES;

let lastTemplateIndex = -1;

export function generateSampleQuestion(
  requestedDifficulty?: 'Beginner' | 'Intermediate' | 'Advanced' | 'beginner' | 'intermediate' | 'advanced' | 'all'
): SampleQuestion {
  let candidates = TEMPLATES;
  if (requestedDifficulty && requestedDifficulty.toLowerCase() !== 'all') {
    const norm = (requestedDifficulty.charAt(0).toUpperCase() + requestedDifficulty.slice(1).toLowerCase()) as 'Beginner' | 'Intermediate' | 'Advanced';
    candidates = TEMPLATES.filter((t) => t.difficulty === norm);
    if (candidates.length === 0) candidates = TEMPLATES;
  }

  // Avoid repeating the immediate last template if multiple exist
  let chosenIndex = Math.floor(Math.random() * candidates.length);
  if (candidates.length > 1 && chosenIndex === lastTemplateIndex) {
    chosenIndex = (chosenIndex + 1) % candidates.length;
  }
  lastTemplateIndex = chosenIndex;

  const template = candidates[chosenIndex];
  const { processes, config } = template.generate();

  return {
    id: `q_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    title: template.title,
    difficulty: template.difficulty,
    targetAlgorithm: template.targetAlgorithm,
    scenarioDescription: template.scenarioDescription,
    taskPrompt: template.taskPrompt,
    assumptions: template.assumptions,
    processes,
    config,
  };
}

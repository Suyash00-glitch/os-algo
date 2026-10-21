# OS CPU Scheduling Simulator & Visualizer

A deterministic operating system CPU scheduling simulator and interactive visualizer. Compares traditional scheduling algorithms (**FCFS**, **Non-Preemptive SJF**, and **Round Robin**) against **DART (Dynamic Adaptive Runtime Triage)**.

Built with a monochrome aesthetic, real-time Gantt timeline visualization, dynamic metric comparison tables, and full-page step-by-step arithmetic evaluation traces.

---

## ⚡ Algorithms Implemented

1. **FCFS (First-Come, First-Served)**
   - Strict FIFO arrival queue execution without preemption.
   - Demonstrates the classic convoy effect under mixed workloads.

2. **SJF (Shortest Job First - Non-Preemptive)**
   - Prioritizes ready tasks with the shortest remaining burst time upon CPU idle dispatch.

3. **Round Robin (RR)**
   - Preempts tasks upon exhausting a fixed time quantum ($q$).
   - Models realistic hardware context-switch overhead costs during thread preemption and dispatch.

4. **DART (Dynamic Adaptive Runtime Triage)**
   - Evaluates hardware context-switch friction, superlinear queue aging, and tail execution shields:
     - **Urgency Metric $U(P_i, t)$**:
       $$U(P_i, t) = \left[ \frac{(1 + W_i)^{1.3}}{\max(0.5, R_i)} \right] \times \text{PriorityWeight}_i \times \text{TypeBonus}_i$$
     - **Dynamic Friction Barrier $\Theta$**:
       $$\Theta = 1.2 \times \text{CS} + \text{FinishBonus} - \text{Penalty}_{\text{hog}}$$
     - **Rule A (Near-Finish Shield)**: Shields running tasks with $R_i \le 1.5\text{ ms}$ from unnecessary tail preemption.
     - **Rule B (Hard Ceiling)**: Enforces preemption once a thread hits $Q_{\max} = 8.0\text{ ms}$ of continuous core time.
     - **Rule C (Preemption Barrier)**: Requires incoming candidate urgency gap $\Delta U > \Theta$ to justify a cache flush.

---

## 🚀 Features

- **Interactive Timeline Gantt Chart**: Horizontal pan-and-scroll execution visualization displaying process intervals, idle states, and context-switch boundaries.
- **Step-by-Step Arithmetic Trace Page**: Full student hand-calculation view detailing exact numerical formula substitutions at every $1.0\text{ ms}$ evaluation tick and arrival event.
- **Algorithm Comparison Matrix**: Side-by-side performance benchmarking across Average Waiting Time, Turnaround Time, Response Time, CPU Utilization, Throughput, and Context Switch Overhead.
- **Configurable Hardware Parameters**: Fine-tune context-switch overhead (CS), RR quantum, base quantum ($Q$), hard ceiling ($Q_{\max}$), near-finish shield threshold, and anti-hog coefficients.
- **Process Preset Benchmarks**: One-click loaders for standard 5-process workloads, convoy arrivals, tie-breakers, and CPU hog stress tests.
- **Educational Question Generator**: Auto-generates OS scenario questions with difficulty tiers (Beginner, Intermediate, Advanced) and parameter presets.
- **CSV Trace & Results Export**: Export full execution breakdowns and comparison matrices to CSV for offline analysis.

---

## 🛠️ Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (version 18.0.0 or higher recommended)
- `npm` (comes bundled with Node.js)

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/Suyash00-glitch/os-algo.git
   cd os-algo
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

### Running Locally

To start the local Vite development server:

```bash
npm run dev
```

Open your browser and navigate to the local URL displayed in the terminal (typically `http://localhost:5173` or `http://localhost:5174`).

### Running Tests

To run the automated Vitest test suite:

```bash
npm test
```

To run tests in single-run mode:

```bash
npm test -- --run
```

### Production Build

To compile TypeScript and bundle assets for production:

```bash
npm run build
```

Production output will be generated inside the `dist/` directory. You can preview the production build locally with:

```bash
npm run preview
```

---

## 📂 Project Structure

```
├── src/
│   ├── algorithms/
│   │   ├── dart.ts              # DART entry point and default configurations
│   │   ├── dartEngine.ts        # DART discrete-event simulation engine
│   │   ├── fcfs.ts              # FCFS scheduling implementation
│   │   ├── sjf.ts               # Non-preemptive SJF implementation
│   │   └── roundRobin.ts        # Round Robin with context switch tracking
│   ├── components/
│   │   ├── ComparisonTable.tsx  # Algorithm comparison matrix & process metrics
│   │   ├── ConfigurationPanel.tsx # Live parameter tuning panel
│   │   ├── GanttChart.tsx       # Timeline visualizer with process badges
│   │   └── ProcessInputTable.tsx # Process entry table and preset loaders
│   ├── engine/
│   │   ├── metrics.ts           # Global and per-process metric computations
│   │   ├── sampleQuestions.ts   # Interactive question generation engine
│   │   ├── simulator.ts         # Multi-algorithm orchestration and presets
│   │   └── types.ts             # TypeScript interfaces and types
│   ├── pages/
│   │   ├── DartTracePage.tsx    # Full-page step-by-step arithmetic trace
│   │   └── SimulatorPage.tsx    # Main dashboard view
│   ├── tests/                   # Vitest unit and edge-case test suites
│   ├── App.tsx                  # Root React application component
│   ├── index.css                # Global Tailwind CSS and typography tokens
│   └── main.tsx                 # React DOM mount point
├── index.html                   # HTML entry point
├── package.json                 # Project scripts and dependencies
├── tailwind.config.js           # Tailwind configuration
├── tsconfig.json                # TypeScript compiler configuration
└── vite.config.ts               # Vite bundler configuration
```

---

## 📄 License

This project is open-source under the MIT License.

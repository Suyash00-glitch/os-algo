"""
CPU Scheduling Simulation Engine
Implements:
- FCFS (First-Come, First-Served)
- SJF (Shortest Job First - Non-preemptive)
- SRTF (Shortest Remaining Time First - Preemptive)
- Priority (Preemptive & Non-preemptive)
- Round Robin (RR with configurable quantum)
- MLFQ (Multi-Level Feedback Queue with 3 queues and periodic boost)
- ADAPT-CS (Adaptive Dynamic Affinity & Preemption Thresholding)
"""

import copy
import math
from dataclasses import dataclass, field
from typing import List, Dict, Optional, Tuple

@dataclass
class Process:
    pid: str
    arrival_time: float
    burst_time: float
    priority: int = 1  # Lower number = higher priority
    process_type: str = "cpu"  # "interactive" or "cpu"
    
    # Dynamic state tracking
    remaining_time: float = field(init=False)
    start_time: Optional[float] = field(default=None, init=False)
    completion_time: Optional[float] = field(default=None, init=False)
    waiting_time: float = field(default=0.0, init=False)
    turnaround_time: float = field(default=0.0, init=False)
    response_time: Optional[float] = field(default=None, init=False)
    context_switches: int = field(default=0, init=False)
    
    # Internal scheduler metadata
    last_run_time: float = field(default=0.0, init=False)
    current_burst_executed: float = field(default=0.0, init=False)
    estimated_burst: float = field(default=0.0, init=False)
    mlfq_level: int = field(default=0, init=False)
    mlfq_quantum_used: float = field(default=0.0, init=False)

    def __post_init__(self):
        self.remaining_time = float(self.burst_time)
        self.estimated_burst = float(self.burst_time)

@dataclass
class SimulationResult:
    algorithm_name: str
    total_time: float
    busy_time: float
    context_switch_time: float
    idle_time: float
    total_context_switches: int
    avg_waiting_time: float
    avg_turnaround_time: float
    avg_response_time: float
    cpu_utilization: float
    throughput: float
    jains_fairness_index: float
    process_results: List[Dict]
    execution_timeline: List[Tuple[float, float, str]]  # (start, end, pid or 'IDLE' or 'CS')

def compute_jains_fairness(processes: List[Process]) -> float:
    """
    Computes Jain's Fairness Index based on normalized slowdown (Turnaround Time / Burst Time).
    A score of 1.0 indicates perfect fairness.
    """
    if not processes:
        return 1.0
    slowdowns = []
    for p in processes:
        b = max(p.burst_time, 0.001)
        slowdown = p.turnaround_time / b
        slowdowns.append(slowdown)
    
    sum_x = sum(slowdowns)
    sum_sq_x = sum(x * x for x in slowdowns)
    n = len(slowdowns)
    
    if sum_sq_x == 0:
        return 1.0
    return (sum_x ** 2) / (n * sum_sq_x)

class SchedulerSimulator:
    def __init__(self, context_switch_overhead: float = 0.5):
        """
        context_switch_overhead: Direct + indirect context switch cost in time units.
        """
        self.cs_overhead = context_switch_overhead

    def _clone_processes(self, processes: List[Process]) -> List[Process]:
        return [
            Process(
                pid=p.pid,
                arrival_time=p.arrival_time,
                burst_time=p.burst_time,
                priority=p.priority,
                process_type=p.process_type
            ) for p in processes
        ]

    # 1. FCFS
    def run_fcfs(self, input_processes: List[Process]) -> SimulationResult:
        procs = sorted(self._clone_processes(input_processes), key=lambda p: (p.arrival_time, p.pid))
        timeline = []
        current_time = 0.0
        ready_queue = []
        completed = []
        proc_idx = 0
        n = len(procs)
        current_proc = None
        total_cs = 0
        total_cs_time = 0.0
        busy_time = 0.0
        idle_time = 0.0

        while len(completed) < n:
            while proc_idx < n and procs[proc_idx].arrival_time <= current_time:
                ready_queue.append(procs[proc_idx])
                proc_idx += 1

            if not ready_queue:
                if proc_idx < n:
                    next_arrival = procs[proc_idx].arrival_time
                    timeline.append((current_time, next_arrival, "IDLE"))
                    idle_time += (next_arrival - current_time)
                    current_time = next_arrival
                    continue
                else:
                    break

            proc = ready_queue.pop(0)
            # Context switch to this process if switching
            if self.cs_overhead > 0:
                timeline.append((current_time, current_time + self.cs_overhead, "CS"))
                current_time += self.cs_overhead
                total_cs_time += self.cs_overhead
                total_cs += 1

            if proc.response_time is None:
                proc.response_time = current_time - proc.arrival_time

            start = current_time
            burst = proc.remaining_time
            current_time += burst
            busy_time += burst
            proc.remaining_time = 0.0
            proc.completion_time = current_time
            proc.turnaround_time = proc.completion_time - proc.arrival_time
            proc.waiting_time = proc.turnaround_time - proc.burst_time
            completed.append(proc)
            timeline.append((start, current_time, proc.pid))

        return self._build_result("FCFS", completed, timeline, current_time, busy_time, total_cs_time, idle_time, total_cs)

    # 2. SJF (Non-preemptive)
    def run_sjf(self, input_processes: List[Process]) -> SimulationResult:
        procs = sorted(self._clone_processes(input_processes), key=lambda p: (p.arrival_time, p.burst_time, p.pid))
        timeline = []
        current_time = 0.0
        ready_queue: List[Process] = []
        completed = []
        proc_idx = 0
        n = len(procs)
        total_cs = 0
        total_cs_time = 0.0
        busy_time = 0.0
        idle_time = 0.0

        while len(completed) < n:
            while proc_idx < n and procs[proc_idx].arrival_time <= current_time:
                ready_queue.append(procs[proc_idx])
                proc_idx += 1

            if not ready_queue:
                if proc_idx < n:
                    next_arrival = procs[proc_idx].arrival_time
                    timeline.append((current_time, next_arrival, "IDLE"))
                    idle_time += (next_arrival - current_time)
                    current_time = next_arrival
                    continue
                else:
                    break

            # Pick shortest burst
            ready_queue.sort(key=lambda p: (p.burst_time, p.arrival_time, p.pid))
            proc = ready_queue.pop(0)

            if self.cs_overhead > 0:
                timeline.append((current_time, current_time + self.cs_overhead, "CS"))
                current_time += self.cs_overhead
                total_cs_time += self.cs_overhead
                total_cs += 1

            if proc.response_time is None:
                proc.response_time = current_time - proc.arrival_time

            start = current_time
            burst = proc.remaining_time
            current_time += burst
            busy_time += burst
            proc.remaining_time = 0.0
            proc.completion_time = current_time
            proc.turnaround_time = proc.completion_time - proc.arrival_time
            proc.waiting_time = proc.turnaround_time - proc.burst_time
            completed.append(proc)
            timeline.append((start, current_time, proc.pid))

        return self._build_result("SJF", completed, timeline, current_time, busy_time, total_cs_time, idle_time, total_cs)

    # 3. SRTF (Preemptive Shortest Remaining Time First)
    def run_srtf(self, input_processes: List[Process], time_step: float = 0.1) -> SimulationResult:
        procs = self._clone_processes(input_processes)
        timeline = []
        current_time = 0.0
        ready_queue: List[Process] = []
        completed = []
        n = len(procs)
        proc_idx = 0
        procs.sort(key=lambda p: (p.arrival_time, p.pid))
        
        running_proc: Optional[Process] = None
        total_cs = 0
        total_cs_time = 0.0
        busy_time = 0.0
        idle_time = 0.0

        # We simulate with discrete events: next arrival or current process completion
        while len(completed) < n:
            while proc_idx < n and procs[proc_idx].arrival_time <= current_time + 1e-9:
                ready_queue.append(procs[proc_idx])
                proc_idx += 1

            if running_proc is None and not ready_queue:
                if proc_idx < n:
                    next_arrival = procs[proc_idx].arrival_time
                    timeline.append((current_time, next_arrival, "IDLE"))
                    idle_time += (next_arrival - current_time)
                    current_time = next_arrival
                    continue
                else:
                    break

            # Find candidate with shortest remaining time
            if ready_queue:
                ready_queue.sort(key=lambda p: (p.remaining_time, p.arrival_time, p.pid))
                candidate = ready_queue[0]
            else:
                candidate = None

            # Check if candidate should preempt running_proc
            if running_proc is None:
                running_proc = ready_queue.pop(0)
                if self.cs_overhead > 0:
                    timeline.append((current_time, current_time + self.cs_overhead, "CS"))
                    current_time += self.cs_overhead
                    total_cs_time += self.cs_overhead
                    total_cs += 1
                if running_proc.response_time is None:
                    running_proc.response_time = current_time - running_proc.arrival_time
            elif candidate and candidate.remaining_time < running_proc.remaining_time - 1e-9:
                # Preemption!
                ready_queue.append(running_proc)
                running_proc = ready_queue.pop(0)
                if self.cs_overhead > 0:
                    timeline.append((current_time, current_time + self.cs_overhead, "CS"))
                    current_time += self.cs_overhead
                    total_cs_time += self.cs_overhead
                    total_cs += 1
                running_proc.context_switches += 1
                if running_proc.response_time is None:
                    running_proc.response_time = current_time - running_proc.arrival_time

            # Determine next critical event: next arrival or running_proc finishes
            time_to_finish = running_proc.remaining_time
            next_arrival_delta = (procs[proc_idx].arrival_time - current_time) if proc_idx < n else float('inf')
            
            run_duration = min(time_to_finish, next_arrival_delta if next_arrival_delta > 1e-9 else time_to_finish)
            if run_duration <= 1e-9:
                run_duration = min(time_to_finish, 0.1)

            # Execute running proc
            start = current_time
            current_time += run_duration
            running_proc.remaining_time -= run_duration
            busy_time += run_duration
            timeline.append((start, current_time, running_proc.pid))

            if running_proc.remaining_time <= 1e-9:
                running_proc.remaining_time = 0.0
                running_proc.completion_time = current_time
                running_proc.turnaround_time = running_proc.completion_time - running_proc.arrival_time
                running_proc.waiting_time = running_proc.turnaround_time - running_proc.burst_time
                completed.append(running_proc)
                running_proc = None

        return self._build_result("SRTF", completed, timeline, current_time, busy_time, total_cs_time, idle_time, total_cs)

    # 4. Priority Scheduling (Preemptive)
    def run_priority(self, input_processes: List[Process]) -> SimulationResult:
        procs = self._clone_processes(input_processes)
        timeline = []
        current_time = 0.0
        ready_queue: List[Process] = []
        completed = []
        n = len(procs)
        proc_idx = 0
        procs.sort(key=lambda p: (p.arrival_time, p.pid))
        
        running_proc: Optional[Process] = None
        total_cs = 0
        total_cs_time = 0.0
        busy_time = 0.0
        idle_time = 0.0

        while len(completed) < n:
            while proc_idx < n and procs[proc_idx].arrival_time <= current_time + 1e-9:
                ready_queue.append(procs[proc_idx])
                proc_idx += 1

            if running_proc is None and not ready_queue:
                if proc_idx < n:
                    next_arrival = procs[proc_idx].arrival_time
                    timeline.append((current_time, next_arrival, "IDLE"))
                    idle_time += (next_arrival - current_time)
                    current_time = next_arrival
                    continue
                else:
                    break

            if ready_queue:
                ready_queue.sort(key=lambda p: (p.priority, p.arrival_time, p.pid))
                candidate = ready_queue[0]
            else:
                candidate = None

            if running_proc is None:
                running_proc = ready_queue.pop(0)
                if self.cs_overhead > 0:
                    timeline.append((current_time, current_time + self.cs_overhead, "CS"))
                    current_time += self.cs_overhead
                    total_cs_time += self.cs_overhead
                    total_cs += 1
                if running_proc.response_time is None:
                    running_proc.response_time = current_time - running_proc.arrival_time
            elif candidate and candidate.priority < running_proc.priority:
                ready_queue.append(running_proc)
                running_proc = ready_queue.pop(0)
                if self.cs_overhead > 0:
                    timeline.append((current_time, current_time + self.cs_overhead, "CS"))
                    current_time += self.cs_overhead
                    total_cs_time += self.cs_overhead
                    total_cs += 1
                running_proc.context_switches += 1
                if running_proc.response_time is None:
                    running_proc.response_time = current_time - running_proc.arrival_time

            time_to_finish = running_proc.remaining_time
            next_arrival_delta = (procs[proc_idx].arrival_time - current_time) if proc_idx < n else float('inf')
            run_duration = min(time_to_finish, next_arrival_delta if next_arrival_delta > 1e-9 else time_to_finish)
            if run_duration <= 1e-9:
                run_duration = min(time_to_finish, 0.1)

            start = current_time
            current_time += run_duration
            running_proc.remaining_time -= run_duration
            busy_time += run_duration
            timeline.append((start, current_time, running_proc.pid))

            if running_proc.remaining_time <= 1e-9:
                running_proc.remaining_time = 0.0
                running_proc.completion_time = current_time
                running_proc.turnaround_time = running_proc.completion_time - running_proc.arrival_time
                running_proc.waiting_time = running_proc.turnaround_time - running_proc.burst_time
                completed.append(running_proc)
                running_proc = None

        return self._build_result("Priority (Preemptive)", completed, timeline, current_time, busy_time, total_cs_time, idle_time, total_cs)

    # 5. Round Robin (RR)
    def run_round_robin(self, input_processes: List[Process], quantum: float = 2.0) -> SimulationResult:
        procs = sorted(self._clone_processes(input_processes), key=lambda p: (p.arrival_time, p.pid))
        timeline = []
        current_time = 0.0
        ready_queue: List[Process] = []
        completed = []
        n = len(procs)
        proc_idx = 0
        total_cs = 0
        total_cs_time = 0.0
        busy_time = 0.0
        idle_time = 0.0
        last_ran_pid = None

        while len(completed) < n:
            while proc_idx < n and procs[proc_idx].arrival_time <= current_time + 1e-9:
                ready_queue.append(procs[proc_idx])
                proc_idx += 1

            if not ready_queue:
                if proc_idx < n:
                    next_arrival = procs[proc_idx].arrival_time
                    timeline.append((current_time, next_arrival, "IDLE"))
                    idle_time += (next_arrival - current_time)
                    current_time = next_arrival
                    continue
                else:
                    break

            proc = ready_queue.pop(0)

            # Apply context switch if switching from another process or first dispatch
            if last_ran_pid != proc.pid:
                if self.cs_overhead > 0:
                    timeline.append((current_time, current_time + self.cs_overhead, "CS"))
                    current_time += self.cs_overhead
                    total_cs_time += self.cs_overhead
                    total_cs += 1
                last_ran_pid = proc.pid
                proc.context_switches += 1

            if proc.response_time is None:
                proc.response_time = current_time - proc.arrival_time

            run_time = min(quantum, proc.remaining_time)
            start = current_time
            current_time += run_time
            proc.remaining_time -= run_time
            busy_time += run_time
            timeline.append((start, current_time, proc.pid))

            # Catch new arrivals during this execution slice
            while proc_idx < n and procs[proc_idx].arrival_time <= current_time + 1e-9:
                ready_queue.append(procs[proc_idx])
                proc_idx += 1

            if proc.remaining_time <= 1e-9:
                proc.remaining_time = 0.0
                proc.completion_time = current_time
                proc.turnaround_time = proc.completion_time - proc.arrival_time
                proc.waiting_time = proc.turnaround_time - proc.burst_time
                completed.append(proc)
                last_ran_pid = None
            else:
                ready_queue.append(proc)

        return self._build_result(f"Round Robin (q={quantum})", completed, timeline, current_time, busy_time, total_cs_time, idle_time, total_cs)

    # 6. MLFQ (Multi-Level Feedback Queue)
    def run_mlfq(self, input_processes: List[Process], quanta: List[float] = [2.0, 4.0, 8.0], boost_interval: float = 20.0) -> SimulationResult:
        procs = sorted(self._clone_processes(input_processes), key=lambda p: (p.arrival_time, p.pid))
        timeline = []
        current_time = 0.0
        num_levels = len(quanta)
        queues: List[List[Process]] = [[] for _ in range(num_levels)]
        completed = []
        n = len(procs)
        proc_idx = 0
        total_cs = 0
        total_cs_time = 0.0
        busy_time = 0.0
        idle_time = 0.0
        last_ran_pid = None
        next_boost_time = boost_interval

        while len(completed) < n:
            # Check for priority boost
            if current_time >= next_boost_time:
                for lvl in range(1, num_levels):
                    for p in queues[lvl]:
                        p.mlfq_level = 0
                        p.mlfq_quantum_used = 0.0
                        queues[0].append(p)
                    queues[lvl].clear()
                next_boost_time = current_time + boost_interval

            while proc_idx < n and procs[proc_idx].arrival_time <= current_time + 1e-9:
                p = procs[proc_idx]
                p.mlfq_level = 0
                p.mlfq_quantum_used = 0.0
                queues[0].append(p)
                proc_idx += 1

            # Select highest priority non-empty queue
            active_queue_idx = -1
            for lvl in range(num_levels):
                if queues[lvl]:
                    active_queue_idx = lvl
                    break

            if active_queue_idx == -1:
                if proc_idx < n:
                    next_arrival = procs[proc_idx].arrival_time
                    timeline.append((current_time, next_arrival, "IDLE"))
                    idle_time += (next_arrival - current_time)
                    current_time = next_arrival
                    continue
                else:
                    break

            proc = queues[active_queue_idx].pop(0)

            if last_ran_pid != proc.pid:
                if self.cs_overhead > 0:
                    timeline.append((current_time, current_time + self.cs_overhead, "CS"))
                    current_time += self.cs_overhead
                    total_cs_time += self.cs_overhead
                    total_cs += 1
                last_ran_pid = proc.pid
                proc.context_switches += 1

            if proc.response_time is None:
                proc.response_time = current_time - proc.arrival_time

            lvl_quantum = quanta[active_queue_idx]
            run_time = min(lvl_quantum, proc.remaining_time)
            start = current_time
            current_time += run_time
            proc.remaining_time -= run_time
            busy_time += run_time
            timeline.append((start, current_time, proc.pid))

            while proc_idx < n and procs[proc_idx].arrival_time <= current_time + 1e-9:
                p = procs[proc_idx]
                p.mlfq_level = 0
                p.mlfq_quantum_used = 0.0
                queues[0].append(p)
                proc_idx += 1

            if proc.remaining_time <= 1e-9:
                proc.remaining_time = 0.0
                proc.completion_time = current_time
                proc.turnaround_time = proc.completion_time - proc.arrival_time
                proc.waiting_time = proc.turnaround_time - proc.burst_time
                completed.append(proc)
                last_ran_pid = None
            else:
                # Demote if exhausted quantum
                if run_time >= lvl_quantum:
                    next_lvl = min(active_queue_idx + 1, num_levels - 1)
                    proc.mlfq_level = next_lvl
                    queues[next_lvl].append(proc)
                else:
                    queues[active_queue_idx].append(proc)

        return self._build_result("MLFQ", completed, timeline, current_time, busy_time, total_cs_time, idle_time, total_cs)

    # 7. ADAPT-CS (Proposed Novel Algorithm)
    def run_adapt_cs(
        self,
        input_processes: List[Process],
        base_quantum: float = 3.0,
        theta_base: float = 1.0,        # Base hysteresis resistance
        finish_thresh: float = 2.0,      # Finish threshold delta
        k_finish: float = 5.0,           # Anti-preemption bonus near completion
        k_hog: float = 1.2,              # Anti-hog decay
        q_max: float = 8.0,              # Hard preemption ceiling
        aging_exponent: float = 1.3      # Wait time exponent for anti-starvation
    ) -> SimulationResult:
        """
        ADAPT-CS: Adaptive Dynamic Affinity & Preemption Thresholding CPU Scheduler.
        
        Scoring Function:
        U(P_j, t) = (W_j(t) ^ aging_exponent / (1 + remaining_j)) * PriorityWeight * InteractivityBonus
        
        Preemption Barrier for running process P_curr:
        Theta(P_curr, t) = theta_base * CS_overhead + FinishBonus - HogPenalty
        
        Decision Rule:
        Preempt IF:
           (U(P_best) - U(P_curr) > Theta(P_curr, t)) OR (executed_in_slice >= q_max)
        """
        procs = sorted(self._clone_processes(input_processes), key=lambda p: (p.arrival_time, p.pid))
        timeline = []
        current_time = 0.0
        ready_queue: List[Process] = []
        completed = []
        n = len(procs)
        proc_idx = 0
        total_cs = 0
        total_cs_time = 0.0
        busy_time = 0.0
        idle_time = 0.0
        
        running_proc: Optional[Process] = None
        executed_in_slice = 0.0

        def calc_urgency(p: Process, t: float) -> float:
            wait_time = max(0.0, t - p.arrival_time - (p.burst_time - p.remaining_time))
            # Shorter remaining jobs have higher baseline priority (SRTF heuristic)
            est_rem = max(0.5, p.remaining_time)
            # Priority scaling: priority 1 is highest, say range 1 to 5
            prio_weight = 1.0 + 0.5 * max(0, 5 - p.priority)
            # Interactive bonus
            interact_bonus = 1.5 if p.process_type == "interactive" else 1.0
            # Aging superlinear
            urgency = ((1.0 + wait_time) ** aging_exponent / est_rem) * prio_weight * interact_bonus
            return urgency

        def calc_barrier(curr: Process, slice_exec: float) -> float:
            # Base context switch friction
            barrier = theta_base * max(self.cs_overhead, 0.5)
            # Almost-finished bonus: if remaining time is small, do not preempt!
            if curr.remaining_time <= finish_thresh:
                barrier += k_finish * (1.0 - (curr.remaining_time / finish_thresh))
            # Anti-hog penalty: as it runs more, barrier drops
            barrier -= k_hog * ((slice_exec / base_quantum) ** 2)
            return barrier

        while len(completed) < n:
            # Enqueue newly arrived processes
            while proc_idx < n and procs[proc_idx].arrival_time <= current_time + 1e-9:
                ready_queue.append(procs[proc_idx])
                proc_idx += 1

            if running_proc is None and not ready_queue:
                if proc_idx < n:
                    next_arrival = procs[proc_idx].arrival_time
                    timeline.append((current_time, next_arrival, "IDLE"))
                    idle_time += (next_arrival - current_time)
                    current_time = next_arrival
                    continue
                else:
                    break

            # If no running process, select highest urgency from ready_queue
            if running_proc is None:
                ready_queue.sort(key=lambda p: calc_urgency(p, current_time), reverse=True)
                running_proc = ready_queue.pop(0)
                executed_in_slice = 0.0
                if self.cs_overhead > 0:
                    timeline.append((current_time, current_time + self.cs_overhead, "CS"))
                    current_time += self.cs_overhead
                    total_cs_time += self.cs_overhead
                    total_cs += 1
                running_proc.context_switches += 1
                if running_proc.response_time is None:
                    running_proc.response_time = current_time - running_proc.arrival_time

            # Check preemption condition
            # We determine how long running_proc can run until:
            # 1. It finishes
            # 2. It hits q_max
            # 3. A new arrival occurs
            # 4. A nominal quantum slice expires (step check)
            
            # Step evaluation interval (e.g. 0.5 time units or base_quantum)
            eval_interval = min(base_quantum, 1.0)
            next_arrival_time = procs[proc_idx].arrival_time if proc_idx < n else float('inf')
            
            time_to_arrival = max(0.0, next_arrival_time - current_time) if next_arrival_time > current_time else float('inf')
            time_to_finish = running_proc.remaining_time
            time_to_qmax = max(0.0, q_max - executed_in_slice)
            
            step = min(eval_interval, time_to_finish, time_to_qmax)
            if time_to_arrival > 1e-9 and time_to_arrival < step:
                step = time_to_arrival

            if step <= 1e-9:
                step = min(0.1, time_to_finish)

            start = current_time
            current_time += step
            running_proc.remaining_time -= step
            executed_in_slice += step
            busy_time += step
            timeline.append((start, current_time, running_proc.pid))

            # Catch arrivals
            while proc_idx < n and procs[proc_idx].arrival_time <= current_time + 1e-9:
                ready_queue.append(procs[proc_idx])
                proc_idx += 1

            # Check if running_proc completed
            if running_proc.remaining_time <= 1e-9:
                running_proc.remaining_time = 0.0
                running_proc.completion_time = current_time
                running_proc.turnaround_time = running_proc.completion_time - running_proc.arrival_time
                running_proc.waiting_time = running_proc.turnaround_time - running_proc.burst_time
                completed.append(running_proc)
                running_proc = None
                executed_in_slice = 0.0
                continue

            # If ready queue is not empty, evaluate preemption
            if ready_queue:
                # Find best candidate
                candidate = max(ready_queue, key=lambda p: calc_urgency(p, current_time))
                u_cand = calc_urgency(candidate, current_time)
                u_curr = calc_urgency(running_proc, current_time)
                barrier = calc_barrier(running_proc, executed_in_slice)

                # Preempt if hard ceiling reached or candidate urgency overcomes barrier
                should_preempt = (executed_in_slice >= q_max) or ((u_cand - u_curr) > barrier)
                
                # Check near-finish safeguard
                if running_proc.remaining_time <= min(finish_thresh, 1.5) and executed_in_slice < q_max:
                    should_preempt = False

                if should_preempt:
                    ready_queue.append(running_proc)
                    ready_queue.remove(candidate)
                    running_proc = candidate
                    executed_in_slice = 0.0
                    if self.cs_overhead > 0:
                        timeline.append((current_time, current_time + self.cs_overhead, "CS"))
                        current_time += self.cs_overhead
                        total_cs_time += self.cs_overhead
                        total_cs += 1
                    running_proc.context_switches += 1
                    if running_proc.response_time is None:
                        running_proc.response_time = current_time - running_proc.arrival_time

        return self._build_result("ADAPT-CS", completed, timeline, current_time, busy_time, total_cs_time, idle_time, total_cs)

    def _build_result(
        self,
        name: str,
        completed: List[Process],
        timeline: List[Tuple[float, float, str]],
        total_time: float,
        busy_time: float,
        cs_time: float,
        idle_time: float,
        total_cs: int
    ) -> SimulationResult:
        completed.sort(key=lambda p: p.pid)
        n = len(completed)
        avg_wait = sum(p.waiting_time for p in completed) / n if n else 0.0
        avg_tat = sum(p.turnaround_time for p in completed) / n if n else 0.0
        avg_resp = sum(p.response_time for p in completed if p.response_time is not None) / n if n else 0.0
        cpu_util = (busy_time / total_time * 100.0) if total_time > 0 else 0.0
        throughput = (n / total_time) if total_time > 0 else 0.0
        jains = compute_jains_fairness(completed)

        proc_results = [
            {
                "pid": p.pid,
                "arrival": p.arrival_time,
                "burst": p.burst_time,
                "priority": p.priority,
                "type": p.process_type,
                "waiting": round(p.waiting_time, 2),
                "turnaround": round(p.turnaround_time, 2),
                "response": round(p.response_time if p.response_time is not None else 0.0, 2),
                "switches": p.context_switches
            }
            for p in completed
        ]

        return SimulationResult(
            algorithm_name=name,
            total_time=round(total_time, 2),
            busy_time=round(busy_time, 2),
            context_switch_time=round(cs_time, 2),
            idle_time=round(idle_time, 2),
            total_context_switches=total_cs,
            avg_waiting_time=round(avg_wait, 2),
            avg_turnaround_time=round(avg_tat, 2),
            avg_response_time=round(avg_resp, 2),
            cpu_utilization=round(cpu_util, 2),
            throughput=round(throughput, 4),
            jains_fairness_index=round(jains, 4),
            process_results=proc_results,
            execution_timeline=timeline
        )

"""
Concrete 5-Process Trace and Direct Comparison across Algorithms
"""

from scheduler_sim import Process, SchedulerSimulator

def run_concrete_example():
    # 5 Concrete Processes
    processes = [
        Process("P1", arrival_time=0.0, burst_time=8.0, priority=3, process_type="cpu"),
        Process("P2", arrival_time=1.0, burst_time=4.0, priority=1, process_type="interactive"),
        Process("P3", arrival_time=2.0, burst_time=2.0, priority=2, process_type="interactive"),
        Process("P4", arrival_time=3.0, burst_time=1.0, priority=3, process_type="interactive"),
        Process("P5", arrival_time=4.0, burst_time=6.0, priority=2, process_type="cpu"),
    ]

    sim = SchedulerSimulator(context_switch_overhead=0.5)
    
    algs = [
        ("FCFS", lambda: sim.run_fcfs(processes)),
        ("SJF (Non-preemptive)", lambda: sim.run_sjf(processes)),
        ("SRTF", lambda: sim.run_srtf(processes)),
        ("Priority (Preemptive)", lambda: sim.run_priority(processes)),
        ("Round Robin (q=2)", lambda: sim.run_round_robin(processes, quantum=2.0)),
        ("MLFQ", lambda: sim.run_mlfq(processes)),
        ("ADAPT-CS", lambda: sim.run_adapt_cs(processes, base_quantum=3.0, theta_base=1.2, finish_thresh=2.0, k_finish=5.0, k_hog=1.2, q_max=8.0, aging_exponent=1.3)),
    ]

    print("====================================================================================================")
    print("CONCRETE 5-PROCESS TRACE & COMPREHENSIVE BENCHMARK")
    print("Workload: P1(0, 8, prio 3, CPU), P2(1, 4, prio 1, Int), P3(2, 2, prio 2, Int), P4(3, 1, prio 3, Int), P5(4, 6, prio 2, CPU)")
    print("Context Switch Overhead = 0.5 time units")
    print("====================================================================================================")

    results = {}
    for name, runner in algs:
        res = runner()
        results[name] = res
        print(f"\n--- {name} ---")
        print(f"Total Time: {res.total_time:.1f} | Busy: {res.busy_time:.1f} | CS Time: {res.context_switch_time:.1f} | Idle: {res.idle_time:.1f}")
        print(f"Context Switches: {res.total_context_switches} | Avg Waiting: {res.avg_waiting_time:.2f} | Avg Turnaround: {res.avg_turnaround_time:.2f} | Avg Response: {res.avg_response_time:.2f}")
        print(f"CPU Utilization: {res.cpu_utilization:.1f}% | Throughput: {res.throughput:.4f} | Jain's Fairness: {res.jains_fairness_index:.4f}")
        print("Process Breakdown:")
        print(f"  {'PID':<5} | {'Arrival':>7} | {'Burst':>6} | {'Waiting':>8} | {'Turnaround':>11} | {'Response':>9} | {'Switches':>8}")
        for p in res.process_results:
            print(f"  {p['pid']:<5} | {p['arrival']:7.1f} | {p['burst']:6.1f} | {p['waiting']:8.2f} | {p['turnaround']:11.2f} | {p['response']:9.2f} | {p['switches']:8d}")
        
        # Print timeline segments
        print("Execution Timeline:")
        timeline_str = " -> ".join([f"[{start:.1f}-{end:.1f}: {who}]" for start, end, who in res.execution_timeline])
        print("  " + timeline_str)

    return results

if __name__ == "__main__":
    run_concrete_example()

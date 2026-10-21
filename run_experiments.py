"""
Comprehensive Evaluation and Benchmarking Suite for CPU Scheduling Algorithms.
Runs 5 Distinct Workload Scenarios, Performs Sensitivity Analysis,
and Generates Publication-Grade Visualizations.
"""

import os
import random
import numpy as np
import matplotlib.pyplot as plt
from typing import List, Dict
from scheduler_sim import Process, SchedulerSimulator, SimulationResult

# Set plot aesthetics
plt.style.use('seaborn-v0_8-whitegrid' if 'seaborn-v0_8-whitegrid' in plt.style.available else 'default')
plt.rcParams['font.sans-serif'] = 'DejaVu Sans'
plt.rcParams['axes.edgecolor'] = '#cccccc'
plt.rcParams['axes.linewidth'] = 0.8

CHARTS_DIR = "/home/suyashpatkar/Desktop/k/generated_charts"
os.makedirs(CHARTS_DIR, exist_ok=True)

# -------------------------------------------------------------
# WORKLOAD GENERATORS
# -------------------------------------------------------------

def generate_cpu_bound_workload(n: int = 20, seed: int = 42) -> List[Process]:
    """Workload 1: Mostly CPU-bound processes (large compute bursts, sparse arrivals)."""
    random.seed(seed)
    procs = []
    t = 0.0
    for i in range(n):
        t += random.uniform(1.0, 5.0)
        burst = random.uniform(15.0, 40.0)
        prio = random.randint(1, 5)
        procs.append(Process(f"P{i+1:02d}", arrival_time=round(t, 2), burst_time=round(burst, 2), priority=prio, process_type="cpu"))
    return procs

def generate_interactive_workload(n: int = 25, seed: int = 42) -> List[Process]:
    """Workload 2: Mostly short/interactive processes (small bursts, frequent arrivals)."""
    random.seed(seed)
    procs = []
    t = 0.0
    for i in range(n):
        t += float(np.random.exponential(1.5))
        burst = random.uniform(1.0, 5.0)
        prio = random.randint(1, 3)
        procs.append(Process(f"P{i+1:02d}", arrival_time=round(t, 2), burst_time=round(burst, 2), priority=prio, process_type="interactive"))
    return procs

def generate_mixed_workload(n: int = 30, seed: int = 42) -> List[Process]:
    """Workload 3: Mixed workload (65% interactive, 35% CPU-bound)."""
    random.seed(seed)
    procs = []
    t = 0.0
    for i in range(n):
        t += float(np.random.exponential(2.0))
        is_interactive = (random.random() < 0.65)
        if is_interactive:
            burst = random.uniform(1.0, 6.0)
            prio = random.randint(1, 3)
            ptype = "interactive"
        else:
            burst = random.uniform(15.0, 35.0)
            prio = random.randint(3, 5)
            ptype = "cpu"
        procs.append(Process(f"P{i+1:02d}", arrival_time=round(t, 2), burst_time=round(burst, 2), priority=prio, process_type=ptype))
    return procs

def generate_high_arrival_workload(n: int = 30, seed: int = 42) -> List[Process]:
    """Workload 4: High process arrival rate (bursty arrivals, heavy queue congestion)."""
    random.seed(seed)
    procs = []
    t = 0.0
    for i in range(n):
        t += random.uniform(0.1, 0.8) # Rapid arrivals
        burst = random.uniform(3.0, 15.0)
        prio = random.randint(1, 5)
        ptype = "interactive" if random.random() < 0.5 else "cpu"
        procs.append(Process(f"P{i+1:02d}", arrival_time=round(t, 2), burst_time=round(burst, 2), priority=prio, process_type=ptype))
    return procs

def generate_heavy_tailed_workload(n: int = 25, seed: int = 42) -> List[Process]:
    """Workload 5: Heavy-tailed burst distribution (Pareto-distributed burst times)."""
    random.seed(seed)
    procs = []
    t = 0.0
    for i in range(n):
        t += float(np.random.exponential(2.5))
        # Pareto distribution: alpha = 1.3, x_m = 2.0
        burst = min(60.0, (np.random.pareto(1.3) + 1) * 2.0)
        prio = random.randint(1, 5)
        ptype = "cpu" if burst > 10.0 else "interactive"
        procs.append(Process(f"P{i+1:02d}", arrival_time=round(t, 2), burst_time=round(burst, 2), priority=prio, process_type=ptype))
    return procs

# -------------------------------------------------------------
# BENCHMARK RUNNER
# -------------------------------------------------------------

def evaluate_all_algorithms(processes: List[Process], cs_overhead: float = 0.5) -> Dict[str, SimulationResult]:
    sim = SchedulerSimulator(context_switch_overhead=cs_overhead)
    algs = {
        "FCFS": lambda: sim.run_fcfs(processes),
        "SJF": lambda: sim.run_sjf(processes),
        "SRTF": lambda: sim.run_srtf(processes),
        "Priority": lambda: sim.run_priority(processes),
        "RR (q=2)": lambda: sim.run_round_robin(processes, quantum=2.0),
        "RR (q=4)": lambda: sim.run_round_robin(processes, quantum=4.0),
        "MLFQ": lambda: sim.run_mlfq(processes, quanta=[2.0, 4.0, 8.0], boost_interval=25.0),
        "ADAPT-CS": lambda: sim.run_adapt_cs(processes, base_quantum=3.0, theta_base=1.2, finish_thresh=2.0, k_finish=5.0, k_hog=1.2, q_max=8.0, aging_exponent=1.3)
    }
    
    results = {}
    for name, runner in algs.items():
        results[name] = runner()
    return results

def run_all_benchmarks():
    workloads = {
        "CPU-Bound": generate_cpu_bound_workload(),
        "Interactive": generate_interactive_workload(),
        "Mixed": generate_mixed_workload(),
        "High Arrival Rate": generate_high_arrival_workload(),
        "Heavy-Tailed (Pareto)": generate_heavy_tailed_workload()
    }

    all_results = {}
    print("=" * 100)
    print("BENCHMARK EXECUTION ACROSS 5 WORKLOAD ARCHETYPES")
    print("=" * 100)

    for w_name, procs in workloads.items():
        print(f"\n>>> Running Workload: {w_name} ({len(procs)} processes, Total Burst: {sum(p.burst_time for p in procs):.1f})")
        res = evaluate_all_algorithms(procs, cs_overhead=0.5)
        all_results[w_name] = res
        
        # Print table
        header = f"{'Algorithm':<14} | {'CS':>4} | {'Avg Wait':>9} | {'Avg TAT':>9} | {'Avg Resp':>9} | {'CPU Util':>8} | {'Throughput':>10} | {'Fairness':>8}"
        print("-" * len(header))
        print(header)
        print("-" * len(header))
        for alg_name, r in res.items():
            print(f"{alg_name:<14} | {r.total_context_switches:4d} | {r.avg_waiting_time:9.2f} | {r.avg_turnaround_time:9.2f} | {r.avg_response_time:9.2f} | {r.cpu_utilization:7.1f}% | {r.throughput:10.4f} | {r.jains_fairness_index:8.4f}")
        print("-" * len(header))

    return all_results

# -------------------------------------------------------------
# GRAPH GENERATION
# -------------------------------------------------------------

def generate_comparison_charts(all_results: Dict[str, Dict[str, SimulationResult]]):
    # Colors for algorithms
    colors = {
        "FCFS": "#4A5568",
        "SJF": "#718096",
        "SRTF": "#E53E3E",
        "Priority": "#DD6B20",
        "RR (q=2)": "#3182CE",
        "RR (q=4)": "#63B3ED",
        "MLFQ": "#805AD5",
        "ADAPT-CS": "#38A169" # Distinct vibrant emerald green for proposed algorithm
    }
    alg_names = list(colors.keys())

    # We will generate individual high-res figures for the 5 key metrics requested by prompt:
    # 1. Context switches vs algorithm
    # 2. Average waiting time vs algorithm
    # 3. Average response time vs algorithm
    # 4. Turnaround time vs algorithm
    # 5. CPU utilization vs algorithm
    
    # We will plot across Mixed Workload and summary across all workloads
    mixed_res = all_results["Mixed"]
    
    metrics = [
        ("total_context_switches", "Context Switches", "Number of Context Switches (Lower is Better)", "context_switches_comparison.png", False),
        ("avg_waiting_time", "Average Waiting Time", "Waiting Time in Time Units (Lower is Better)", "waiting_time_comparison.png", False),
        ("avg_response_time", "Average Response Time", "Response Time in Time Units (Lower is Better)", "response_time_comparison.png", False),
        ("avg_turnaround_time", "Average Turnaround Time", "Turnaround Time in Time Units (Lower is Better)", "turnaround_time_comparison.png", False),
        ("cpu_utilization", "CPU Utilization (%)", "CPU Utilization Percentage (Higher is Better)", "cpu_utilization_comparison.png", True)
    ]

    for attr, title, ylabel, filename, higher_better in metrics:
        fig, ax = plt.subplots(figsize=(10, 5.5), dpi=300)
        vals = [getattr(mixed_res[alg], attr) for alg in alg_names]
        bar_colors = [colors[alg] for alg in alg_names]
        
        bars = ax.bar(alg_names, vals, color=bar_colors, width=0.6, edgecolor="#2d3748", linewidth=1.2)
        ax.set_title(f"{title} (Mixed Workload Benchmark)", fontsize=14, fontweight="bold", pad=15)
        ax.set_ylabel(ylabel, fontsize=11, fontweight="medium")
        ax.grid(axis='y', linestyle='--', alpha=0.5)
        
        # Annotate values on top of bars
        for bar in bars:
            height = bar.get_height()
            format_str = f"{height:.1f}%" if "%" in ylabel else (f"{int(height)}" if attr == "total_context_switches" else f"{height:.1f}")
            ax.annotate(format_str,
                        xy=(bar.get_x() + bar.get_width() / 2, height),
                        xytext=(0, 4),
                        textcoords="offset points",
                        ha='center', va='bottom', fontsize=10, fontweight='bold')
        
        # Highlight ADAPT-CS
        adapt_idx = alg_names.index("ADAPT-CS")
        bars[adapt_idx].set_edgecolor("#1C4532")
        bars[adapt_idx].set_linewidth(2.0)

        plt.xticks(rotation=15, ha='right', fontsize=10, fontweight='medium')
        plt.tight_layout()
        out_path = os.path.join(CHARTS_DIR, filename)
        plt.savefig(out_path)
        plt.close()
        print(f"Saved: {out_path}")

    # Multipanel Comprehensive Comparison across All 5 Workloads
    fig, axes = plt.subplots(2, 3, figsize=(18, 10), dpi=300)
    w_keys = list(all_results.keys())
    
    # Panel for each workload comparing Turnaround Time & Context Switches
    for i, w_key in enumerate(w_keys):
        row = i // 3
        col = i % 3
        ax = axes[row, col]
        w_data = all_results[w_key]
        
        x = np.arange(len(alg_names))
        width = 0.38
        
        tat_vals = [w_data[alg].avg_turnaround_time for alg in alg_names]
        cs_vals = [w_data[alg].total_context_switches for alg in alg_names]
        
        ax.bar(x - width/2, tat_vals, width, label='Avg Turnaround Time', color='#4299E1', edgecolor='#2B6CB0')
        ax2 = ax.twinx()
        ax2.bar(x + width/2, cs_vals, width, label='Context Switches', color='#ED8936', edgecolor='#C05621')
        
        ax.set_title(f"Workload: {w_key}", fontsize=12, fontweight='bold')
        ax.set_xticks(x)
        ax.set_xticklabels(alg_names, rotation=35, ha='right', fontsize=8)
        ax.set_ylabel('Turnaround Time', color='#2B6CB0', fontsize=9)
        ax2.set_ylabel('Context Switches', color='#C05621', fontsize=9)
        ax.grid(axis='y', linestyle=':', alpha=0.4)
        ax2.grid(False)

    # 6th panel: Jain's Fairness Index Comparison
    ax = axes[1, 2]
    fairness_matrix = []
    for alg in alg_names:
        row_f = [all_results[w_key][alg].jains_fairness_index for w_key in w_keys]
        fairness_matrix.append(np.mean(row_f))
    
    bars = ax.bar(alg_names, fairness_matrix, color=[colors[a] for a in alg_names], edgecolor='#2d3748', width=0.6)
    ax.set_title("Mean Fairness (Jain's Index across all 5 Workloads)", fontsize=12, fontweight='bold')
    ax.set_ylabel("Jain's Fairness Index (Higher is Better)", fontsize=9)
    ax.set_ylim(0.6, 1.02)
    ax.set_xticklabels(alg_names, rotation=35, ha='right', fontsize=8)
    for b in bars:
        h = b.get_height()
        ax.annotate(f"{h:.3f}", xy=(b.get_x() + b.get_width()/2, h), xytext=(0, 3), textcoords="offset points", ha='center', fontsize=8, fontweight='bold')

    plt.tight_layout()
    multipanel_path = os.path.join(CHARTS_DIR, "comprehensive_workload_matrix.png")
    plt.savefig(multipanel_path)
    plt.close()
    print(f"Saved: {multipanel_path}")

# -------------------------------------------------------------
# SENSITIVITY ANALYSIS
# -------------------------------------------------------------

def run_sensitivity_analysis():
    print("\n" + "=" * 100)
    print("RUNNING ADAPT-CS SENSITIVITY ANALYSIS")
    print("=" * 100)
    
    test_procs = generate_mixed_workload(30, seed=101)
    sim = SchedulerSimulator(context_switch_overhead=0.5)

    # 1. Sensitivity to Theta_Base (Hysteresis Barrier)
    theta_vals = [0.0, 0.5, 1.0, 1.5, 2.0, 3.0, 4.0, 5.0]
    theta_cs = []
    theta_wait = []
    theta_tat = []
    
    for th in theta_vals:
        res = sim.run_adapt_cs(test_procs, theta_base=th)
        theta_cs.append(res.total_context_switches)
        theta_wait.append(res.avg_waiting_time)
        theta_tat.append(res.avg_turnaround_time)

    # 2. Sensitivity to Finish Threshold Delta (Near-completion protection)
    finish_vals = [0.0, 0.5, 1.0, 1.5, 2.0, 2.5, 3.5, 5.0]
    finish_cs = []
    finish_tat = []
    for f in finish_vals:
        res = sim.run_adapt_cs(test_procs, finish_thresh=f)
        finish_cs.append(res.total_context_switches)
        finish_tat.append(res.avg_turnaround_time)

    # 3. Sensitivity to Aging Exponent (Anti-starvation)
    aging_vals = [0.8, 1.0, 1.2, 1.4, 1.6, 2.0, 2.5]
    aging_fairness = []
    aging_resp = []
    for a in aging_vals:
        res = sim.run_adapt_cs(test_procs, aging_exponent=a)
        aging_fairness.append(res.jains_fairness_index)
        aging_resp.append(res.avg_response_time)

    # 4. Sensitivity to Context Switch Overhead C_cs
    cs_costs = [0.0, 0.2, 0.5, 0.8, 1.2, 1.6, 2.0]
    cs_rr_util = []
    cs_adapt_util = []
    cs_rr_tat = []
    cs_adapt_tat = []
    for csc in cs_costs:
        s = SchedulerSimulator(context_switch_overhead=csc)
        r_rr = s.run_round_robin(test_procs, quantum=2.0)
        r_ad = s.run_adapt_cs(test_procs)
        cs_rr_util.append(r_rr.cpu_utilization)
        cs_adapt_util.append(r_ad.cpu_utilization)
        cs_rr_tat.append(r_rr.avg_turnaround_time)
        cs_adapt_tat.append(r_ad.avg_turnaround_time)

    # Plot Sensitivity 4-panel figure
    fig, axes = plt.subplots(2, 2, figsize=(14, 10), dpi=300)
    
    # Panel 1: Theta_base
    ax1 = axes[0, 0]
    ax1.plot(theta_vals, theta_cs, 'o-', color='#E53E3E', label='Context Switches', linewidth=2)
    ax1.set_xlabel('Hysteresis Multiplier (theta_base)', fontsize=10)
    ax1.set_ylabel('Total Context Switches', color='#E53E3E', fontsize=10)
    ax1_twin = ax1.twinx()
    ax1_twin.plot(theta_vals, theta_wait, 's--', color='#3182CE', label='Avg Waiting Time', linewidth=2)
    ax1_twin.set_ylabel('Avg Waiting Time', color='#3182CE', fontsize=10)
    ax1.set_title("Sensitivity 1: Hysteresis Barrier vs Context Switches & Wait", fontsize=11, fontweight='bold')
    ax1.grid(True, linestyle=':', alpha=0.5)

    # Panel 2: Finish Threshold Delta
    ax2 = axes[0, 1]
    ax2.plot(finish_vals, finish_cs, 'o-', color='#805AD5', label='Context Switches', linewidth=2)
    ax2.set_xlabel('Finish Protection Threshold delta_finish', fontsize=10)
    ax2.set_ylabel('Total Context Switches', color='#805AD5', fontsize=10)
    ax2_twin = ax2.twinx()
    ax2_twin.plot(finish_vals, finish_tat, 'd--', color='#38A169', label='Avg Turnaround Time', linewidth=2)
    ax2_twin.set_ylabel('Avg Turnaround Time', color='#38A169', fontsize=10)
    ax2.set_title("Sensitivity 2: Tail Finish Protection vs Turnaround & Switches", fontsize=11, fontweight='bold')
    ax2.grid(True, linestyle=':', alpha=0.5)

    # Panel 3: Aging Exponent
    ax3 = axes[1, 0]
    ax3.plot(aging_vals, aging_fairness, '^-', color='#DD6B20', label="Jain's Fairness", linewidth=2)
    ax3.set_xlabel('Aging Exponent (gamma)', fontsize=10)
    ax3.set_ylabel("Jain's Fairness Index", color='#DD6B20', fontsize=10)
    ax3_twin = ax3.twinx()
    ax3_twin.plot(aging_vals, aging_resp, 'v--', color='#4A5568', label='Avg Response Time', linewidth=2)
    ax3_twin.set_ylabel('Avg Response Time', color='#4A5568', fontsize=10)
    ax3.set_title("Sensitivity 3: Aging Exponent vs Fairness & Response Time", fontsize=11, fontweight='bold')
    ax3.grid(True, linestyle=':', alpha=0.5)

    # Panel 4: Hardware Context Switch Overhead impact on Utilization (RR vs ADAPT-CS)
    ax4 = axes[1, 1]
    ax4.plot(cs_costs, cs_rr_util, 'x--', color='#3182CE', label='Round Robin (q=2) Util', linewidth=2)
    ax4.plot(cs_costs, cs_adapt_util, 'o-', color='#38A169', label='ADAPT-CS Util', linewidth=2.5)
    ax4.set_xlabel('Context Switch Overhead C_cs (Time units)', fontsize=10)
    ax4.set_ylabel('CPU Utilization (%)', fontsize=10)
    ax4.set_title("Sensitivity 4: Resilience to Increasing Context Switch Overhead", fontsize=11, fontweight='bold')
    ax4.legend(loc='lower left', frameon=True)
    ax4.grid(True, linestyle=':', alpha=0.5)

    plt.tight_layout()
    sens_path = os.path.join(CHARTS_DIR, "sensitivity_analysis_matrix.png")
    plt.savefig(sens_path)
    plt.close()
    print(f"Saved: {sens_path}")

# -------------------------------------------------------------
# MAIN
# -------------------------------------------------------------

if __name__ == "__main__":
    all_res = run_all_benchmarks()
    generate_comparison_charts(all_res)
    run_sensitivity_analysis()
    print("\nAll experiments, table outputs, and figures generated successfully!")

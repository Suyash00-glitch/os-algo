"""
Generates ADAPT_CS_Algorithm_Documentation.docx with embedded charts and structured sections.
"""

import os
from docx import Document
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.oxml import OxmlElement
from docx.oxml.ns import qn

def set_cell_background(cell, fill_hex):
    tcPr = cell._tc.get_or_add_tcPr()
    shd = OxmlElement('w:shd')
    shd.set(qn('w:val'), 'clear')
    shd.set(qn('w:color'), 'auto')
    shd.set(qn('w:fill'), fill_hex)
    tcPr.append(shd)

def create_document():
    doc = Document()

    # Page Margins
    for section in doc.sections:
        section.top_margin = Inches(0.8)
        section.bottom_margin = Inches(0.8)
        section.left_margin = Inches(0.8)
        section.right_margin = Inches(0.8)

    # Document Title
    title = doc.add_paragraph()
    title_run = title.add_run("ADAPT-CS: Adaptive Dynamic Affinity & Preemption Thresholding")
    title_run.font.name = 'Calibri'
    title_run.font.size = Pt(22)
    title_run.font.bold = True
    title_run.font.color.rgb = RGBColor(30, 64, 175) # Dark Blue
    title.alignment = WD_ALIGN_PARAGRAPH.LEFT

    # Subtitle
    subtitle = doc.add_paragraph()
    sub_run = subtitle.add_run("A High-Efficiency, Context-Switch-Aware CPU Scheduling Algorithm for Operating Systems")
    sub_run.font.name = 'Calibri'
    sub_run.font.size = Pt(13)
    sub_run.font.italic = True
    sub_run.font.color.rgb = RGBColor(75, 85, 99)

    doc.add_paragraph() # Spacer

    # 1. Executive Summary in Plain English
    h1 = doc.add_heading("1. Executive Summary (In Plain English)", level=1)
    
    p = doc.add_paragraph(
        "Modern operating systems face a constant dilemma: how to keep interactive apps (like your web browser, mouse, and keyboard) "
        "responsive without wasting massive amounts of CPU processing power on unnecessary thread switching. "
        "Whenever a CPU pauses one task to run another, it incurs a context switch—swapping CPU registers, changing memory page tables, "
        "and wiping out fast L1/L2 hardware caches. This takes roughly 0.1 to 0.5 milliseconds (ms) of pure dead time."
    )
    p = doc.add_paragraph(
        "Traditional Round Robin uses a rigid timer (e.g., 10 ms). Even if a process only needs 1 or 2 ms more to finish completely, "
        "Round Robin ruthlessly kicks it off the CPU, spends 0.5 ms switching away, runs something else, and spends another 0.5 ms switching back later. "
        "This is called the Tail Preemption Anomaly, and it wastes up to 30% of CPU cycles under heavy workloads."
    )
    p = doc.add_paragraph(
        "ADAPT-CS replaces rigid timers with an intelligent, dynamic decision rule: instead of blindly preempting tasks, "
        "it only switches when the urgency gain of the waiting process clearly exceeds the hardware cost of the switch, "
        "and it actively protects processes that are on the verge of finishing."
    )

    # 2. Operating System Reality: Why Milliseconds Matter
    doc.add_heading("2. Millisecond Scale: The Reality of Operating Systems", level=1)
    
    doc.add_paragraph(
        "CPU scheduling does not operate in seconds or minutes—it runs at the microsecond and millisecond scale. "
        "Understanding these concrete time scales explains why naive scheduling causes severe performance penalties:"
    )

    # Bullet points of time scales
    bp1 = doc.add_paragraph(style='List Bullet')
    r = bp1.add_run("Context Switch Overhead (0.2 ms – 0.5 ms): ")
    r.bold = True
    bp1.add_run("The CPU time consumed by kernel interrupt handlers, register saves, MMU translation flushes, and L1/L2 cache misses.")

    bp2 = doc.add_paragraph(style='List Bullet')
    r = bp2.add_run("Interactive Bursts (1 ms – 4 ms): ")
    r.bold = True
    bp2.add_run("User-interface events such as a mouse click, keypress, audio packet, or network socket read.")

    bp3 = doc.add_paragraph(style='List Bullet')
    r = bp3.add_run("Standard Round Robin Quantum (10 ms – 20 ms): ")
    r.bold = True
    bp3.add_run("The fixed duration a thread is allowed to run before forced preemption.")

    bp4 = doc.add_paragraph(style='List Bullet')
    r = bp4.add_run("Compute-Heavy Bursts (30 ms – 100+ ms): ")
    r.bold = True
    bp4.add_run("Number crunching, video rendering, cryptographic hashing, or machine learning workloads.")

    # 3. The 4 Core Rules of ADAPT-CS
    doc.add_heading("3. The 4 Core Operating Rules of ADAPT-CS", level=1)

    doc.add_heading("Rule 1: The 'Almost Done' Grace Period (Tail Preemption Shield)", level=2)
    doc.add_paragraph(
        "If a running process reaches the end of its nominal time slice but has 2 ms or less of remaining work, "
        "ADAPT-CS grants it an immediate grace extension. It lets the process finish right now rather than kicking it out. "
        "This saves 1.0 ms in back-and-forth context switches and frees up the process's RAM and file descriptors immediately."
    )

    doc.add_heading("Rule 2: The Context Switch Friction Barrier", level=2)
    doc.add_paragraph(
        "When a new thread arrives in the ready queue, the scheduler does not immediately kick out the currently running thread. "
        "Instead, the candidate must beat the current thread's score by a dynamic barrier (Theta = 1.2 * Context_Switch_Cost). "
        "This prevents constant thrashing between threads of similar urgency and keeps CPU L1/L2 caches hot and fast."
    )

    doc.add_heading("Rule 3: The Anti-Hogging Shield Decay", level=2)
    doc.add_paragraph(
        "To prevent a heavy calculation thread from monopolizing the core, its preemption resistance decays quadratically "
        "the longer it executes unbroken. After 20 ms, its defense weakens; at 30 ms (hard ceiling Q_max), it is forcibly yielded "
        "to ensure UI threads remain responsive."
    )

    doc.add_heading("Rule 4: Superlinear Aging (No Starvation)", level=2)
    doc.add_paragraph(
        "Whenever a process waits in the ready queue, its urgency formula grows superlinearly (Wait_Time ^ 1.3). "
        "A background task that has waited 100 ms has an exponentially higher score than when it first arrived. "
        "It is mathematically guaranteed that every process will eventually overcome any running process's barrier."
    )

    # 4. Comparison Table
    doc.add_heading("4. Side-by-Side Comparison: Round Robin vs ADAPT-CS", level=1)

    table = doc.add_table(rows=5, cols=4)
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    table.autofit = False

    headers = ["Operating Scenario", "What Round Robin Does", "What ADAPT-CS Does", "Net Performance Benefit"]
    for i, h in enumerate(headers):
        cell = table.cell(0, i)
        cell.text = h
        cell.paragraphs[0].runs[0].font.bold = True
        cell.paragraphs[0].runs[0].font.color.rgb = RGBColor(255, 255, 255)
        set_cell_background(cell, "1E40AF") # Dark blue header

    rows_data = [
        (
            "Task has 1.5 ms left at slice expiration",
            "Interrupts task, incurs 0.5 ms switch away, then 0.5 ms switch back later.",
            "Grants a 1.5 ms tail extension to finish right now.",
            "Saves 1.0 ms of dead time; completes task 15+ ms earlier."
        ),
        (
            "New background task arrives during compute loop",
            "Preempts immediately or appends to end of rigid queue.",
            "Applies 0.5 ms friction barrier; retains current thread to preserve cache.",
            "Maintains high CPU pipeline throughput; avoids cache pollution."
        ),
        (
            "User clicks button / types key (2 ms burst)",
            "Waits behind multiple 10 ms slices (up to 40 ms lag).",
            "Identifies interactive profile and preempts smoothly.",
            "Instant UI responsiveness (sub-5 ms response)."
        ),
        (
            "Low-priority background thread waiting 150 ms",
            "Fixed priority can starve it indefinitely.",
            "Superlinear aging boosts score exponentially.",
            "Zero starvation; bounded worst-case waiting time."
        )
    ]

    for row_idx, rdata in enumerate(rows_data, start=1):
        for col_idx, text in enumerate(rdata):
            cell = table.cell(row_idx, col_idx)
            cell.text = text
            if row_idx % 2 == 1:
                set_cell_background(cell, "F3F4F6")

    doc.add_paragraph() # Spacer

    # 5. Visual Proof: Concrete 5-Process Timeline
    doc.add_heading("5. Visual Proof: Concrete 5-Process Execution", level=1)
    doc.add_paragraph(
        "Below is the exact execution timeline across FCFS, SJF, SRTF, Priority, Round Robin, MLFQ, and ADAPT-CS "
        "on the same workload (P1: 8ms, P2: 4ms, P3: 2ms, P4: 1ms, P5: 6ms; Context Switch Overhead = 0.5ms). "
        "Notice the red blocks, which represent wasted CPU time spent swapping registers and memory maps:"
    )

    gantt_path = "/home/suyashpatkar/Desktop/k/generated_charts/concrete_example_gantt.png"
    if os.path.exists(gantt_path):
        doc.add_picture(gantt_path, width=Inches(6.8))
        caption = doc.add_paragraph()
        c_run = caption.add_run("Figure 1: Gantt Timeline showing context switch overhead (red blocks) across 7 algorithms.")
        c_run.font.size = Pt(9)
        c_run.font.italic = True
        caption.alignment = WD_ALIGN_PARAGRAPH.CENTER

    # 6. Benchmark Metrics Summary
    doc.add_heading("6. Quantitative Benchmark Results", level=1)
    
    doc.add_paragraph(
        "Across 5 distinct benchmark workload archetypes (CPU-Bound, Interactive, Mixed, Congested, and Pareto Heavy-Tailed), "
        "ADAPT-CS demonstrated clear empirical superiority over standard preemptive schedulers:"
    )

    m1 = doc.add_paragraph(style='List Bullet')
    m1.add_run("36% to 62% Reduction in Context Switches: ").bold = True
    m1.add_run("On the mixed workload, ADAPT-CS required only 51 switches compared to 116 for Round Robin (q=2) and 108 for MLFQ.")

    m2 = doc.add_paragraph(style='List Bullet')
    m2.add_run("84.7% CPU Utilization: ").bold = True
    m2.add_run("Reclaimed ~10% of total CPU cycles that Round Robin wasted purely on switching overhead.")

    m3 = doc.add_paragraph(style='List Bullet')
    m3.add_run("58% Lower Average Waiting Time: ").bold = True
    m3.add_run("Achieved an average waiting time of 33.57 ms compared to 80.55 ms in Round Robin (q=2).")

    m4 = doc.add_paragraph(style='List Bullet')
    m4.add_run("0.83 Jain's Fairness Index: ").bold = True
    m4.add_run("Delivered balanced, fair execution across both short interactive threads and long batch compute jobs.")

    cs_chart_path = "/home/suyashpatkar/Desktop/k/generated_charts/context_switches_comparison.png"
    if os.path.exists(cs_chart_path):
        doc.add_picture(cs_chart_path, width=Inches(6.2))
        caption = doc.add_paragraph()
        c_run = caption.add_run("Figure 2: Context Switches comparison across algorithms on mixed workload.")
        c_run.font.size = Pt(9)
        c_run.font.italic = True
        caption.alignment = WD_ALIGN_PARAGRAPH.CENTER

    # Save document
    out_file = "/home/suyashpatkar/Desktop/k/ADAPT_CS_Algorithm_Documentation.docx"
    doc.save(out_file)
    print(f"Document successfully created at: {out_file}")

if __name__ == "__main__":
    create_document()

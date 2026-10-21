import React, { useState } from 'react';
import { ProcessInput, ProcessType } from '../engine/types';
import { Plus, Trash2, RotateCcw, HelpCircle, FileText, X } from 'lucide-react';

interface ProcessInputTableProps {
  processes: ProcessInput[];
  onProcessesChange: (processes: ProcessInput[]) => void;
  onLoadExample: () => void;
  onClearAll: () => void;
  onGenerateQuestion: () => void;
}

export const ProcessInputTable: React.FC<ProcessInputTableProps> = ({
  processes,
  onProcessesChange,
  onLoadExample,
  onClearAll,
  onGenerateQuestion,
}) => {
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // New process draft
  const [newPid, setNewPid] = useState(`P${processes.length + 1}`);
  const [newArrival, setNewArrival] = useState('0');
  const [newBurst, setNewBurst] = useState('4');
  const [newPriority, setNewPriority] = useState('2');
  const [newType, setNewType] = useState<ProcessType>('cpu');

  const handleUpdate = (index: number, field: keyof ProcessInput, value: string | number) => {
    const updated = [...processes];
    const proc = { ...updated[index] };

    if (field === 'arrivalTime') {
      const num = parseFloat(value as string);
      proc.arrivalTime = isNaN(num) || num < 0 ? 0 : num;
    } else if (field === 'burstTime') {
      const num = parseFloat(value as string);
      proc.burstTime = isNaN(num) || num <= 0 ? 1 : num;
    } else if (field === 'priority') {
      const num = parseInt(value as string, 10);
      proc.priority = isNaN(num) || num < 1 ? 1 : num;
    } else if (field === 'processType') {
      proc.processType = value as ProcessType;
    } else if (field === 'pid') {
      proc.pid = (value as string).trim() || `P${index + 1}`;
    }

    updated[index] = proc;
    onProcessesChange(updated);
  };

  const handleDelete = (index: number) => {
    if (processes.length <= 1) {
      setErrorMsg('At least one process is required in the workload.');
      return;
    }
    setErrorMsg(null);
    const updated = processes.filter((_, i) => i !== index);
    onProcessesChange(updated);
  };

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const arrival = parseFloat(newArrival);
    const burst = parseFloat(newBurst);
    const priority = parseInt(newPriority, 10);

    if (isNaN(arrival) || arrival < 0) {
      setErrorMsg('Arrival time must be a non-negative number (>= 0).');
      return;
    }
    if (isNaN(burst) || burst <= 0) {
      setErrorMsg('Burst time must be a strictly positive number (> 0).');
      return;
    }
    if (isNaN(priority) || priority < 1) {
      setErrorMsg('Priority must be an integer >= 1 (1 = Highest).');
      return;
    }

    const pid = newPid.trim() || `P${processes.length + 1}`;
    if (processes.some((p) => p.pid.toLowerCase() === pid.toLowerCase())) {
      setErrorMsg(`Process ID "${pid}" is already present. Please use a unique PID.`);
      return;
    }

    const newProcess: ProcessInput = {
      pid,
      arrivalTime: arrival,
      burstTime: burst,
      priority,
      processType: newType,
    };

    onProcessesChange([...processes, newProcess]);

    // Reset draft
    setNewPid(`P${processes.length + 2}`);
    setNewBurst('3');
    setNewArrival(`${Math.round((arrival + 1) * 10) / 10}`);
  };

  return (
    <div className="mono-panel rounded-lg p-5 sm:p-6 space-y-5">
      {/* Top Header & Action Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3.5 border-b border-neutral-800">
        <div>
          <h2 className="text-[22px] sm:text-2xl font-bold text-white tracking-tight">
            Process Workload Table
          </h2>
          <p className="text-base text-neutral-300 mt-1">
            Configure arrival times, bursts, priorities, and process types.
          </p>
        </div>

        {/* Controls: Load Example, Clear All, Generate Sample Question */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={onGenerateQuestion}
            type="button"
            className="flex items-center gap-2 px-4 py-2 text-[15px] font-semibold text-white bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 rounded-md transition"
            title="Generate a randomized, valid CPU scheduling question"
          >
            <FileText className="w-4 h-4" />
            GENERATE SAMPLE QUESTION
          </button>

          <button
            onClick={onLoadExample}
            type="button"
            className="flex items-center gap-2 px-4 py-2 text-[15px] font-medium text-neutral-300 bg-neutral-900 hover:text-white hover:bg-neutral-800 border border-neutral-700 rounded-md transition"
            title="Load default 5-process benchmark"
          >
            <RotateCcw className="w-4 h-4" />
            Load Example
          </button>

          <button
            onClick={onClearAll}
            type="button"
            className="flex items-center gap-2 px-4 py-2 text-[15px] font-medium text-neutral-400 hover:text-white bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 rounded-md transition"
            title="Clear all processes"
          >
            <X className="w-4 h-4" />
            Clear All
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="p-3.5 bg-neutral-900 border border-neutral-700 rounded-md text-neutral-200 text-sm flex items-center justify-between">
          <span>Error: {errorMsg}</span>
          <button onClick={() => setErrorMsg(null)} className="text-neutral-400 hover:text-white p-1">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Process Table */}
      <div className="overflow-x-auto min-w-full">
        <table className="w-full text-left text-[15px] border-collapse min-w-[600px]">
          <thead>
            <tr className="border-b border-neutral-800 text-neutral-300 bg-neutral-900/60 font-semibold">
              <th className="py-3 px-3.5">PID</th>
              <th className="py-3 px-3.5">Arrival Time (ms)</th>
              <th className="py-3 px-3.5">CPU Burst (ms)</th>
              <th className="py-3 px-3.5">Priority (1=High)</th>
              <th className="py-3 px-3.5">
                <span className="flex items-center gap-1.5">
                  Process Type
                  <span
                    title="Interactive tasks receive 1.5x bonus in DART (Dynamic Adaptive Runtime Triage)"
                    className="cursor-help text-neutral-400 hover:text-neutral-200"
                  >
                    <HelpCircle className="w-3.5 h-3.5" />
                  </span>
                </span>
              </th>
              <th className="py-3 px-3.5 text-right">Delete</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-900">
            {processes.map((proc, index) => (
              <tr key={index} className="hover:bg-neutral-900/50 transition-colors">
                <td className="py-2.5 px-3.5 font-bold text-white">
                  <input
                    type="text"
                    value={proc.pid}
                    onChange={(e) => handleUpdate(index, 'pid', e.target.value)}
                    className="w-20 mono-input rounded-md px-2.5 py-1.5 text-center text-white font-mono text-[15px]"
                  />
                </td>
                <td className="py-2.5 px-3.5">
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    value={proc.arrivalTime}
                    onChange={(e) => handleUpdate(index, 'arrivalTime', e.target.value)}
                    className="w-28 mono-input rounded-md px-2.5 py-1.5 text-center text-neutral-200 font-mono text-[15px]"
                  />
                </td>
                <td className="py-2.5 px-3.5">
                  <input
                    type="number"
                    min="0.1"
                    step="0.5"
                    value={proc.burstTime}
                    onChange={(e) => handleUpdate(index, 'burstTime', e.target.value)}
                    className="w-28 mono-input rounded-md px-2.5 py-1.5 text-center text-white font-semibold font-mono text-[15px]"
                  />
                </td>
                <td className="py-2.5 px-3.5">
                  <input
                    type="number"
                    min="1"
                    max="10"
                    step="1"
                    value={proc.priority}
                    onChange={(e) => handleUpdate(index, 'priority', e.target.value)}
                    className="w-24 mono-input rounded-md px-2.5 py-1.5 text-center text-neutral-200 font-mono text-[15px]"
                  />
                </td>
                <td className="py-2.5 px-3.5">
                  <select
                    value={proc.processType}
                    onChange={(e) => handleUpdate(index, 'processType', e.target.value)}
                    className="mono-input text-[15px] rounded-md px-3 py-1.5 cursor-pointer font-sans"
                  >
                    <option value="cpu">CPU-bound (1.0x)</option>
                    <option value="interactive">Interactive (1.5x)</option>
                  </select>
                </td>
                <td className="py-2.5 px-3.5 text-right">
                  <button
                    onClick={() => handleDelete(index)}
                    disabled={processes.length <= 1}
                    className="p-2 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-md transition disabled:opacity-20 disabled:cursor-not-allowed"
                    title="Delete Process"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add Process Form */}
      <form onSubmit={handleAdd} className="pt-4 border-t border-neutral-800">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3.5 items-end text-[15px]">
          <div>
            <label className="block text-neutral-300 font-medium mb-1.5">Process ID</label>
            <input
              type="text"
              value={newPid}
              onChange={(e) => setNewPid(e.target.value)}
              placeholder="e.g. P6"
              className="w-full mono-input rounded-md px-3 py-2 text-center text-white font-mono text-[15px]"
            />
          </div>

          <div>
            <label className="block text-neutral-300 font-medium mb-1.5">Arrival (ms)</label>
            <input
              type="number"
              min="0"
              step="0.5"
              value={newArrival}
              onChange={(e) => setNewArrival(e.target.value)}
              className="w-full mono-input rounded-md px-3 py-2 text-center text-neutral-200 font-mono text-[15px]"
            />
          </div>

          <div>
            <label className="block text-neutral-300 font-medium mb-1.5">Burst (ms)</label>
            <input
              type="number"
              min="0.1"
              step="0.5"
              value={newBurst}
              onChange={(e) => setNewBurst(e.target.value)}
              className="w-full mono-input rounded-md px-3 py-2 text-center text-white font-semibold font-mono text-[15px]"
            />
          </div>

          <div>
            <label className="block text-neutral-300 font-medium mb-1.5">Priority</label>
            <input
              type="number"
              min="1"
              step="1"
              value={newPriority}
              onChange={(e) => setNewPriority(e.target.value)}
              className="w-full mono-input rounded-md px-3 py-2 text-center text-neutral-200 font-mono text-[15px]"
            />
          </div>

          <div>
            <label className="block text-neutral-300 font-medium mb-1.5">Type</label>
            <select
              value={newType}
              onChange={(e) => setNewType(e.target.value as ProcessType)}
              className="w-full mono-input rounded-md px-3 py-2 text-[15px]"
            >
              <option value="cpu">CPU-bound</option>
              <option value="interactive">Interactive</option>
            </select>
          </div>

          <div>
            <button
              type="submit"
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-white hover:bg-neutral-200 text-black font-semibold text-[15px] rounded-md transition"
            >
              <Plus className="w-4 h-4" />
              Add Process
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

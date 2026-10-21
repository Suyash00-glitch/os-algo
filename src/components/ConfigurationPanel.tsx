import React from 'react';
import { SimulatorConfig } from '../engine/types';
import { Settings, RotateCcw } from 'lucide-react';
import { DEFAULT_SIMULATOR_CONFIG } from '../engine/simulator';

interface ConfigurationPanelProps {
  config: SimulatorConfig;
  onConfigChange: (config: SimulatorConfig) => void;
}

export const ConfigurationPanel: React.FC<ConfigurationPanelProps> = ({ config, onConfigChange }) => {
  const handleReset = () => {
    onConfigChange(DEFAULT_SIMULATOR_CONFIG);
  };

  const updateGlobal = (key: keyof SimulatorConfig, value: number | boolean) => {
    onConfigChange({
      ...config,
      [key]: value,
    });
  };

  const dartConfig = config.dartBaseline || config.adaptCsBaseline;

  const updateDartConfig = (key: string, value: number) => {
    const current = config.dartBaseline || config.adaptCsBaseline;
    const updated = {
      ...current,
      [key]: value,
    };
    onConfigChange({
      ...config,
      dartBaseline: updated,
      adaptCsBaseline: updated,
    });
  };

  return (
    <div className="mono-panel rounded-lg p-5 sm:p-6 space-y-6 text-neutral-200">
      <div className="flex items-center justify-between pb-3.5 border-b border-neutral-800">
        <h3 className="text-[22px] font-bold text-white flex items-center gap-2.5">
          <Settings className="w-5 h-5 text-white" />
          Scheduling Configuration
        </h3>
        <button
          onClick={handleReset}
          className="flex items-center gap-2 text-[15px] font-medium text-neutral-300 hover:text-white bg-neutral-900 px-3.5 py-1.5 rounded-md border border-neutral-700 hover:border-neutral-600 transition"
        >
          <RotateCcw className="w-4 h-4" />
          Reset Parameters
        </button>
      </div>

      {/* Global & Round Robin Settings */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-neutral-900 p-4 rounded-lg border border-neutral-800">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-neutral-200 font-semibold text-[15px]">Context-Switch Cost (CS)</span>
            <span className="text-white font-bold text-[15px]">{config.contextSwitchOverhead} ms</span>
          </div>
          <input
            type="number"
            min="0"
            max="3.0"
            step="0.1"
            value={config.contextSwitchOverhead}
            onChange={(e) => updateGlobal('contextSwitchOverhead', parseFloat(e.target.value) || 0)}
            className="w-full mono-input rounded-md px-3 py-2 mt-1 text-center text-[15px]"
          />
          <p className="text-sm text-neutral-400 mt-1.5 leading-normal">
            Dead CPU time incurred during thread swaps.
          </p>
        </div>

        <div className="bg-neutral-900 p-4 rounded-lg border border-neutral-800">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-neutral-200 font-semibold text-[15px]">Round Robin Quantum (q)</span>
            <span className="text-white font-bold text-[15px]">{config.rrQuantum} ms</span>
          </div>
          <input
            type="number"
            min="0.5"
            max="10.0"
            step="0.5"
            value={config.rrQuantum}
            onChange={(e) => updateGlobal('rrQuantum', parseFloat(e.target.value) || 1)}
            className="w-full mono-input rounded-md px-3 py-2 mt-1 text-center text-[15px]"
          />
          <p className="text-sm text-neutral-400 mt-1.5 leading-normal">
            Time slice allocated before round-robin preemption.
          </p>
        </div>

        <div className="bg-neutral-900 p-4 rounded-lg border border-neutral-800 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-neutral-200 font-semibold text-[15px]">Count Initial Dispatch</span>
            <input
              type="checkbox"
              checked={config.includeInitialDispatchInCount}
              onChange={(e) => updateGlobal('includeInitialDispatchInCount', e.target.checked)}
              className="w-5 h-5 accent-white rounded cursor-pointer"
            />
          </div>
          <p className="text-sm text-neutral-400 mt-2 leading-normal">
            Whether the very first process dispatch from idle counts toward total context switches.
          </p>
        </div>
      </div>

      {/* DART Thresholding Parameters */}
      <div className="pt-4 border-t border-neutral-800 space-y-3.5">
        <div className="text-white font-semibold text-[17px]">
          DART (Dynamic Adaptive Runtime Triage) Parameters
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3.5">
          <div className="bg-neutral-900 p-3.5 rounded-lg border border-neutral-800">
            <span className="text-sm font-medium text-neutral-300 block mb-1.5">Base Quantum (Q)</span>
            <input
              type="number"
              step="0.5"
              min="1.0"
              max="10.0"
              value={dartConfig.baseQuantum}
              onChange={(e) => updateDartConfig('baseQuantum', parseFloat(e.target.value) || 3)}
              className="w-full mono-input rounded-md px-3 py-1.5 text-center text-[15px]"
            />
          </div>

          <div className="bg-neutral-900 p-3.5 rounded-lg border border-neutral-800">
            <span className="text-sm font-medium text-neutral-300 block mb-1.5">Friction Coeff (Θ_base)</span>
            <input
              type="number"
              step="0.1"
              min="0.5"
              max="3.0"
              value={dartConfig.thetaBase}
              onChange={(e) => updateDartConfig('thetaBase', parseFloat(e.target.value) || 1.2)}
              className="w-full mono-input rounded-md px-3 py-1.5 text-center text-[15px]"
            />
          </div>

          <div className="bg-neutral-900 p-3.5 rounded-lg border border-neutral-800">
            <span className="text-sm font-medium text-neutral-300 block mb-1.5">Hard Ceiling (Q_max)</span>
            <input
              type="number"
              step="1.0"
              min="4.0"
              max="20.0"
              value={dartConfig.qMax}
              onChange={(e) => updateDartConfig('qMax', parseFloat(e.target.value) || 8)}
              className="w-full mono-input rounded-md px-3 py-1.5 text-center text-[15px]"
            />
          </div>

          <div className="bg-neutral-900 p-3.5 rounded-lg border border-neutral-800">
            <span className="text-sm font-medium text-neutral-300 block mb-1.5">Near-Finish Shield</span>
            <input
              type="number"
              step="0.1"
              min="0.5"
              max="3.0"
              value={dartConfig.nearFinishShieldLimit}
              onChange={(e) => updateDartConfig('nearFinishShieldLimit', parseFloat(e.target.value) || 1.5)}
              className="w-full mono-input rounded-md px-3 py-1.5 text-center text-[15px] text-white font-bold"
            />
          </div>

          <div className="bg-neutral-900 p-3.5 rounded-lg border border-neutral-800">
            <span className="text-sm font-medium text-neutral-300 block mb-1.5">Finish Bonus Coeff</span>
            <input
              type="number"
              step="0.5"
              min="1.0"
              max="10.0"
              value={dartConfig.kFinish}
              onChange={(e) => updateDartConfig('kFinish', parseFloat(e.target.value) || 5)}
              className="w-full mono-input rounded-md px-3 py-1.5 text-center text-[15px]"
            />
          </div>

          <div className="bg-neutral-900 p-3.5 rounded-lg border border-neutral-800">
            <span className="text-sm font-medium text-neutral-300 block mb-1.5">Anti-Hog Penalty Coeff</span>
            <input
              type="number"
              step="0.1"
              min="0.5"
              max="3.0"
              value={dartConfig.kHog}
              onChange={(e) => updateDartConfig('kHog', parseFloat(e.target.value) || 1.2)}
              className="w-full mono-input rounded-md px-3 py-1.5 text-center text-[15px]"
            />
          </div>

          <div className="bg-neutral-900 p-3.5 rounded-lg border border-neutral-800">
            <span className="text-sm font-medium text-neutral-300 block mb-1.5">Aging Exponent</span>
            <input
              type="number"
              step="0.1"
              min="1.0"
              max="2.0"
              value={dartConfig.agingExponent}
              onChange={(e) => updateDartConfig('agingExponent', parseFloat(e.target.value) || 1.3)}
              className="w-full mono-input rounded-md px-3 py-1.5 text-center text-[15px]"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

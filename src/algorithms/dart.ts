import { ProcessInput, AlgorithmResult, DartConfig } from '../engine/types';
import { runDartEngine } from './dartEngine';

export const DEFAULT_DART_CONFIG: DartConfig = {
  baseQuantum: 3.0,
  thetaBase: 1.2,
  finishThresh: 2.0,
  kFinish: 5.0,
  kHog: 1.2,
  qMax: 8.0,
  agingExponent: 1.3,
  nearFinishShieldLimit: 1.5,
  barrierFloor: undefined, // Baseline allows raw negative values
};

export const DEFAULT_ADAPT_CS_CONFIG = DEFAULT_DART_CONFIG;

export function runDart(
  inputs: ProcessInput[],
  config: Partial<DartConfig> = {},
  csOverhead: number = 0.5,
  includeInitialDispatchInCount: boolean = true
): AlgorithmResult {
  const mergedConfig: DartConfig = {
    ...DEFAULT_DART_CONFIG,
    ...config,
  };

  return runDartEngine(inputs, mergedConfig, csOverhead, includeInitialDispatchInCount, false);
}

export const runAdaptCs = runDart;

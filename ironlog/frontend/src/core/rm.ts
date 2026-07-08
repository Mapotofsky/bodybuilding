import type { RmFormulaResults } from "./models";

export interface RmCalculationInput {
  weightKg: number;
  reps: number;
  rpe: number;
}

export interface RmCalculationResult {
  rir: number;
  effectiveReps: number;
  formulas: RmFormulaResults;
}

export function calculateRpeAdjustedRm(input: RmCalculationInput): RmCalculationResult | null {
  if (!Number.isFinite(input.weightKg) || input.weightKg <= 0) return null;
  if (!Number.isInteger(input.reps) || input.reps < 1 || input.reps > 12) return null;
  if (!Number.isFinite(input.rpe) || input.rpe < 1 || input.rpe > 10) return null;
  const rir = 10 - input.rpe;
  const effectiveReps = input.reps + rir;
  if (effectiveReps < 1 || effectiveReps > 12) return null;
  return {
    rir,
    effectiveReps,
    formulas: calculateRmFormulaResults(input.weightKg, effectiveReps),
  };
}

export function calculateRmFormulaResults(weightKg: number, effectiveReps: number): RmFormulaResults {
  const epleyKg = weightKg * (1 + effectiveReps / 30);
  const brzyckiKg = weightKg * 36 / (37 - effectiveReps);
  const lombardiKg = weightKg * Math.pow(effectiveReps, 0.10);
  const wathenKg = 100 * weightKg / (48.8 + 53.8 * Math.exp(-0.075 * effectiveReps));
  const values = [epleyKg, brzyckiKg, lombardiKg, wathenKg];
  const meanKg = mean(values);
  return {
    epleyKg,
    brzyckiKg,
    lombardiKg,
    wathenKg,
    meanKg,
    standardDeviationKg: standardDeviation(values, meanKg),
    minKg: Math.min(...values),
    maxKg: Math.max(...values),
  };
}

function mean(values: number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function standardDeviation(values: number[], avg: number): number {
  return Math.sqrt(values.reduce((sum, value) => sum + Math.pow(value - avg, 2), 0) / values.length);
}

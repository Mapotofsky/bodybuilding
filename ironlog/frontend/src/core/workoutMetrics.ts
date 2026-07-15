import type { LoadBasis, LoadDirection, RateMetric, RecordingMode, WeightUnit } from "./models";
import {
  convertWeight,
  effectiveLoadKg,
  getRecordingModeSpec,
  KG_PER_LB,
  type RecordingConfig,
} from "./recordingModes";

export { convertWeight, effectiveLoadKg, KG_PER_LB } from "./recordingModes";

export interface MetricSet {
  weight: number | null;
  reps: number | null;
  unit: WeightUnit;
  durationSec?: number | null;
  distanceM?: number | null;
}

export interface MetricExercise extends RecordingConfig {
  recordingMode: RecordingMode;
  loadBasis: LoadBasis | null;
  loadDirection: LoadDirection | null;
  rateMetric: RateMetric;
  sets: readonly MetricSet[];
}

export interface WorkoutMetrics {
  totalSets: number;
  totalVolume: number;
  totalVolumeUnit: WeightUnit;
  totalDistanceM: number;
  totalDurationSec: number;
  totalReps: number;
  totalLoadDistanceKgM: number;
  totalLoadDurationKgSec: number;
}

export function calculateStrengthVolume(
  sets: readonly MetricSet[],
  displayUnit: WeightUnit,
  loadBasis: LoadBasis = "total"
): number {
  return sets.reduce((sum, set) => {
    if (set.weight == null || set.reps == null) return sum;
    const effectiveDisplayLoad = convertWeight(effectiveLoadKg(set.weight, set.unit, loadBasis), "kg", displayUnit);
    return sum + effectiveDisplayLoad * set.reps;
  }, 0);
}

export function calculateSetVolumeKgReps(set: MetricSet, loadBasis: LoadBasis): number | null {
  if (set.weight == null || set.reps == null) return null;
  return effectiveLoadKg(set.weight, set.unit, loadBasis) * set.reps;
}

export function calculateSetLoadDistanceKgM(set: MetricSet, loadBasis: LoadBasis): number | null {
  if (set.weight == null || set.distanceM == null) return null;
  return effectiveLoadKg(set.weight, set.unit, loadBasis) * set.distanceM;
}

export function calculateSetLoadDurationKgSec(set: MetricSet, loadBasis: LoadBasis): number | null {
  if (set.weight == null || set.durationSec == null) return null;
  return effectiveLoadKg(set.weight, set.unit, loadBasis) * set.durationSec;
}

export function calculateSetDistanceRateMps(set: MetricSet): number | null {
  if (set.distanceM == null || set.durationSec == null || set.durationSec <= 0) return null;
  return set.distanceM / set.durationSec;
}

export function calculateSetLoadDistanceRateKgMps(set: MetricSet, loadBasis: LoadBasis): number | null {
  const loadDistance = calculateSetLoadDistanceKgM(set, loadBasis);
  if (loadDistance == null || set.durationSec == null || set.durationSec <= 0) return null;
  return loadDistance / set.durationSec;
}

export function calculateWorkoutMetrics(exercises: readonly MetricExercise[], displayUnit: WeightUnit): WorkoutMetrics {
  return exercises.reduce<WorkoutMetrics>((metrics, exercise) => {
    const spec = getRecordingModeSpec(exercise.recordingMode);
    metrics.totalSets += exercise.sets.length;

    if (spec.fields.includes("reps")) {
      metrics.totalReps += exercise.sets.reduce((sum, set) => sum + (set.reps ?? 0), 0);
    }
    if (spec.fields.includes("distanceM")) {
      metrics.totalDistanceM += exercise.sets.reduce((sum, set) => sum + (set.distanceM ?? 0), 0);
    }
    if (spec.fields.includes("durationSec")) {
      metrics.totalDurationSec += exercise.sets.reduce((sum, set) => sum + (set.durationSec ?? 0), 0);
    }
    if (spec.performance.compound.includes("volume") && exercise.loadBasis && exercise.loadDirection === "higher_better") {
      metrics.totalVolume += calculateStrengthVolume(exercise.sets, displayUnit, exercise.loadBasis);
    }
    if (spec.performance.compound.includes("load_distance") && exercise.loadBasis && exercise.loadDirection === "higher_better") {
      metrics.totalLoadDistanceKgM += exercise.sets.reduce((sum, set) => sum + (calculateSetLoadDistanceKgM(set, exercise.loadBasis!) ?? 0), 0);
    }
    if ((spec.performance.compound.includes("load_duration") || spec.performance.compound.includes("load_duration_without_distance"))
      && exercise.loadBasis && exercise.loadDirection === "higher_better") {
      metrics.totalLoadDurationKgSec += exercise.sets.reduce((sum, set) => {
        if (spec.performance.compound.includes("load_duration_without_distance") && set.distanceM != null) return sum;
        return sum + (calculateSetLoadDurationKgSec(set, exercise.loadBasis!) ?? 0);
      }, 0);
    }
    return metrics;
  }, {
    totalSets: 0,
    totalVolume: 0,
    totalVolumeUnit: displayUnit,
    totalDistanceM: 0,
    totalDurationSec: 0,
    totalReps: 0,
    totalLoadDistanceKgM: 0,
    totalLoadDurationKgSec: 0,
  });
}

export function formatOneDecimal(value: number): string {
  if (!Number.isFinite(value)) return "0.0";
  const rounded = Math.round(value * 10) / 10;
  return Object.is(rounded, -0) ? "0.0" : rounded.toFixed(1);
}

export function formatVolume(value: number, unit: WeightUnit): string {
  return `${formatOneDecimal(value)} ${unit}·次`;
}

import type { WeightUnit } from "./models";
import {
  convertWeight,
  getRecordingModeSpec,
  KG_PER_LB,
  validateRecordingConfig,
  type RecordingConfig,
} from "./recordingModes";

export { convertWeight, KG_PER_LB } from "./recordingModes";

export interface MetricSet {
  weight: number | null;
  reps: number | null;
  unit: WeightUnit;
  durationSec?: number | null;
  distanceM?: number | null;
}

export interface MetricExercise extends RecordingConfig {
  sets: readonly MetricSet[];
}

export interface SetLoadSemantics {
  inputLoadKg: number | null;
  loadMultiplier: number;
  countMultiplier: number;
  aggregateMultiplier: number;
  aggregateReps: number | null;
  aggregateDistanceM: number | null;
  aggregateDurationSec: number | null;
  volumeKgReps: number | null;
  loadDistanceKgM: number | null;
  loadDurationKgSec: number | null;
  distanceRateMps: number | null;
  loadDistanceRateKgMps: number | null;
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

/**
 * The single source of truth for interpreting a recorded set. It deliberately accepts
 * the complete immutable recording snapshot so callers cannot infer a
 * multiplier from equipment or pass only part of the historical convention.
 */
export function getSetLoadSemantics(recording: RecordingConfig, set: MetricSet): SetLoadSemantics {
  const config = validateRecordingConfig(recording);
  const inputLoadKg = set.weight == null ? null : convertWeight(set.weight, set.unit, "kg");
  const loadMultiplier = config.loadBasis === "per_hand" ? 2 : 1;
  const countMultiplier = config.countBasis === "per_side" ? 2 : 1;
  const aggregateMultiplier = loadMultiplier * countMultiplier;
  const aggregateReps = set.reps == null ? null : set.reps * countMultiplier;
  const aggregateDistanceM = set.distanceM == null ? null : set.distanceM * countMultiplier;
  const aggregateDurationSec = set.durationSec == null ? null : set.durationSec * countMultiplier;
  const volumeKgReps = inputLoadKg == null || set.reps == null
    ? null
    : inputLoadKg * aggregateMultiplier * set.reps;
  const loadDistanceKgM = inputLoadKg == null || set.distanceM == null
    ? null
    : inputLoadKg * aggregateMultiplier * set.distanceM;
  const loadDurationKgSec = inputLoadKg == null || set.durationSec == null
    ? null
    : inputLoadKg * aggregateMultiplier * set.durationSec;
  const distanceRateMps = aggregateDistanceM == null || aggregateDurationSec == null || aggregateDurationSec <= 0
    ? null
    : aggregateDistanceM / aggregateDurationSec;
  const loadDistanceRateKgMps = loadDistanceKgM == null || aggregateDurationSec == null || aggregateDurationSec <= 0
    ? null
    : loadDistanceKgM / aggregateDurationSec;

  return {
    inputLoadKg,
    loadMultiplier,
    countMultiplier,
    aggregateMultiplier,
    aggregateReps,
    aggregateDistanceM,
    aggregateDurationSec,
    volumeKgReps,
    loadDistanceKgM,
    loadDurationKgSec,
    distanceRateMps,
    loadDistanceRateKgMps,
  };
}

export function calculateStrengthVolume(
  sets: readonly MetricSet[],
  displayUnit: WeightUnit,
  recording: RecordingConfig
): number {
  return sets.reduce((sum, set) => {
    const volumeKgReps = getSetLoadSemantics(recording, set).volumeKgReps;
    return sum + (volumeKgReps == null ? 0 : convertWeight(volumeKgReps, "kg", displayUnit));
  }, 0);
}

export function calculateSetVolumeKgReps(recording: RecordingConfig, set: MetricSet): number | null {
  return getSetLoadSemantics(recording, set).volumeKgReps;
}

export function calculateSetLoadDistanceKgM(recording: RecordingConfig, set: MetricSet): number | null {
  return getSetLoadSemantics(recording, set).loadDistanceKgM;
}

export function calculateSetLoadDurationKgSec(recording: RecordingConfig, set: MetricSet): number | null {
  return getSetLoadSemantics(recording, set).loadDurationKgSec;
}

export function calculateSetDistanceRateMps(recording: RecordingConfig, set: MetricSet): number | null {
  return getSetLoadSemantics(recording, set).distanceRateMps;
}

export function calculateSetLoadDistanceRateKgMps(recording: RecordingConfig, set: MetricSet): number | null {
  return getSetLoadSemantics(recording, set).loadDistanceRateKgMps;
}

export function calculateWorkoutMetrics(exercises: readonly MetricExercise[], displayUnit: WeightUnit): WorkoutMetrics {
  return exercises.reduce<WorkoutMetrics>((metrics, exercise) => {
    const spec = getRecordingModeSpec(exercise.recordingMode);
    const semantics = exercise.sets.map((set) => getSetLoadSemantics(exercise, set));
    metrics.totalSets += exercise.sets.length;

    if (spec.fields.includes("reps")) {
      metrics.totalReps += semantics.reduce((sum, value) => sum + (value.aggregateReps ?? 0), 0);
    }
    if (spec.fields.includes("distanceM")) {
      metrics.totalDistanceM += semantics.reduce((sum, value) => sum + (value.aggregateDistanceM ?? 0), 0);
    }
    if (spec.fields.includes("durationSec")) {
      metrics.totalDurationSec += semantics.reduce((sum, value) => sum + (value.aggregateDurationSec ?? 0), 0);
    }
    if (spec.performance.compound.includes("volume") && exercise.loadBasis && exercise.loadDirection === "higher_better") {
      metrics.totalVolume += semantics.reduce((sum, value) => {
        return sum + (value.volumeKgReps == null ? 0 : convertWeight(value.volumeKgReps, "kg", displayUnit));
      }, 0);
    }
    if (spec.performance.compound.includes("load_distance") && exercise.loadBasis && exercise.loadDirection === "higher_better") {
      metrics.totalLoadDistanceKgM += semantics.reduce((sum, value) => sum + (value.loadDistanceKgM ?? 0), 0);
    }
    if ((spec.performance.compound.includes("load_duration") || spec.performance.compound.includes("load_duration_without_distance"))
      && exercise.loadBasis && exercise.loadDirection === "higher_better") {
      metrics.totalLoadDurationKgSec += exercise.sets.reduce((sum, set, index) => {
        if (spec.performance.compound.includes("load_duration_without_distance") && set.distanceM != null) return sum;
        return sum + (semantics[index].loadDurationKgSec ?? 0);
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

import { resolveExerciseId } from "./exerciseRedirects";
import type { CountBasis, ExerciseDoc, LoadBasis, LoadDirection, RateMetric, RecordingMode, WeightUnit, WorkoutDoc } from "./models";
import { getRecordingModeSpec } from "./recordingModes";
import {
  getSetLoadSemantics,
  calculateStrengthVolume,
  convertWeight,
} from "./workoutMetrics";

export interface ExercisePersonalStats {
  completedWorkoutCount: number;
  totalSetCount: number;
  workingSetCount: number;
  recent7DaySetCount: number;
  lastCompletedDate: string | null;
  performance: {
    bestLoad: number | null;
    bestSetVolume: number | null;
    bestWorkoutVolume: number | null;
    bestReps: number | null;
    bestDistanceM: number | null;
    bestDurationSec: number | null;
    bestSpeedMps: number | null;
    bestLoadDistanceKgM: number | null;
    bestLoadDurationKgSec: number | null;
    bestLoadDistanceRateKgMps: number | null;
    displayUnit: WeightUnit;
    loadBasis: LoadBasis | null;
    countBasis: CountBasis | null;
    loadDirection: LoadDirection | null;
  };
}

export function buildExercisePersonalStats(params: {
  exerciseId: string;
  exercises: readonly ExerciseDoc[];
  workouts: readonly WorkoutDoc[];
  weightUnit: WeightUnit;
  today?: string;
}): ExercisePersonalStats {
  const stats: ExercisePersonalStats = {
    completedWorkoutCount: 0,
    totalSetCount: 0,
    workingSetCount: 0,
    recent7DaySetCount: 0,
    lastCompletedDate: null,
    performance: {
      bestLoad: null,
      bestSetVolume: null,
      bestWorkoutVolume: null,
      bestReps: null,
      bestDistanceM: null,
      bestDurationSec: null,
      bestSpeedMps: null,
      bestLoadDistanceKgM: null,
      bestLoadDurationKgSec: null,
      bestLoadDistanceRateKgMps: null,
      displayUnit: params.weightUnit,
      loadBasis: null,
      countBasis: null,
      loadDirection: null,
    },
  };
  const loadSamples: number[] = [];
  const recordingSamples: Array<{
    recordingMode: RecordingMode;
    basis: LoadBasis | null;
    countBasis: CountBasis;
    direction: LoadDirection | null;
    rateMetric: RateMetric;
  }> = [];

  for (const workout of params.workouts) {
    if (workout.deletedAt || workout.endTime == null) continue;
    let matchedInWorkout = false;
    let workoutVolume = 0;

    for (const workoutExercise of workout.exercises) {
      if (!matchesExercise(workoutExercise.exerciseId, params.exerciseId, params.exercises)) continue;
      matchedInWorkout = true;
      stats.totalSetCount += workoutExercise.sets.length;
      const spec = getRecordingModeSpec(workoutExercise.recordingMode);
      const workingSets = workoutExercise.sets.filter((set) => !set.isWarmup);
      stats.workingSetCount += workingSets.length;
      if (workingSets.length > 0) {
        recordingSamples.push({
          recordingMode: workoutExercise.recordingMode,
          basis: workoutExercise.loadBasis,
          countBasis: workoutExercise.countBasis,
          direction: workoutExercise.loadDirection,
          rateMetric: workoutExercise.rateMetric,
        });
      }

      if (spec.performance.compound.includes("volume") && workoutExercise.loadBasis
        && workoutExercise.loadDirection === "higher_better") {
        workoutVolume += calculateStrengthVolume(workingSets, params.weightUnit, workoutExercise);
      }

      for (const set of workingSets) {
        const semantics = getSetLoadSemantics(workoutExercise, set);
        if (semantics.inputLoadKg != null && workoutExercise.loadBasis && workoutExercise.loadDirection) {
          const inputLoad = convertWeight(semantics.inputLoadKg, "kg", params.weightUnit);
          loadSamples.push(inputLoad);

          if (spec.performance.compound.includes("volume") && workoutExercise.loadDirection === "higher_better") {
            const volume = semantics.volumeKgReps == null
              ? null
              : convertWeight(semantics.volumeKgReps, "kg", params.weightUnit);
            stats.performance.bestSetVolume = maxNullable(stats.performance.bestSetVolume, volume);
          }
          if (spec.performance.compound.includes("load_distance") && workoutExercise.loadDirection === "higher_better") {
            stats.performance.bestLoadDistanceKgM = maxNullable(
              stats.performance.bestLoadDistanceKgM,
              semantics.loadDistanceKgM
            );
          }
          if (workoutExercise.loadDirection === "higher_better"
            && (spec.performance.compound.includes("load_duration")
              || (spec.performance.compound.includes("load_duration_without_distance") && set.distanceM == null))) {
            stats.performance.bestLoadDurationKgSec = maxNullable(
              stats.performance.bestLoadDurationKgSec,
              semantics.loadDurationKgSec
            );
          }
          if (workoutExercise.loadDirection === "higher_better"
            && spec.performance.compound.includes("load_distance_rate")
            && workoutExercise.rateMetric === "load_distance_per_time") {
            stats.performance.bestLoadDistanceRateKgMps = maxNullable(
              stats.performance.bestLoadDistanceRateKgMps,
              semantics.loadDistanceRateKgMps
            );
          }
        }
        if (set.reps != null && spec.fields.includes("reps")) {
          stats.performance.bestReps = maxNullable(stats.performance.bestReps, set.reps);
        }
        if (set.distanceM != null && spec.fields.includes("distanceM")) {
          stats.performance.bestDistanceM = maxNullable(stats.performance.bestDistanceM, set.distanceM);
        }
        if (set.durationSec != null && spec.fields.includes("durationSec")) {
          stats.performance.bestDurationSec = maxNullable(stats.performance.bestDurationSec, set.durationSec);
        }
        if (spec.performance.compound.includes("distance_rate") && workoutExercise.rateMetric === "distance_per_time") {
          stats.performance.bestSpeedMps = maxNullable(stats.performance.bestSpeedMps, semantics.distanceRateMps);
        }
      }
    }

    if (matchedInWorkout) {
      stats.completedWorkoutCount += 1;
      if (workoutVolume > 0) stats.performance.bestWorkoutVolume = maxNullable(stats.performance.bestWorkoutVolume, workoutVolume);
      stats.lastCompletedDate = stats.lastCompletedDate == null || workout.date > stats.lastCompletedDate
        ? workout.date
        : stats.lastCompletedDate;
    }
  }

  const today = params.today ?? todayLocalDate();
  const windowStart = dateOffset(today, -6);
  for (const workout of params.workouts) {
    if (workout.deletedAt || workout.endTime == null || workout.date < windowStart || workout.date > today) continue;
    for (const workoutExercise of workout.exercises) {
      if (!matchesExercise(workoutExercise.exerciseId, params.exerciseId, params.exercises)) continue;
      stats.recent7DaySetCount += workoutExercise.sets.length;
    }
  }

  const configs = new Map(recordingSamples.map((sample) => [
    `${sample.recordingMode}:${sample.basis}:${sample.countBasis}:${sample.direction}:${sample.rateMetric}`,
    sample,
  ]));
  if (configs.size === 1) {
    const [{ basis, countBasis, direction }] = [...configs.values()];
    stats.performance.loadBasis = basis;
    stats.performance.countBasis = countBasis;
    stats.performance.loadDirection = direction;
    if (basis && direction) {
      stats.performance.bestLoad = loadSamples.reduce<number | null>((best, sample) => betterLoad(best, sample, direction), null);
    }
  }

  return stats;
}

function betterLoad(current: number | null, next: number, direction: LoadDirection): number {
  if (current == null) return next;
  return direction === "higher_better" ? Math.max(current, next) : Math.min(current, next);
}

function maxNullable(current: number | null, next: number | null): number | null {
  if (next == null) return current;
  return current == null ? next : Math.max(current, next);
}

function matchesExercise(sourceId: string, targetId: string, exercises: readonly ExerciseDoc[]): boolean {
  if (sourceId === targetId) return true;
  const resolved = resolveExerciseId(sourceId, exercises);
  return resolved.status === "resolved" && resolved.resolvedId === targetId;
}

function dateOffset(date: string, days: number): string {
  const result = new Date(`${date}T00:00:00.000Z`);
  result.setUTCDate(result.getUTCDate() + days);
  return result.toISOString().slice(0, 10);
}

function todayLocalDate(): string {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

import { resolveExerciseId } from "./exerciseRedirects";
import type { ExerciseDoc, LoadBasis, LoadDirection, WeightUnit, WorkoutDoc } from "./models";
import { getRecordingModeSpec } from "./recordingModes";
import {
  calculateSetDistanceRateMps,
  calculateSetLoadDistanceKgM,
  calculateSetLoadDistanceRateKgMps,
  calculateSetLoadDurationKgSec,
  calculateStrengthVolume,
  convertWeight,
  effectiveLoadKg,
} from "./workoutMetrics";

export interface ExercisePersonalStats {
  completedWorkoutCount: number;
  totalSetCount: number;
  workingSetCount: number;
  recent7DaySetCount: number;
  lastCompletedDate: string | null;
  performance: {
    bestInputLoad: number | null;
    bestEffectiveLoad: number | null;
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
      bestInputLoad: null,
      bestEffectiveLoad: null,
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
      loadDirection: null,
    },
  };
  const loadSamples: Array<{ input: number; effective: number; basis: LoadBasis; direction: LoadDirection }> = [];

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

      if (spec.performance.compound.includes("volume") && workoutExercise.loadBasis
        && workoutExercise.loadDirection === "higher_better") {
        workoutVolume += calculateStrengthVolume(workingSets, params.weightUnit, workoutExercise.loadBasis);
      }

      for (const set of workingSets) {
        if (set.weight != null && workoutExercise.loadBasis && workoutExercise.loadDirection) {
          const inputLoad = convertWeight(set.weight, set.unit, params.weightUnit);
          const effectiveKg = effectiveLoadKg(set.weight, set.unit, workoutExercise.loadBasis);
          const effectiveDisplay = convertWeight(effectiveKg, "kg", params.weightUnit);
          loadSamples.push({ input: inputLoad, effective: effectiveDisplay, basis: workoutExercise.loadBasis, direction: workoutExercise.loadDirection });

          if (spec.performance.compound.includes("volume") && workoutExercise.loadDirection === "higher_better" && set.reps != null) {
            stats.performance.bestSetVolume = maxNullable(stats.performance.bestSetVolume, effectiveDisplay * set.reps);
          }
          if (spec.performance.compound.includes("load_distance") && workoutExercise.loadDirection === "higher_better") {
            stats.performance.bestLoadDistanceKgM = maxNullable(
              stats.performance.bestLoadDistanceKgM,
              calculateSetLoadDistanceKgM(set, workoutExercise.loadBasis)
            );
          }
          if (workoutExercise.loadDirection === "higher_better"
            && (spec.performance.compound.includes("load_duration")
              || (spec.performance.compound.includes("load_duration_without_distance") && set.distanceM == null))) {
            stats.performance.bestLoadDurationKgSec = maxNullable(
              stats.performance.bestLoadDurationKgSec,
              calculateSetLoadDurationKgSec(set, workoutExercise.loadBasis)
            );
          }
          if (workoutExercise.loadDirection === "higher_better"
            && spec.performance.compound.includes("load_distance_rate")
            && workoutExercise.rateMetric === "load_distance_per_time") {
            stats.performance.bestLoadDistanceRateKgMps = maxNullable(
              stats.performance.bestLoadDistanceRateKgMps,
              calculateSetLoadDistanceRateKgMps(set, workoutExercise.loadBasis)
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
          stats.performance.bestSpeedMps = maxNullable(stats.performance.bestSpeedMps, calculateSetDistanceRateMps(set));
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

  const configs = new Map(loadSamples.map((sample) => [`${sample.basis}:${sample.direction}`, sample]));
  if (configs.size === 1) {
    const [{ basis, direction }] = [...configs.values()];
    stats.performance.loadBasis = basis;
    stats.performance.loadDirection = direction;
    stats.performance.bestInputLoad = loadSamples.reduce<number | null>((best, sample) => betterLoad(best, sample.input, direction), null);
    stats.performance.bestEffectiveLoad = loadSamples.reduce<number | null>((best, sample) => betterLoad(best, sample.effective, direction), null);
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

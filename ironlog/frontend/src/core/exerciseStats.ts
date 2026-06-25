import { resolveExerciseId } from "./exerciseRedirects";
import type { ExerciseDoc, WeightUnit, WorkoutDoc } from "./models";

export interface ExercisePersonalStats {
  completedWorkoutCount: number;
  totalSetCount: number;
  workingSetCount: number;
  recent7DaySetCount: number;
  lastCompletedDate: string | null;
  strength: {
    bestWeight: number | null;
    bestVolume: number;
    displayUnit: WeightUnit;
  };
  cardio: { bestDistanceM: number; bestSpeedKmh: number | null };
  repsOnly: { bestReps: number };
  staticHold: { bestDurationSec: number };
}

const KG_PER_LB = 0.45359237;

export function buildExercisePersonalStats(params: {
  exerciseId: string;
  exercises: readonly ExerciseDoc[];
  workouts: readonly WorkoutDoc[];
  weightUnit: WeightUnit;
}): ExercisePersonalStats {
  const stats: ExercisePersonalStats = {
    completedWorkoutCount: 0,
    totalSetCount: 0,
    workingSetCount: 0,
    recent7DaySetCount: 0,
    lastCompletedDate: null,
    strength: { bestWeight: null, bestVolume: 0, displayUnit: params.weightUnit },
    cardio: { bestDistanceM: 0, bestSpeedKmh: null },
    repsOnly: { bestReps: 0 },
    staticHold: { bestDurationSec: 0 },
  };

  for (const workout of params.workouts) {
    if (workout.deletedAt || workout.endTime == null) continue;
    let matchedInWorkout = false;
    let workoutStrengthVolume = 0;
    let workoutCardioDistanceM = 0;
    let workoutCardioDurationSec = 0;
    let workoutRepsOnlyReps = 0;
    let workoutStaticHoldDurationSec = 0;

    for (const workoutExercise of workout.exercises) {
      if (!matchesExercise(workoutExercise.exerciseId, params.exerciseId, params.exercises)) continue;
      matchedInWorkout = true;
      stats.totalSetCount += workoutExercise.sets.length;

      for (const set of workoutExercise.sets) {
        if (set.isWarmup) continue;
        stats.workingSetCount += 1;

        if (workoutExercise.exerciseType === "strength") {
          if (set.weight != null) {
            const weight = convertWeight(set.weight, set.unit, params.weightUnit);
            stats.strength.bestWeight = stats.strength.bestWeight == null ? weight : Math.max(stats.strength.bestWeight, weight);
            if (set.reps != null) workoutStrengthVolume += weight * set.reps;
          }
        } else if (workoutExercise.exerciseType === "cardio") {
          if (set.distanceM != null) workoutCardioDistanceM += set.distanceM;
          if (set.durationSec != null) workoutCardioDurationSec += set.durationSec;
        } else if (workoutExercise.exerciseType === "reps_only") {
          if (set.reps != null) workoutRepsOnlyReps += set.reps;
        } else if (workoutExercise.exerciseType === "static_hold") {
          if (set.durationSec != null) workoutStaticHoldDurationSec += set.durationSec;
        }
      }
    }

    if (matchedInWorkout) {
      stats.completedWorkoutCount += 1;
      stats.strength.bestVolume = Math.max(stats.strength.bestVolume, workoutStrengthVolume);
      stats.cardio.bestDistanceM = Math.max(stats.cardio.bestDistanceM, workoutCardioDistanceM);
      if (workoutCardioDistanceM > 0 && workoutCardioDurationSec > 0) {
        const speedKmh = (workoutCardioDistanceM / workoutCardioDurationSec) * 3.6;
        stats.cardio.bestSpeedKmh = stats.cardio.bestSpeedKmh == null ? speedKmh : Math.max(stats.cardio.bestSpeedKmh, speedKmh);
      }
      stats.repsOnly.bestReps = Math.max(stats.repsOnly.bestReps, workoutRepsOnlyReps);
      stats.staticHold.bestDurationSec = Math.max(stats.staticHold.bestDurationSec, workoutStaticHoldDurationSec);
      stats.lastCompletedDate = stats.lastCompletedDate == null || workout.date > stats.lastCompletedDate
        ? workout.date
        : stats.lastCompletedDate;
    }
  }

  if (stats.lastCompletedDate) {
    const windowStart = dateOffset(stats.lastCompletedDate, -6);
    for (const workout of params.workouts) {
      if (workout.deletedAt || workout.endTime == null || workout.date < windowStart || workout.date > stats.lastCompletedDate) continue;
      for (const workoutExercise of workout.exercises) {
        if (!matchesExercise(workoutExercise.exerciseId, params.exerciseId, params.exercises)) continue;
        stats.recent7DaySetCount += workoutExercise.sets.length;
      }
    }
  }

  return stats;
}

function matchesExercise(sourceId: string, targetId: string, exercises: readonly ExerciseDoc[]): boolean {
  if (sourceId === targetId) return true;
  const resolved = resolveExerciseId(sourceId, exercises);
  return resolved.status === "resolved" && resolved.resolvedId === targetId;
}

function convertWeight(value: number, from: WeightUnit, to: WeightUnit): number {
  if (from === to) return value;
  return from === "lb" ? value * KG_PER_LB : value / KG_PER_LB;
}

function dateOffset(date: string, days: number): string {
  const result = new Date(`${date}T00:00:00.000Z`);
  result.setUTCDate(result.getUTCDate() + days);
  return result.toISOString().slice(0, 10);
}

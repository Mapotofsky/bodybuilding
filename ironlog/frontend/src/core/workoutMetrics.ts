import type { ExerciseType, WeightUnit } from "./models";

export const KG_PER_LB = 0.45359237;

export interface MetricSet {
  weight: number | null;
  reps: number | null;
  unit: WeightUnit;
  durationSec?: number | null;
  distanceM?: number | null;
}

export interface MetricExercise {
  exerciseType: ExerciseType;
  sets: readonly MetricSet[];
}

export interface WorkoutMetrics {
  totalSets: number;
  totalVolume: number;
  totalVolumeUnit: WeightUnit;
  totalDistanceM: number;
  totalDurationSec: number;
  totalReps: number;
}

export function convertWeight(value: number, from: WeightUnit, to: WeightUnit): number {
  if (from === to) return value;
  return from === "lb" ? value * KG_PER_LB : value / KG_PER_LB;
}

export function calculateStrengthVolume(sets: readonly MetricSet[], displayUnit: WeightUnit): number {
  return sets.reduce((sum, set) => {
    if (set.weight == null || set.reps == null) return sum;
    return sum + convertWeight(set.weight, set.unit, displayUnit) * set.reps;
  }, 0);
}

export function calculateWorkoutMetrics(exercises: readonly MetricExercise[], displayUnit: WeightUnit): WorkoutMetrics {
  return exercises.reduce<WorkoutMetrics>((metrics, exercise) => {
    metrics.totalSets += exercise.sets.length;
    if (exercise.exerciseType === "strength") {
      metrics.totalVolume += calculateStrengthVolume(exercise.sets, displayUnit);
      metrics.totalReps += exercise.sets.reduce((sum, set) => sum + (set.reps ?? 0), 0);
    } else if (exercise.exerciseType === "cardio") {
      metrics.totalDistanceM += exercise.sets.reduce((sum, set) => sum + (set.distanceM ?? 0), 0);
      metrics.totalDurationSec += exercise.sets.reduce((sum, set) => sum + (set.durationSec ?? 0), 0);
    } else if (exercise.exerciseType === "static_hold") {
      metrics.totalDurationSec += exercise.sets.reduce((sum, set) => sum + (set.durationSec ?? 0), 0);
    } else if (exercise.exerciseType === "reps_only") {
      metrics.totalReps += exercise.sets.reduce((sum, set) => sum + (set.reps ?? 0), 0);
    }
    return metrics;
  }, {
    totalSets: 0,
    totalVolume: 0,
    totalVolumeUnit: displayUnit,
    totalDistanceM: 0,
    totalDurationSec: 0,
    totalReps: 0,
  });
}

export function formatVolume(value: number, unit: WeightUnit): string {
  if (unit === "kg" && value >= 1000) return `${(value / 1000).toFixed(1)}t`;
  if (unit === "lb" && value >= 1000) return `${(value / 1000).toFixed(1)}k lb`;
  return `${Math.round(value)} ${unit}`;
}

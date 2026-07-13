import type { ExerciseType, WeightUnit } from "@/core/models";
import {
  calculateStrengthVolume,
  convertWeight,
  formatOneDecimal,
  formatVolume,
  type WorkoutMetrics,
} from "@/core/workoutMetrics";

export interface PresentableWorkoutSet {
  weight: number | null;
  reps: number | null;
  unit: WeightUnit;
  duration_sec: number | null;
  distance_m: number | null;
}

export function formatExerciseCompletion(
  type: ExerciseType,
  sets: readonly PresentableWorkoutSet[],
  displayUnit: WeightUnit
): { detail: string; value: string } {
  const count = sets.length;
  if (type === "strength") {
    const weights = sets
      .filter((set) => set.weight != null)
      .map((set) => convertWeight(set.weight as number, set.unit, displayUnit));
    const maxWeight = weights.length > 0 ? Math.max(...weights) : null;
    return {
      detail: `${count} 组 · 最大 ${maxWeight == null ? "—" : formatOneDecimal(maxWeight)} ${displayUnit}`,
      value: formatVolume(calculateStrengthVolume(sets, displayUnit), displayUnit),
    };
  }
  if (type === "cardio") {
    const distance = sum(sets.map((set) => set.distance_m ?? 0));
    const duration = sum(sets.map((set) => set.duration_sec ?? 0));
    return {
      detail: `${count} 组 · 共 ${formatDistance(distance)}`,
      value: formatDuration(duration),
    };
  }
  if (type === "static_hold") {
    const durations = sets.map((set) => set.duration_sec ?? 0);
    return {
      detail: `${count} 组 · 共 ${formatDuration(sum(durations))}`,
      value: `最长 ${formatDuration(Math.max(0, ...durations))}`,
    };
  }
  const reps = sets.map((set) => set.reps ?? 0);
  return {
    detail: `${count} 组 · 共 ${sum(reps)} 次`,
    value: `最多 ${Math.max(0, ...reps)} 次`,
  };
}

export function formatWorkoutPrimaryMetric(
  exerciseTypes: readonly ExerciseType[],
  metrics: WorkoutMetrics
): { label: string; value: string } {
  if (exerciseTypes.includes("strength")) {
    return { label: "训练容量", value: formatVolume(metrics.totalVolume, metrics.totalVolumeUnit) };
  }
  if (exerciseTypes.includes("cardio")) {
    return { label: "总距离", value: formatDistance(metrics.totalDistanceM) };
  }
  if (exerciseTypes.includes("static_hold")) {
    return { label: "保持时长", value: formatDuration(metrics.totalDurationSec) };
  }
  return { label: "完成次数", value: `${metrics.totalReps} 次` };
}

export function completionTimestamp(startTime: string, elapsedSeconds: number, fallback: string): string {
  const startMs = Date.parse(startTime);
  if (!Number.isFinite(startMs) || !Number.isFinite(elapsedSeconds) || elapsedSeconds < 0) return fallback;
  return new Date(startMs + Math.floor(elapsedSeconds) * 1000).toISOString();
}

export function formatDuration(seconds: number): string {
  const safeSeconds = Math.max(0, Math.round(seconds));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const remainder = safeSeconds % 60;
  if (hours > 0) return `${hours} 小时 ${minutes} 分`;
  if (minutes > 0) return `${minutes} 分 ${remainder} 秒`;
  return `${remainder} 秒`;
}

export function formatDistance(meters: number): string {
  if (meters >= 1000) return `${formatOneDecimal(meters / 1000)} km`;
  return `${formatOneDecimal(meters)} m`;
}

function sum(values: readonly number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

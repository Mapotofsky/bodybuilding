import type { WeightUnit } from "@/core/models";
import { getRecordingModeSpec } from "@/core/recordingModes";
import {
  calculateWorkoutMetrics,
  convertWeight,
  effectiveLoadKg,
  formatOneDecimal,
  formatVolume,
  type WorkoutMetrics,
} from "@/core/workoutMetrics";
import type { PresentableSet, RecordingSnapshot } from "@/utils/recordingPresentation";

export type PresentableWorkoutSet = PresentableSet;

export interface WorkoutSummaryMetricInput {
  total_volume: number;
  total_volume_unit: WeightUnit;
  total_distance_m: number;
  total_duration_sec: number;
  total_load_distance_kg_m: number;
  total_load_duration_kg_sec: number;
  total_reps: number;
}

export function formatExerciseCompletion(
  recording: RecordingSnapshot,
  sets: readonly PresentableWorkoutSet[],
  displayUnit: WeightUnit
): { detail: string; value: string } {
  const metrics = calculateWorkoutMetrics([{
    recordingMode: recording.recording_mode,
    loadBasis: recording.load_basis,
    loadDirection: recording.load_direction,
    rateMetric: recording.rate_metric,
    sets: sets.map(toMetricSet),
  }], displayUnit);
  const count = sets.length;

  switch (recording.recording_mode) {
    case "weight_reps": {
      const maxEffectiveKg = max(sets.map((set) => set.weight == null || !recording.load_basis ? null : effectiveLoadKg(set.weight, set.unit, recording.load_basis)));
      if (recording.load_direction === "lower_better") {
        const minAssistance = min(sets.map((set) => set.weight == null || !recording.load_basis
          ? null
          : convertWeight(effectiveLoadKg(set.weight, set.unit, recording.load_basis), "kg", displayUnit)));
        const maxReps = max(sets.map((set) => set.reps));
        return {
          detail: `${count} 组 · 最低辅助 ${minAssistance == null ? "—" : `${formatOneDecimal(minAssistance)} ${displayUnit}`}`,
          value: maxReps == null ? "最多 —" : `最多 ${maxReps} 次`,
        };
      }
      return {
        detail: `${count} 组 · 最大有效负重 ${maxEffectiveKg == null ? "—" : `${formatOneDecimal(convertWeight(maxEffectiveKg, "kg", displayUnit))} ${displayUnit}`}`,
        value: formatVolume(metrics.totalVolume, displayUnit),
      };
    }
    case "reps": {
      const maxReps = max(sets.map((set) => set.reps));
      return { detail: `${count} 组 · 共 ${metrics.totalReps} 次`, value: maxReps == null ? "最多 —" : `最多 ${maxReps} 次` };
    }
    case "duration": {
      const maxDuration = max(sets.map((set) => set.duration_sec));
      return { detail: `${count} 组 · 共 ${formatDuration(metrics.totalDurationSec)}`, value: maxDuration == null ? "最长 —" : `最长 ${formatDuration(maxDuration)}` };
    }
    case "distance_duration":
      return {
        detail: `${count} 组 · 共 ${formatDistance(metrics.totalDistanceM)}`,
        value: metrics.totalDurationSec > 0 ? formatDuration(metrics.totalDurationSec) : formatDistance(metrics.totalDistanceM),
      };
    case "weight_duration":
      return {
        detail: `${count} 组 · 共 ${formatDuration(metrics.totalDurationSec)}`,
        value: formatLoadMetric(metrics.totalLoadDurationKgSec, displayUnit, "s"),
      };
    case "weight_distance_duration":
      return {
        detail: `${count} 组 · ${metrics.totalDistanceM > 0 ? `共 ${formatDistance(metrics.totalDistanceM)}` : `共 ${formatDuration(metrics.totalDurationSec)}`}`,
        value: metrics.totalLoadDistanceKgM > 0
          ? formatLoadMetric(metrics.totalLoadDistanceKgM, displayUnit, "m")
          : formatLoadMetric(metrics.totalLoadDurationKgSec, displayUnit, "s"),
      };
  }
}

export function formatWorkoutPrimaryMetric(
  recordings: readonly RecordingSnapshot[],
  metrics: WorkoutMetrics
): { label: string; value: string } {
  const specs = recordings.map((recording) => getRecordingModeSpec(recording.recording_mode));
  if (specs.some((spec) => spec.performance.compound.includes("volume")) && metrics.totalVolume > 0) return { label: "训练容量", value: formatVolume(metrics.totalVolume, metrics.totalVolumeUnit) };
  if (specs.some((spec) => spec.performance.compound.includes("load_distance")) && metrics.totalLoadDistanceKgM > 0) return { label: "距离负载", value: formatLoadMetric(metrics.totalLoadDistanceKgM, metrics.totalVolumeUnit, "m") };
  if (specs.some((spec) => spec.performance.compound.includes("load_duration") || spec.performance.compound.includes("load_duration_without_distance")) && metrics.totalLoadDurationKgSec > 0) return { label: "持续负载", value: formatLoadMetric(metrics.totalLoadDurationKgSec, metrics.totalVolumeUnit, "s") };
  if (specs.some((spec) => spec.fields.includes("distanceM")) && metrics.totalDistanceM > 0) return { label: "总距离", value: formatDistance(metrics.totalDistanceM) };
  if (specs.some((spec) => spec.fields.includes("durationSec")) && metrics.totalDurationSec > 0) return { label: "保持时间", value: formatDuration(metrics.totalDurationSec) };
  return { label: "完成次数", value: `${metrics.totalReps} 次` };
}

export function splitMetricValue(value: string): { amount: string; unit: string } {
  const match = value.match(/^(-?\d+(?:\.\d+)?)\s+(.+)$/);
  return match ? { amount: match[1], unit: match[2] } : { amount: value, unit: "" };
}

export function formatExerciseAggregate(
  recording: RecordingSnapshot,
  aggregate: {
    volume: number;
    distance_m: number;
    duration_sec: number;
    reps: number;
    load_distance_kg_m: number;
    load_duration_kg_sec: number;
  },
  displayUnit: WeightUnit
): string {
  const spec = getRecordingModeSpec(recording.recording_mode);
  if (spec.performance.compound.includes("volume") && aggregate.volume > 0) return formatVolume(aggregate.volume, displayUnit);
  if (spec.performance.compound.includes("load_distance") && aggregate.load_distance_kg_m > 0) return formatLoadMetric(aggregate.load_distance_kg_m, displayUnit, "m");
  if ((spec.performance.compound.includes("load_duration") || spec.performance.compound.includes("load_duration_without_distance")) && aggregate.load_duration_kg_sec > 0) return formatLoadMetric(aggregate.load_duration_kg_sec, displayUnit, "s");
  if (spec.fields.includes("distanceM") && aggregate.distance_m > 0) return formatDistance(aggregate.distance_m);
  if (spec.fields.includes("durationSec") && aggregate.duration_sec > 0) return formatDuration(aggregate.duration_sec);
  return `${aggregate.reps} 次`;
}

export function formatWorkoutSummaryPrimaryMetric(summary: WorkoutSummaryMetricInput): { label: string; value: string } {
  if (summary.total_volume > 0) return { label: "训练容量", value: formatVolume(summary.total_volume, summary.total_volume_unit) };
  if (summary.total_load_distance_kg_m > 0) return { label: "距离负载", value: formatLoadMetric(summary.total_load_distance_kg_m, summary.total_volume_unit, "m") };
  if (summary.total_load_duration_kg_sec > 0) return { label: "持续负载", value: formatLoadMetric(summary.total_load_duration_kg_sec, summary.total_volume_unit, "s") };
  if (summary.total_distance_m > 0) return { label: "总距离", value: formatDistance(summary.total_distance_m) };
  if (summary.total_duration_sec > 0) return { label: "动作时长", value: formatDuration(summary.total_duration_sec) };
  return { label: "完成次数", value: `${summary.total_reps} 次` };
}

export function formatWorkoutSummariesPrimaryMetric(summaries: readonly WorkoutSummaryMetricInput[]): { label: string; value: string } {
  const unit = summaries[0]?.total_volume_unit ?? "kg";
  if (summaries.length === 0) return { label: "总容量", value: formatVolume(0, unit) };
  const metric = formatWorkoutSummaryPrimaryMetric(summaries.reduce<WorkoutSummaryMetricInput>((total, summary) => ({
    total_volume: total.total_volume + summary.total_volume,
    total_volume_unit: unit,
    total_distance_m: total.total_distance_m + summary.total_distance_m,
    total_duration_sec: total.total_duration_sec + summary.total_duration_sec,
    total_load_distance_kg_m: total.total_load_distance_kg_m + summary.total_load_distance_kg_m,
    total_load_duration_kg_sec: total.total_load_duration_kg_sec + summary.total_load_duration_kg_sec,
    total_reps: total.total_reps + summary.total_reps,
  }), {
    total_volume: 0,
    total_volume_unit: unit,
    total_distance_m: 0,
    total_duration_sec: 0,
    total_load_distance_kg_m: 0,
    total_load_duration_kg_sec: 0,
    total_reps: 0,
  }));
  const monthlyLabels: Record<string, string> = {
    训练容量: "总容量",
    距离负载: "总距离负载",
    持续负载: "总持续负载",
    总距离: "总距离",
    动作时长: "动作时长",
    完成次数: "完成次数",
  };
  return { ...metric, label: monthlyLabels[metric.label] ?? metric.label };
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

function toMetricSet(set: PresentableWorkoutSet) {
  return {
    weight: set.weight,
    reps: set.reps,
    unit: set.unit,
    durationSec: set.duration_sec,
    distanceM: set.distance_m,
  };
}

function formatLoadMetric(valueKg: number, displayUnit: WeightUnit, suffix: "m" | "s"): string {
  return `${formatOneDecimal(convertWeight(valueKg, "kg", displayUnit))} ${displayUnit}·${suffix}`;
}

function max(values: readonly (number | null)[]): number | null {
  const present = values.filter((value): value is number => value != null);
  return present.length > 0 ? Math.max(...present) : null;
}

function min(values: readonly (number | null)[]): number | null {
  const present = values.filter((value): value is number => value != null);
  return present.length > 0 ? Math.min(...present) : null;
}

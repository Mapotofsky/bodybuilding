import type {
  LoadBasis,
  LoadDirection,
  PerformanceInputSummary,
  PerformanceMetricType,
  PerformanceUnit,
  RateMetric,
  RecordingMode,
  RmFormulaResults,
  WeightUnit,
} from "@/core/models";
import { getRecordingModeSpec, type RecordingField } from "@/core/recordingModes";
import {
  calculateSetDistanceRateMps,
  calculateSetLoadDistanceKgM,
  calculateSetLoadDistanceRateKgMps,
  calculateSetLoadDurationKgSec,
  calculateSetVolumeKgReps,
  convertWeight,
  formatOneDecimal,
} from "@/core/workoutMetrics";
import {
  LOAD_BASIS_LABELS,
  LOAD_DIRECTION_LABELS,
  RATE_METRIC_LABELS,
  RECORDING_MODE_LABELS,
} from "@/types";

export interface RecordingSnapshot {
  recording_mode: RecordingMode;
  load_basis: LoadBasis | null;
  load_direction: LoadDirection | null;
  rate_metric: RateMetric;
}

export interface PresentableSet {
  weight: number | null;
  reps: number | null;
  unit: WeightUnit;
  distance_m: number | null;
  duration_sec: number | null;
}

export interface PresentablePerformanceMetric {
  metric_type: PerformanceMetricType;
  value: number;
  unit: PerformanceUnit;
  input: PerformanceInputSummary;
  rm: RmFormulaResults | null;
}

export interface FormattedSetMetric {
  label: string;
  value: string;
}

export function recordingSnapshot(value: RecordingSnapshot): RecordingSnapshot {
  return {
    recording_mode: value.recording_mode,
    load_basis: value.load_basis,
    load_direction: value.load_direction,
    rate_metric: value.rate_metric,
  };
}

export function recordingSnapshotEquals(left: RecordingSnapshot, right: RecordingSnapshot): boolean {
  return left.recording_mode === right.recording_mode
    && left.load_basis === right.load_basis
    && left.load_direction === right.load_direction
    && left.rate_metric === right.rate_metric;
}

export function weightFieldLabel(recording: Pick<RecordingSnapshot, "load_basis" | "load_direction">): string {
  if (recording.load_direction === "lower_better") return "辅助重量";
  return recording.load_basis === "per_hand" ? "每手重量" : "重量";
}

export function formatSet(recording: RecordingSnapshot, set: PresentableSet): string {
  const fields = getRecordingModeSpec(recording.recording_mode).fields
    .map((field) => formatSetField(field, recording, set))
    .filter((value): value is string => value != null);

  if (recording.recording_mode === "weight_reps" && fields.length === 2) {
    return `${fields[0]} × ${fields[1]}`;
  }
  return fields.length > 0 ? fields.join(" · ") : "未填写";
}

export function formatRecordingDescription(recording: RecordingSnapshot): string {
  const parts = [RECORDING_MODE_LABELS[recording.recording_mode]];
  if (recording.load_basis) parts.push(LOAD_BASIS_LABELS[recording.load_basis]);
  if (recording.load_direction) parts.push(LOAD_DIRECTION_LABELS[recording.load_direction]);
  if (recording.rate_metric !== "none") parts.push(RATE_METRIC_LABELS[recording.rate_metric]);
  return parts.join(" · ");
}

export function formatSetMetrics(recording: RecordingSnapshot, set: PresentableSet, displayUnit: WeightUnit): FormattedSetMetric[] {
  if (recording.load_direction === "lower_better") return [];
  const metricSet = {
    weight: set.weight,
    reps: set.reps,
    unit: set.unit,
    distanceM: set.distance_m,
    durationSec: set.duration_sec,
  };
  switch (recording.recording_mode) {
    case "weight_reps": {
      if (!recording.load_basis) return [];
      const value = calculateSetVolumeKgReps(metricSet, recording.load_basis);
      return value == null ? [] : [{ label: "容量", value: formatMassMetric(value, displayUnit, "次") }];
    }
    case "weight_duration": {
      if (!recording.load_basis) return [];
      const value = calculateSetLoadDurationKgSec(metricSet, recording.load_basis);
      return value == null ? [] : [{ label: "持续负载", value: formatMassMetric(value, displayUnit, "s") }];
    }
    case "weight_distance_duration": {
      if (!recording.load_basis) return [];
      const values: FormattedSetMetric[] = [];
      const distanceLoad = calculateSetLoadDistanceKgM(metricSet, recording.load_basis);
      if (distanceLoad != null) values.push({ label: "距离负载", value: formatMassMetric(distanceLoad, displayUnit, "m") });
      if (set.distance_m == null) {
        const durationLoad = calculateSetLoadDurationKgSec(metricSet, recording.load_basis);
        if (durationLoad != null) values.push({ label: "持续负载", value: formatMassMetric(durationLoad, displayUnit, "s") });
      }
      if (recording.rate_metric === "load_distance_per_time") {
        const rate = calculateSetLoadDistanceRateKgMps(metricSet, recording.load_basis);
        if (rate != null) values.push({ label: "单位时间负载", value: formatMassMetric(rate, displayUnit, "m/s", 2) });
      }
      return values;
    }
    case "distance_duration": {
      if (recording.rate_metric !== "distance_per_time") return [];
      const rate = calculateSetDistanceRateMps(metricSet);
      return rate == null ? [] : [{ label: "速度", value: `${formatTwoDecimals(rate)} m/s` }];
    }
    case "reps":
    case "duration":
      return [];
  }
}

export function formatPerformanceMetric(metric: PresentablePerformanceMetric, displayUnit: WeightUnit): string {
  if (metric.metric_type === "rm.rpe_adjusted_mean" && metric.rm) {
    const mean = convertWeight(metric.rm.meanKg, "kg", displayUnit);
    const standardDeviation = convertWeight(metric.rm.standardDeviationKg, "kg", displayUnit);
    return `${formatOneDecimal(mean)} ± ${formatOneDecimal(standardDeviation)} ${displayUnit}`;
  }

  const value = displayPerformanceScalar(metric.value, metric.unit, displayUnit);
  switch (metric.unit) {
    case "kg": return `${formatOneDecimal(value)} ${displayUnit}`;
    case "kg_reps": return `${formatOneDecimal(value)} ${displayUnit}·次`;
    case "kg_seconds": return `${formatOneDecimal(value)} ${displayUnit}·s`;
    case "kg_meters": return `${formatOneDecimal(value)} ${displayUnit}·m`;
    case "kg_meters_per_second": return `${formatTwoDecimals(value)} ${displayUnit}·m/s`;
    case "m": return `${formatOneDecimal(value)} m`;
    case "sec": return formatCompactDuration(value);
    case "m_per_sec": return `${formatTwoDecimals(value)} m/s`;
    case "reps": return `${formatOneDecimal(value)} 次`;
  }
}

export function formatPerformanceInput(input: PerformanceInputSummary, displayUnit: WeightUnit): string {
  const parts: string[] = [];
  if (input.enteredLoad != null && input.enteredLoadUnit) {
    const prefix = input.loadDirection === "lower_better"
      ? "辅助"
      : input.loadBasis === "per_hand" ? "每手" : "";
    parts.push(`${prefix ? `${prefix} ` : ""}${formatNumber(input.enteredLoad)} ${input.enteredLoadUnit}`);
  } else if (input.effectiveLoadKg != null) {
    parts.push(`${formatOneDecimal(convertWeight(input.effectiveLoadKg, "kg", displayUnit))} ${displayUnit}`);
  }
  if (input.reps != null) parts.push(`${formatNumber(input.reps)} 次`);
  if (input.distanceM != null) parts.push(`${formatNumber(input.distanceM)} m`);
  if (input.durationSec != null) parts.push(formatCompactDuration(input.durationSec));
  if (input.rpe != null) parts.push(`RPE ${formatNumber(input.rpe)}`);
  return parts.join(" · ");
}

export function displayPerformanceScalar(value: number, unit: PerformanceUnit, displayUnit: WeightUnit): number {
  switch (unit) {
    case "kg":
    case "kg_reps":
    case "kg_seconds":
    case "kg_meters":
    case "kg_meters_per_second":
      return convertWeight(value, "kg", displayUnit);
    case "m":
    case "sec":
    case "m_per_sec":
    case "reps":
      return value;
  }
}

export function displayPerformanceUnit(unit: PerformanceUnit, displayUnit: WeightUnit): string {
  switch (unit) {
    case "kg": return displayUnit;
    case "kg_reps": return `${displayUnit}·次`;
    case "kg_seconds": return `${displayUnit}·s`;
    case "kg_meters": return `${displayUnit}·m`;
    case "kg_meters_per_second": return `${displayUnit}·m/s`;
    case "m": return "m";
    case "sec": return "s";
    case "m_per_sec": return "m/s";
    case "reps": return "次";
  }
}

export function formatCompactDuration(seconds: number): string {
  const rounded = Math.round(seconds);
  const minutes = Math.floor(rounded / 60);
  const remainder = rounded % 60;
  if (minutes <= 0) return `${remainder} s`;
  return remainder === 0 ? `${minutes} min` : `${minutes}:${String(remainder).padStart(2, "0")}`;
}

function formatNumber(value: number): string {
  return String(Math.round(value * 100) / 100);
}

function formatSetField(field: RecordingField, recording: RecordingSnapshot, set: PresentableSet): string | null {
  switch (field) {
    case "weight": {
      if (set.weight == null) return null;
      const prefix = recording.load_direction === "lower_better"
        ? "辅助"
        : recording.load_basis === "per_hand" ? "每手" : "";
      return `${prefix ? `${prefix} ` : ""}${formatNumber(set.weight)} ${set.unit}`;
    }
    case "reps": return set.reps == null ? null : `${formatNumber(set.reps)} 次`;
    case "distanceM": return set.distance_m == null ? null : `${formatNumber(set.distance_m)} m`;
    case "durationSec": return set.duration_sec == null ? null : formatCompactDuration(set.duration_sec);
  }
}

function formatMassMetric(valueKg: number, displayUnit: WeightUnit, suffix: "次" | "s" | "m" | "m/s", decimals = 1): string {
  const value = convertWeight(valueKg, "kg", displayUnit);
  const formatted = decimals === 2 ? formatTwoDecimals(value) : formatOneDecimal(value);
  return `${formatted} ${displayUnit}·${suffix}`;
}

function formatTwoDecimals(value: number): string {
  return (Math.round(value * 100) / 100).toFixed(2);
}

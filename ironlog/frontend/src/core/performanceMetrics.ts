import type { PerformanceMetricType, PerformanceUnit } from "./models";

export type MetricDirection = "min" | "max";

export interface PerformanceMetricSpec {
  unit: PerformanceUnit;
  direction: MetricDirection;
  tieBreakerDirections: readonly MetricDirection[];
}

export const PERFORMANCE_METRIC_SPECS = {
  "weight.max": { unit: "kg", direction: "max", tieBreakerDirections: ["max", "max", "max"] },
  "reps.max_set": { unit: "reps", direction: "max", tieBreakerDirections: ["max"] },
  "reps.max_workout": { unit: "reps", direction: "max", tieBreakerDirections: ["max"] },
  "volume.max_set": { unit: "kg_reps", direction: "max", tieBreakerDirections: ["max", "max"] },
  "volume.max_workout": { unit: "kg_reps", direction: "max", tieBreakerDirections: ["max"] },
  "rm.rpe_adjusted_mean": { unit: "kg", direction: "max", tieBreakerDirections: ["max", "max"] },
  "assistance.best_reps": { unit: "reps", direction: "max", tieBreakerDirections: ["min"] },
  "assistance.min_weight": { unit: "kg", direction: "min", tieBreakerDirections: ["max"] },
  "distance.max_set": { unit: "m", direction: "max", tieBreakerDirections: ["min"] },
  "distance.max_workout": { unit: "m", direction: "max", tieBreakerDirections: ["min"] },
  "duration.max_set": { unit: "sec", direction: "max", tieBreakerDirections: ["max"] },
  "duration.max_workout": { unit: "sec", direction: "max", tieBreakerDirections: ["max"] },
  "speed.max": { unit: "m_per_sec", direction: "max", tieBreakerDirections: ["max", "min"] },
  "load_duration.max": { unit: "kg_seconds", direction: "max", tieBreakerDirections: ["max", "max"] },
  "load_distance.max": { unit: "kg_meters", direction: "max", tieBreakerDirections: ["max", "max", "min"] },
  "load_distance_rate.max": { unit: "kg_meters_per_second", direction: "max", tieBreakerDirections: ["max", "max", "min"] },
} as const satisfies Record<PerformanceMetricType, PerformanceMetricSpec>;

export function getPerformanceMetricSpec(metricType: PerformanceMetricType): PerformanceMetricSpec {
  return PERFORMANCE_METRIC_SPECS[metricType];
}

export function compareMetricValues(left: number, right: number, direction: MetricDirection): number {
  if (left === right) return 0;
  return direction === "max" ? left - right : right - left;
}

export function comparePerformanceValues(params: {
  metricType: PerformanceMetricType;
  leftValue: number;
  rightValue: number;
  leftTieBreakers?: readonly number[];
  rightTieBreakers?: readonly number[];
}): number {
  const spec = getPerformanceMetricSpec(params.metricType);
  const primary = compareMetricValues(params.leftValue, params.rightValue, spec.direction);
  if (primary !== 0) return primary;
  const left = params.leftTieBreakers ?? [];
  const right = params.rightTieBreakers ?? [];
  for (let index = 0; index < spec.tieBreakerDirections.length; index += 1) {
    const compared = compareMetricValues(left[index] ?? 0, right[index] ?? 0, spec.tieBreakerDirections[index]);
    if (compared !== 0) return compared;
  }
  return 0;
}

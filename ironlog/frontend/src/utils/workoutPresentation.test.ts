import { describe, expect, it } from "vitest";
import { calculateWorkoutMetrics } from "@/core/workoutMetrics";
import { completionTimestamp, formatExerciseCompletion, formatWorkoutPrimaryMetric, formatWorkoutSummaryPrimaryMetric, splitMetricValue } from "./workoutPresentation";

const emptyStrengthFields = { weight: null, reps: null, unit: "kg" as const };
const durationRecording = { recording_mode: "duration", load_basis: null, count_basis: "whole_set", load_direction: null, rate_metric: "none" } as const;
const repsRecording = { recording_mode: "reps", load_basis: null, count_basis: "whole_set", load_direction: null, rate_metric: "none" } as const;
const distanceRecording = { recording_mode: "distance_duration", load_basis: null, count_basis: "whole_set", load_direction: null, rate_metric: "distance_per_time" } as const;

describe("workout completion presentation", () => {
  it("does not show kg or strength volume for the static-hold completion issue", () => {
    const summary = formatExerciseCompletion(durationRecording, [
      { ...emptyStrengthFields, duration_sec: 45, distance_m: null },
      { ...emptyStrengthFields, duration_sec: 60, distance_m: null },
    ], "kg");

    expect(summary).toEqual({ detail: "2 组 · 共 1 分 45 秒", value: "最长 1 分 0 秒" });
    expect(`${summary.detail}${summary.value}`).not.toContain("kg");
  });

  it("uses type-specific aggregate metrics for reps-only and cardio workouts", () => {
    const repsMetrics = calculateWorkoutMetrics([{ recordingMode: "reps", loadBasis: null, countBasis: "whole_set", loadDirection: null, rateMetric: "none", sets: [
      { ...emptyStrengthFields, reps: 12, durationSec: null, distanceM: null },
    ] }], "kg");
    const cardioMetrics = calculateWorkoutMetrics([{ recordingMode: "distance_duration", loadBasis: null, countBasis: "whole_set", loadDirection: null, rateMetric: "distance_per_time", sets: [
      { ...emptyStrengthFields, durationSec: 600, distanceM: 1500 },
    ] }], "kg");

    expect(formatWorkoutPrimaryMetric([repsRecording], repsMetrics)).toEqual({ label: "完成次数", value: "12 次" });
    expect(formatWorkoutPrimaryMetric([distanceRecording], cardioMetrics)).toEqual({ label: "总距离", value: "1.5 km" });
  });

  it("freezes the persisted completion time at the displayed elapsed duration", () => {
    expect(completionTimestamp("2026-07-12T08:00:00.000Z", 125, "fallback"))
      .toBe("2026-07-12T08:02:05.000Z");
    expect(completionTimestamp("", 125, "fallback")).toBe("fallback");
  });

  it("does not invent zero maxima for blank draft sets", () => {
    expect(formatExerciseCompletion(repsRecording, [
      { ...emptyStrengthFields, duration_sec: null, distance_m: null },
    ], "kg").value).toBe("最多 —");
    expect(formatExerciseCompletion(durationRecording, [
      { ...emptyStrengthFields, duration_sec: null, distance_m: null },
    ], "kg").value).toBe("最长 —");
  });

  it("compares lower-better assistance after mixed units are converted", () => {
    const recording = { recording_mode: "weight_reps", load_basis: "total", count_basis: "whole_set", load_direction: "lower_better", rate_metric: "none" } as const;
    const summary = formatExerciseCompletion(recording, [
      { weight: 50, reps: 8, unit: "lb", duration_sec: null, distance_m: null },
      { weight: 24, reps: 8, unit: "kg", duration_sec: null, distance_m: null },
    ], "kg");

    expect(summary.detail).toBe("2 组 · 最低辅助重量 22.7 kg");
  });

  it("uses farmer-walk distance load as the workout summary primary metric", () => {
    expect(formatWorkoutSummaryPrimaryMetric({
      total_volume: 0,
      total_volume_unit: "kg",
      total_distance_m: 40,
      total_duration_sec: 28,
      total_load_distance_kg_m: 2560,
      total_load_duration_kg_sec: 0,
      total_reps: 0,
    })).toEqual({ label: "距离负载", value: "2560.0 kg·m" });
  });

  it("splits the primary metric amount from its unit for compact completion layout", () => {
    expect(splitMetricValue("400.0 kg·m")).toEqual({ amount: "400.0", unit: "kg·m" });
    expect(splitMetricValue("60.0 kg·次")).toEqual({ amount: "60.0", unit: "kg·次" });
    expect(splitMetricValue("1 分 3 秒")).toEqual({ amount: "1", unit: "分 3 秒" });
  });
});

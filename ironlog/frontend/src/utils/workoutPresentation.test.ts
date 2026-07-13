import { describe, expect, it } from "vitest";
import { calculateWorkoutMetrics } from "@/core/workoutMetrics";
import { completionTimestamp, formatExerciseCompletion, formatWorkoutPrimaryMetric } from "./workoutPresentation";

const emptyStrengthFields = { weight: null, reps: null, unit: "kg" as const };

describe("workout completion presentation", () => {
  it("does not show kg or strength volume for the static-hold completion issue", () => {
    const summary = formatExerciseCompletion("static_hold", [
      { ...emptyStrengthFields, duration_sec: 45, distance_m: null },
      { ...emptyStrengthFields, duration_sec: 60, distance_m: null },
    ], "kg");

    expect(summary).toEqual({ detail: "2 组 · 共 1 分 45 秒", value: "最长 1 分 0 秒" });
    expect(`${summary.detail}${summary.value}`).not.toContain("kg");
  });

  it("uses type-specific aggregate metrics for reps-only and cardio workouts", () => {
    const repsMetrics = calculateWorkoutMetrics([{ exerciseType: "reps_only", sets: [
      { ...emptyStrengthFields, reps: 12, durationSec: null, distanceM: null },
    ] }], "kg");
    const cardioMetrics = calculateWorkoutMetrics([{ exerciseType: "cardio", sets: [
      { ...emptyStrengthFields, durationSec: 600, distanceM: 1500 },
    ] }], "kg");

    expect(formatWorkoutPrimaryMetric(["reps_only"], repsMetrics)).toEqual({ label: "完成次数", value: "12 次" });
    expect(formatWorkoutPrimaryMetric(["cardio"], cardioMetrics)).toEqual({ label: "总距离", value: "1.5 km" });
  });

  it("freezes the persisted completion time at the displayed elapsed duration", () => {
    expect(completionTimestamp("2026-07-12T08:00:00.000Z", 125, "fallback"))
      .toBe("2026-07-12T08:02:05.000Z");
    expect(completionTimestamp("", 125, "fallback")).toBe("fallback");
  });
});

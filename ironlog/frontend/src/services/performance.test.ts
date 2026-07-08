import { describe, expect, it } from "vitest";
import { makeEmptySnapshot } from "@/core/migrations";
import type { WorkoutDoc } from "@/core/models";
import { calculateRpeAdjustedRm } from "@/core/rm";
import { buildExercisePerformanceTrend, buildPerformanceRecords } from "./performance";

describe("exercise performance records", () => {
  it("emits only historical refresh events and skips warmups and missing RPE for RM", () => {
    const snapshot = makeEmptySnapshot("device-test");
    snapshot.workouts = [
      workout("w1", "2026-06-01", [
        set("warmup", 1, 120, 1, 10, true),
        set("set-1", 2, 100, 5, null, false),
      ]),
      workout("w2", "2026-06-02", [
        set("set-2", 1, 100, 5, null, false),
        set("set-3", 2, 105, 5, 8, false),
      ]),
      workout("draft", "2026-06-03", [
        set("draft-set", 1, 200, 1, 10, false),
      ], null),
    ];

    const records = buildPerformanceRecords(snapshot.workouts, snapshot.exercises);

    expect(records.find((record) => record.sourceSetId === "warmup")).toBeUndefined();
    expect(records.find((record) => record.sourceWorkoutId === "draft")).toBeUndefined();
    expect(records.filter((record) => record.metricType === "strength.rpe_adjusted_rm_mean")).toHaveLength(1);
    expect(records.filter((record) => record.metricType === "strength.max_weight").map((record) => record.sourceSetId)).toEqual(["set-1", "set-3"]);
    expect(records.map((record) => record.id)).toEqual([...new Set(records.map((record) => record.id))]);
  });

  it("builds strength trend from each workout's best RPE-adjusted 1RM", () => {
    const snapshot = makeEmptySnapshot("device-test");
    snapshot.workouts = [
      workout("w1", "2026-06-01", [
        set("w1-set", 1, 100, 5, 8, false),
      ]),
      workout("w2", "2026-06-02", [
        set("w2-heavy", 1, 120, 1, 10, false),
        set("w2-rm", 2, 100, 8, 8, false),
      ]),
      workout("no-rpe", "2026-06-03", [
        set("no-rpe-set", 1, 200, 1, null, false),
      ]),
    ];

    const trend = buildExercisePerformanceTrend(snapshot.workouts, snapshot.exercises, "ex-bench-press", "strength");

    expect(trend.metric_type).toBe("strength.rpe_adjusted_rm_mean");
    expect(trend.metric_label).toBe("1RM 预测");
    expect(trend.points).toHaveLength(2);
    expect(trend.points.map((point) => point.date)).toEqual(["2026-06-01", "2026-06-02"]);
    expect(trend.points[0].value).toBeCloseTo(calculateRpeAdjustedRm({ weightKg: 100, reps: 5, rpe: 8 })!.formulas.meanKg, 5);
    expect(trend.points[1].value).toBeCloseTo(calculateRpeAdjustedRm({ weightKg: 100, reps: 8, rpe: 8 })!.formulas.meanKg, 5);
  });

  it("builds cardio trend from each workout's best average speed", () => {
    const snapshot = makeEmptySnapshot("device-test");
    snapshot.workouts = [
      cardioWorkout("run-1", "2026-06-01", [
        cardioSet("run-1-long", 1, 1000, 400),
        cardioSet("run-1-fast", 2, 500, 100),
      ]),
      cardioWorkout("run-2", "2026-06-02", [
        cardioSet("run-2-fast", 1, 1200, 300),
      ]),
    ];

    const trend = buildExercisePerformanceTrend(snapshot.workouts, snapshot.exercises, "ex-running", "cardio");

    expect(trend.metric_type).toBe("cardio.best_average_speed");
    expect(trend.metric_label).toBe("最佳平均速度");
    expect(trend.points.map((point) => point.value)).toEqual([5, 4]);
  });
});

function workout(id: string, date: string, sets: WorkoutDoc["exercises"][number]["sets"], endTime: string | null = `${date}T11:00:00.000Z`): WorkoutDoc {
  return {
    id,
    date,
    startTime: `${date}T10:00:00.000Z`,
    endTime,
    planTemplateId: null,
    note: null,
    mood: null,
    exercises: [{
      id: `${id}-exercise`,
      exerciseId: "ex-bench-press",
      exerciseType: "strength",
      sortOrder: 0,
      supersetGroup: null,
      sets,
    }],
    createdAt: `${date}T10:00:00.000Z`,
    updatedAt: `${date}T11:00:00.000Z`,
    deletedAt: null,
    schemaVersion: 2,
  };
}

function set(id: string, setNumber: number, weight: number, reps: number, rpe: number | null, isWarmup: boolean) {
  return {
    id,
    setNumber,
    weight,
    reps,
    unit: "kg" as const,
    durationSec: null,
    distanceM: null,
    rpe,
    isWarmup,
    isFailure: false,
    restSeconds: null,
  };
}

function cardioWorkout(id: string, date: string, sets: WorkoutDoc["exercises"][number]["sets"]): WorkoutDoc {
  return {
    id,
    date,
    startTime: `${date}T10:00:00.000Z`,
    endTime: `${date}T11:00:00.000Z`,
    planTemplateId: null,
    note: null,
    mood: null,
    exercises: [{
      id: `${id}-exercise`,
      exerciseId: "ex-running",
      exerciseType: "cardio",
      sortOrder: 0,
      supersetGroup: null,
      sets,
    }],
    createdAt: `${date}T10:00:00.000Z`,
    updatedAt: `${date}T11:00:00.000Z`,
    deletedAt: null,
    schemaVersion: 2,
  };
}

function cardioSet(id: string, setNumber: number, distanceM: number, durationSec: number) {
  return {
    id,
    setNumber,
    weight: null,
    reps: null,
    unit: "kg" as const,
    durationSec,
    distanceM,
    rpe: null,
    isWarmup: false,
    isFailure: false,
    restSeconds: null,
  };
}

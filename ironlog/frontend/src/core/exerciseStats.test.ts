import { describe, expect, it } from "vitest";
import { makeEmptySnapshot } from "./migrations";
import { buildExercisePersonalStats } from "./exerciseStats";
import type { WorkoutDoc } from "./models";

describe("exercise personal stats", () => {
  it("uses completed local workouts, replacement resolution, warmup rules, and current weight unit", () => {
    const snapshot = makeEmptySnapshot("device-test");
    snapshot.exercises.push({
      id: "custom-ex-old",
      name: "旧动作",
      category: "core",
      recordingMode: "reps",
      loadBasis: null,
      loadDirection: null,
      rateMetric: "none",
      equipment: null,
      description: null,
      primaryMuscleGroupIds: [],
      secondaryMuscleGroupIds: [],
      isCustom: true,
      replacedByExerciseId: "ex-dead-bug",
      createdAt: "2026-06-20T00:00:00.000Z",
      updatedAt: "2026-06-21T00:00:00.000Z",
      deletedAt: "2026-06-21T00:00:00.000Z",
      schemaVersion: 4,
    });
    snapshot.workouts = [
      workout("done", "2026-06-21", "2026-06-21T11:00:00.000Z", [
        { id: "warmup", setNumber: 1, weight: 100, reps: 10, unit: "lb" as const, durationSec: null, distanceM: null, rpe: null, isWarmup: true, isFailure: false, restSeconds: null },
        { id: "work", setNumber: 2, weight: 100, reps: 5, unit: "lb" as const, durationSec: null, distanceM: null, rpe: null, isWarmup: false, isFailure: false, restSeconds: null },
      ]),
      workout("recent", "2026-06-16", "2026-06-16T11:00:00.000Z", [
        { id: "recent-set", setNumber: 1, weight: 60, reps: 3, unit: "kg" as const, durationSec: null, distanceM: null, rpe: null, isWarmup: false, isFailure: false, restSeconds: null },
      ]),
      workout("old", "2026-06-14", "2026-06-14T11:00:00.000Z", [
        { id: "old-set", setNumber: 1, weight: 60, reps: 3, unit: "kg" as const, durationSec: null, distanceM: null, rpe: null, isWarmup: false, isFailure: false, restSeconds: null },
      ]),
      workout("draft", "2026-06-22", null, [
        { id: "draft-set", setNumber: 1, weight: 200, reps: 5, unit: "lb" as const, durationSec: null, distanceM: null, rpe: null, isWarmup: false, isFailure: false, restSeconds: null },
      ]),
      { ...workout("deleted", "2026-06-23", "2026-06-23T11:00:00.000Z", []), deletedAt: "2026-06-24T00:00:00.000Z" },
    ];

    const stats = buildExercisePersonalStats({
      exerciseId: "ex-dead-bug",
      exercises: snapshot.exercises,
      workouts: snapshot.workouts,
      weightUnit: "kg",
      today: "2026-06-25",
    });

    expect(stats.completedWorkoutCount).toBe(3);
    expect(stats.totalSetCount).toBe(4);
    expect(stats.workingSetCount).toBe(3);
    expect(stats.recent7DaySetCount).toBe(2);
    expect(stats.lastCompletedDate).toBe("2026-06-21");
    expect(stats.performance.bestInputLoad).toBe(60);
    expect(stats.performance.bestEffectiveLoad).toBe(60);
    expect(stats.performance.bestSetVolume).toBeCloseTo(226.796185);
    expect(stats.performance.bestWorkoutVolume).toBeCloseTo(226.796185);
    expect(stats.performance.displayUnit).toBe("kg");
    expect(stats.performance.loadBasis).toBe("total");
    expect(stats.performance.loadDirection).toBe("higher_better");
  });

  it("does not reinterpret snapshots or produce order-dependent generic load bests across incompatible history", () => {
    const snapshot = makeEmptySnapshot("device-test");
    const total = workout("total", "2026-06-20", "2026-06-20T11:00:00.000Z", [
      { id: "total-set", setNumber: 1, weight: 100, reps: 1, unit: "kg", durationSec: null, distanceM: null, rpe: null, isWarmup: false, isFailure: false, restSeconds: null },
    ]);
    total.exercises[0].exerciseId = "ex-bench-press";
    const perHand = workout("per-hand", "2026-06-21", "2026-06-21T11:00:00.000Z", [
      { id: "per-hand-set", setNumber: 1, weight: 60, reps: 1, unit: "kg", durationSec: null, distanceM: null, rpe: null, isWarmup: false, isFailure: false, restSeconds: null },
    ]);
    perHand.exercises[0].exerciseId = "ex-bench-press";
    perHand.exercises[0].loadBasis = "per_hand";
    const params = { exerciseId: "ex-bench-press", exercises: snapshot.exercises, weightUnit: "kg" as const, today: "2026-06-25" };

    const forward = buildExercisePersonalStats({ ...params, workouts: [total, perHand] });
    const reverse = buildExercisePersonalStats({ ...params, workouts: [perHand, total] });

    expect(forward.performance).toMatchObject({ bestInputLoad: null, bestEffectiveLoad: null, loadBasis: null, loadDirection: null, bestSetVolume: 120 });
    expect(reverse.performance).toEqual(forward.performance);
    expect(perHand.exercises[0]).toMatchObject({ loadBasis: "per_hand", recordingMode: "weight_reps" });
  });
});

function workout(id: string, date: string, endTime: string | null, sets: WorkoutDoc["exercises"][number]["sets"]): WorkoutDoc {
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
      exerciseId: "custom-ex-old",
      recordingMode: "weight_reps",
      loadBasis: "total",
      loadDirection: "higher_better",
      rateMetric: "none",
      sortOrder: 0,
      supersetGroup: null,
      sets,
    }],
    createdAt: `${date}T10:00:00.000Z`,
    updatedAt: `${date}T10:00:00.000Z`,
    deletedAt: null,
    schemaVersion: 4,
  };
}

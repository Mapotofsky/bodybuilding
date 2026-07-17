import { describe, expect, it } from "vitest";
import { makeEmptySnapshot } from "./migrations";
import { buildExercisePersonalStats } from "./exerciseStats";
import { CURRENT_SCHEMA_VERSION, type WorkoutDoc } from "./models";

describe("exercise personal stats", () => {
  it("uses completed local workouts, replacement resolution, warmup rules, and current weight unit", () => {
    const snapshot = makeEmptySnapshot("device-test");
    snapshot.exercises.push({
      id: "custom-ex-old",
      name: "旧动作",
      category: "core",
      recordingMode: "reps",
      loadBasis: null,
      countBasis: "whole_set",
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
      schemaVersion: CURRENT_SCHEMA_VERSION,
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
    expect(stats.performance.bestLoad).toBe(60);
    expect(stats.performance.bestSetVolume).toBeCloseTo(226.796185);
    expect(stats.performance.bestWorkoutVolume).toBeCloseTo(226.796185);
    expect(stats.performance.displayUnit).toBe("kg");
    expect(stats.performance.loadBasis).toBe("total");
    expect(stats.performance.countBasis).toBe("whole_set");
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

    expect(forward.performance).toMatchObject({ bestLoad: null, loadBasis: null, countBasis: null, loadDirection: null, bestSetVolume: 120 });
    expect(reverse.performance).toEqual(forward.performance);
    expect(perHand.exercises[0]).toMatchObject({ loadBasis: "per_hand", recordingMode: "weight_reps" });
  });

  it("keeps a stable per-side input convention for non-weighted repetition and duration PRs", () => {
    const snapshot = makeEmptySnapshot("device-test");
    const splitSquat = noLoadWorkout(
      "split-squat",
      "2026-06-21",
      "ex-bodyweight-split-squat",
      "reps",
      "per_side",
      { id: "split-squat-set", setNumber: 1, weight: null, reps: 12, unit: "kg", durationSec: null, distanceM: null, rpe: null, isWarmup: false, isFailure: false, restSeconds: null }
    );
    const sidePlank = noLoadWorkout(
      "side-plank",
      "2026-06-22",
      "ex-side-plank",
      "duration",
      "per_side",
      { id: "side-plank-set", setNumber: 1, weight: null, reps: null, unit: "kg", durationSec: 45, distanceM: null, rpe: null, isWarmup: false, isFailure: false, restSeconds: null }
    );
    const params = { exercises: snapshot.exercises, workouts: [splitSquat, sidePlank], weightUnit: "kg" as const, today: "2026-06-25" };

    expect(buildExercisePersonalStats({ ...params, exerciseId: "ex-bodyweight-split-squat" }).performance).toMatchObject({
      loadBasis: null,
      countBasis: "per_side",
      loadDirection: null,
      bestReps: 12,
    });
    expect(buildExercisePersonalStats({ ...params, exerciseId: "ex-side-plank" }).performance).toMatchObject({
      loadBasis: null,
      countBasis: "per_side",
      loadDirection: null,
      bestDurationSec: 45,
    });

    const wholeSetSplitSquat = {
      ...splitSquat,
      id: "split-squat-whole-set",
      exercises: splitSquat.exercises.map((exercise) => ({ ...exercise, id: "split-squat-whole-set-exercise", countBasis: "whole_set" as const })),
    };
    const mixed = buildExercisePersonalStats({
      ...params,
      exerciseId: "ex-bodyweight-split-squat",
      workouts: [splitSquat, wholeSetSplitSquat],
    });
    expect(mixed.performance).toMatchObject({ countBasis: null, loadBasis: null, loadDirection: null, bestReps: 12 });
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
      countBasis: "whole_set",
      loadDirection: "higher_better",
      rateMetric: "none",
      sortOrder: 0,
      supersetGroup: null,
      sets,
    }],
    createdAt: `${date}T10:00:00.000Z`,
    updatedAt: `${date}T10:00:00.000Z`,
    deletedAt: null,
    schemaVersion: CURRENT_SCHEMA_VERSION,
  };
}

function noLoadWorkout(
  id: string,
  date: string,
  exerciseId: string,
  recordingMode: "reps" | "duration",
  countBasis: "whole_set" | "per_side",
  set: WorkoutDoc["exercises"][number]["sets"][number]
): WorkoutDoc {
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
      exerciseId,
      recordingMode,
      loadBasis: null,
      countBasis,
      loadDirection: null,
      rateMetric: "none",
      sortOrder: 0,
      supersetGroup: null,
      sets: [set],
    }],
    createdAt: `${date}T10:00:00.000Z`,
    updatedAt: `${date}T11:00:00.000Z`,
    deletedAt: null,
    schemaVersion: CURRENT_SCHEMA_VERSION,
  };
}

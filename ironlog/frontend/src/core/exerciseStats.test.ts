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
      type: "reps_only",
      description: null,
      primaryMuscleGroupIds: [],
      secondaryMuscleGroupIds: [],
      metValue: null,
      isCustom: true,
      replacedByExerciseId: "ex-plank",
      createdAt: "2026-06-20T00:00:00.000Z",
      updatedAt: "2026-06-21T00:00:00.000Z",
      deletedAt: "2026-06-21T00:00:00.000Z",
      schemaVersion: 1,
    });
    snapshot.workouts = [
      workout("done", "2026-06-21", "2026-06-21T11:00:00.000Z", [
        { id: "warmup", setNumber: 1, weight: 100, reps: 10, unit: "lb" as const, durationSec: null, distanceM: null, rpe: null, isWarmup: true, isDropset: false, isFailure: false, restSeconds: null },
        { id: "work", setNumber: 2, weight: 100, reps: 5, unit: "lb" as const, durationSec: null, distanceM: null, rpe: null, isWarmup: false, isDropset: false, isFailure: false, restSeconds: null },
      ]),
      workout("recent", "2026-06-16", "2026-06-16T11:00:00.000Z", [
        { id: "recent-set", setNumber: 1, weight: 60, reps: 3, unit: "kg" as const, durationSec: null, distanceM: null, rpe: null, isWarmup: false, isDropset: false, isFailure: false, restSeconds: null },
      ]),
      workout("old", "2026-06-14", "2026-06-14T11:00:00.000Z", [
        { id: "old-set", setNumber: 1, weight: 60, reps: 3, unit: "kg" as const, durationSec: null, distanceM: null, rpe: null, isWarmup: false, isDropset: false, isFailure: false, restSeconds: null },
      ]),
      workout("draft", "2026-06-22", null, [
        { id: "draft-set", setNumber: 1, weight: 200, reps: 5, unit: "lb" as const, durationSec: null, distanceM: null, rpe: null, isWarmup: false, isDropset: false, isFailure: false, restSeconds: null },
      ]),
      { ...workout("deleted", "2026-06-23", "2026-06-23T11:00:00.000Z", []), deletedAt: "2026-06-24T00:00:00.000Z" },
    ];

    const stats = buildExercisePersonalStats({
      exerciseId: "ex-plank",
      exercises: snapshot.exercises,
      workouts: snapshot.workouts,
      weightUnit: "kg",
    });

    expect(stats.completedWorkoutCount).toBe(3);
    expect(stats.totalSetCount).toBe(4);
    expect(stats.workingSetCount).toBe(3);
    expect(stats.recent7DaySetCount).toBe(3);
    expect(stats.lastCompletedDate).toBe("2026-06-21");
    expect(stats.strength.bestWeight).toBe(60);
    expect(stats.strength.bestVolume).toBeCloseTo(226.796185);
    expect(stats.strength.displayUnit).toBe("kg");
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
      exerciseType: "strength",
      sortOrder: 0,
      supersetGroup: null,
      sets,
    }],
    createdAt: `${date}T10:00:00.000Z`,
    updatedAt: `${date}T10:00:00.000Z`,
    deletedAt: null,
    schemaVersion: 1,
  };
}

import { describe, expect, it } from "vitest";
import { DEFAULT_EXERCISES } from "./defaultData";
import { CURRENT_SCHEMA_VERSION } from "./models";
import { buildShardList, makeEmptySnapshot, migrateSnapshot } from "./migrations";

describe("local-first schema v3", () => {
  it("creates a new v3 snapshot with the exact 62-item catalog", () => {
    const snapshot = makeEmptySnapshot("device-test");

    expect(snapshot.manifest.schemaVersion).toBe(3);
    expect(snapshot.exercises).toHaveLength(62);
    expect(snapshot.exercises).toEqual(DEFAULT_EXERCISES);
    expect(new Set(snapshot.exercises.map((exercise) => exercise.id)).size).toBe(62);
    expect(snapshot.exercises.every((exercise) => exercise.schemaVersion === CURRENT_SCHEMA_VERSION)).toBe(true);
    const retiredIds = ["squat", "overhead-press", "face-pull", "plank", "cat-cow-stretch"].map((suffix) => `ex-${suffix}`);
    expect(snapshot.exercises.some((exercise) => retiredIds.includes(exercise.id))).toBe(false);
  });

  it.each([false, true])("rejects an existing v2 snapshot whether exercises are empty=%s", (empty) => {
    const v2 = makeEmptySnapshot("device-test");
    v2.manifest.schemaVersion = 2;
    if (empty) v2.exercises = [];

    expect(() => migrateSnapshot(v2, "device-test")).toThrow("不兼容开发快照");
    expect(v2.manifest.schemaVersion).toBe(2);
    expect(v2.exercises).toHaveLength(empty ? 0 : 62);
  });

  it("preserves current-schema exercise fields, newlines, provenance, and nested ids", () => {
    const raw = makeEmptySnapshot("device-test");
    raw.exercises.push({
      id: "custom-ex-roundtrip",
      name: "往返动作",
      category: "core",
      type: "reps_only",
      equipment: "band",
      description: "第一段\n\n第二段",
      primaryMuscleGroupIds: ["core"],
      secondaryMuscleGroupIds: ["glutes"],
      provenance: { source: "roundtrip", sourceId: "1", sourceRevision: "r1" },
      isCustom: true,
      replacedByExerciseId: null,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
      deletedAt: null,
      schemaVersion: 3,
    });
    raw.workouts = [{
      id: "workout-roundtrip",
      date: "2026-07-14",
      startTime: null,
      endTime: null,
      planTemplateId: null,
      note: null,
      mood: null,
      exercises: [{ id: "workout-exercise-stable", exerciseId: "custom-ex-roundtrip", exerciseType: "reps_only", sortOrder: 0, supersetGroup: 7, sets: [] }],
      createdAt: "2026-07-14T00:00:00.000Z",
      updatedAt: "2026-07-14T00:00:00.000Z",
      deletedAt: null,
      schemaVersion: 3,
    }];

    const snapshot = migrateSnapshot(raw, "device-test");
    expect(snapshot.exercises[snapshot.exercises.length - 1]).toMatchObject({
      equipment: "band",
      description: "第一段\n\n第二段",
      provenance: { source: "roundtrip", sourceId: "1", sourceRevision: "r1" },
    });
    expect(snapshot.workouts[0].exercises[0]).toMatchObject({ id: "workout-exercise-stable", supersetGroup: 7, exerciseType: "reps_only" });
  });

  it("lists static, workout-month, and performance-month shards without an index shard", () => {
    const snapshot = makeEmptySnapshot("device-test");
    snapshot.workouts = [{
      id: "workout-june", date: "2026-06-30", startTime: null, endTime: null, planTemplateId: null, note: null, mood: null, exercises: [],
      createdAt: "2026-06-30T10:00:00.000Z", updatedAt: "2026-06-30T10:00:00.000Z", deletedAt: null, schemaVersion: 3,
    }];
    snapshot.exercisePerformanceRecords = [{
      id: "performance-1", exerciseId: "ex-bench-press", kind: "true_pr", metricType: "strength.max_weight", value: 100, unit: "kg",
      achievedAt: "2026-06-30T10:00:00.000Z", sourceWorkoutId: "workout-june", sourceWorkoutExerciseId: "workout-exercise-1", sourceSetId: "set-1",
      input: { weightKg: 100, reps: 5, rpe: null, effectiveReps: null, distanceM: null, durationSec: null, workoutVolumeKgReps: null }, rm: null,
      createdAt: "2026-06-30T10:00:00.000Z", updatedAt: "2026-06-30T10:00:00.000Z", deletedAt: null, schemaVersion: 3,
    }];

    const paths = buildShardList(snapshot).map((shard) => shard.path);
    expect(paths).toEqual(expect.arrayContaining(["exercises.json", "body-metrics.json", "timeline-notes.json", "workouts/2026-06.json", "exercise-performance/2026-06.json"]));
    expect(paths).not.toContain("workouts/index.json");
  });
});

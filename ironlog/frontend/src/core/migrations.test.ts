import { describe, expect, it } from "vitest";
import { DEFAULT_EXERCISES } from "./defaultData";
import { CURRENT_SCHEMA_VERSION } from "./models";
import { buildShardList, makeEmptySnapshot, migrateSnapshot } from "./migrations";

describe("local-first schema v4", () => {
  it("creates a new v4 snapshot with the exact 63-item catalog", () => {
    const snapshot = makeEmptySnapshot("device-test");

    expect(snapshot.manifest.schemaVersion).toBe(4);
    expect(snapshot.exercises).toHaveLength(63);
    expect(snapshot.exercises).toEqual(DEFAULT_EXERCISES);
    expect(new Set(snapshot.exercises.map((exercise) => exercise.id)).size).toBe(63);
    expect(snapshot.exercises.every((exercise) => exercise.schemaVersion === CURRENT_SCHEMA_VERSION)).toBe(true);
    const retiredIds = ["squat", "overhead-press", "face-pull", "plank", "cat-cow-stretch"].map((suffix) => `ex-${suffix}`);
    expect(snapshot.exercises.some((exercise) => retiredIds.includes(exercise.id))).toBe(false);
  });

  it.each([false, true])("rejects an existing v3 development snapshot whether exercises are empty=%s", (empty) => {
    const v3 = makeEmptySnapshot("device-test");
    v3.manifest.schemaVersion = 3;
    if (empty) v3.exercises = [];

    expect(() => migrateSnapshot(v3, "device-test")).toThrow("不兼容开发快照");
    expect(v3.manifest.schemaVersion).toBe(3);
    expect(v3.exercises).toHaveLength(empty ? 0 : 63);
  });

  it("rejects a v3 document inside a v4 manifest without mutating the source snapshot", () => {
    const mixed = makeEmptySnapshot("device-test");
    mixed.exercises[0].schemaVersion = 3;

    expect(() => migrateSnapshot(mixed, "device-test")).toThrow("不兼容开发快照");
    expect(mixed.manifest.schemaVersion).toBe(4);
    expect(mixed.exercises[0].schemaVersion).toBe(3);
  });

  it("preserves current-schema exercise fields, newlines, provenance, and nested ids", () => {
    const raw = makeEmptySnapshot("device-test");
    raw.exercises.push({
      id: "custom-ex-roundtrip",
      name: "往返动作",
      category: "core",
      recordingMode: "reps",
      loadBasis: null,
      loadDirection: null,
      rateMetric: "none",
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
      schemaVersion: 4,
    });
    raw.workouts = [{
      id: "workout-roundtrip",
      date: "2026-07-14",
      startTime: null,
      endTime: null,
      planTemplateId: null,
      note: null,
      mood: null,
      exercises: [{ id: "workout-exercise-stable", exerciseId: "custom-ex-roundtrip", recordingMode: "reps", loadBasis: null, loadDirection: null, rateMetric: "none", sortOrder: 0, supersetGroup: 7, sets: [] }],
      createdAt: "2026-07-14T00:00:00.000Z",
      updatedAt: "2026-07-14T00:00:00.000Z",
      deletedAt: null,
      schemaVersion: 4,
    }];

    const snapshot = migrateSnapshot(raw, "device-test");
    expect(snapshot.exercises[snapshot.exercises.length - 1]).toMatchObject({
      equipment: "band",
      description: "第一段\n\n第二段",
      provenance: { source: "roundtrip", sourceId: "1", sourceRevision: "r1" },
    });
    expect(snapshot.workouts[0].exercises[0]).toMatchObject({ id: "workout-exercise-stable", supersetGroup: 7, recordingMode: "reps" });
  });

  it("removes obsolete total-load input-weight records while preserving effective and per-hand records", () => {
    const raw = makeEmptySnapshot("device-test");
    const timestamp = "2026-07-15T10:00:00.000Z";
    raw.exercisePerformanceRecords = [{
      id: "total-input", exerciseId: "ex-bench-press", kind: "true_pr", metricType: "weight.max_input", value: 100, unit: "kg",
      achievedAt: timestamp, sourceWorkoutId: "workout-total", sourceWorkoutExerciseId: "workout-exercise-total", sourceSetId: "set-total",
      input: { enteredLoad: 100, enteredLoadUnit: "kg", effectiveLoadKg: 100, loadBasis: "total", loadDirection: "higher_better", reps: 5, rpe: null, effectiveReps: null, distanceM: null, durationSec: null, workoutVolumeKgReps: null }, rm: null,
      createdAt: timestamp, updatedAt: timestamp, deletedAt: null, schemaVersion: 4,
    }, {
      id: "total-effective", exerciseId: "ex-bench-press", kind: "true_pr", metricType: "weight.max_effective", value: 100, unit: "kg",
      achievedAt: timestamp, sourceWorkoutId: "workout-total", sourceWorkoutExerciseId: "workout-exercise-total", sourceSetId: "set-total",
      input: { enteredLoad: 100, enteredLoadUnit: "kg", effectiveLoadKg: 100, loadBasis: "total", loadDirection: "higher_better", reps: 5, rpe: null, effectiveReps: null, distanceM: null, durationSec: null, workoutVolumeKgReps: null }, rm: null,
      createdAt: timestamp, updatedAt: timestamp, deletedAt: null, schemaVersion: 4,
    }, {
      id: "per-hand-input", exerciseId: "ex-farmer-walk", kind: "true_pr", metricType: "weight.max_input", value: 32, unit: "kg",
      achievedAt: timestamp, sourceWorkoutId: "workout-per-hand", sourceWorkoutExerciseId: "workout-exercise-per-hand", sourceSetId: "set-per-hand",
      input: { enteredLoad: 32, enteredLoadUnit: "kg", effectiveLoadKg: 64, loadBasis: "per_hand", loadDirection: "higher_better", reps: null, rpe: null, effectiveReps: null, distanceM: 40, durationSec: 28, workoutVolumeKgReps: null }, rm: null,
      createdAt: timestamp, updatedAt: timestamp, deletedAt: null, schemaVersion: 4,
    }];

    const snapshot = migrateSnapshot(raw, "device-test");
    expect(snapshot.exercisePerformanceRecords.map((record) => [record.id, record.metricType])).toEqual([
      ["total-effective", "weight.max_effective"],
      ["per-hand-input", "weight.max_input"],
    ]);
  });

  it("lists static, workout-month, and performance-month shards without an index shard", () => {
    const snapshot = makeEmptySnapshot("device-test");
    snapshot.workouts = [{
      id: "workout-june", date: "2026-06-30", startTime: null, endTime: null, planTemplateId: null, note: null, mood: null, exercises: [],
      createdAt: "2026-06-30T10:00:00.000Z", updatedAt: "2026-06-30T10:00:00.000Z", deletedAt: null, schemaVersion: 4,
    }];
    snapshot.exercisePerformanceRecords = [{
      id: "performance-1", exerciseId: "ex-bench-press", kind: "true_pr", metricType: "weight.max_effective", value: 100, unit: "kg",
      achievedAt: "2026-06-30T10:00:00.000Z", sourceWorkoutId: "workout-june", sourceWorkoutExerciseId: "workout-exercise-1", sourceSetId: "set-1",
      input: { enteredLoad: 100, enteredLoadUnit: "kg", effectiveLoadKg: 100, loadBasis: "total", loadDirection: "higher_better", reps: 5, rpe: null, effectiveReps: null, distanceM: null, durationSec: null, workoutVolumeKgReps: null }, rm: null,
      createdAt: "2026-06-30T10:00:00.000Z", updatedAt: "2026-06-30T10:00:00.000Z", deletedAt: null, schemaVersion: 4,
    }];

    const paths = buildShardList(snapshot).map((shard) => shard.path);
    expect(paths).toEqual(expect.arrayContaining(["exercises.json", "body-metrics.json", "timeline-notes.json", "workouts/2026-06.json", "exercise-performance/2026-06.json"]));
    expect(paths).not.toContain("workouts/index.json");
  });
});

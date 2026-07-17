import { describe, expect, it } from "vitest";
import { DEFAULT_EXERCISES } from "./defaultData";
import { CURRENT_SCHEMA_VERSION, type ExercisePerformanceRecordDoc } from "./models";
import { buildShardList, makeEmptySnapshot, migrateSnapshot } from "./migrations";

describe("local-first schema v5", () => {
  it("creates a new v5 snapshot with the exact 63-item catalog", () => {
    const snapshot = makeEmptySnapshot("device-test");

    expect(snapshot.manifest.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
    expect(snapshot.exercises).toHaveLength(63);
    expect(snapshot.exercises).toEqual(DEFAULT_EXERCISES);
    expect(new Set(snapshot.exercises.map((exercise) => exercise.id)).size).toBe(63);
    expect(snapshot.exercises.every((exercise) => exercise.schemaVersion === CURRENT_SCHEMA_VERSION)).toBe(true);
    const retiredIds = ["squat", "overhead-press", "face-pull", "plank", "cat-cow-stretch"].map((suffix) => `ex-${suffix}`);
    expect(snapshot.exercises.some((exercise) => retiredIds.includes(exercise.id))).toBe(false);
  });

  it.each([false, true])("rejects an existing v4 development snapshot whether exercises are empty=%s", (empty) => {
    const v4 = makeEmptySnapshot("device-test");
    v4.manifest.schemaVersion = 4;
    if (empty) v4.exercises = [];

    expect(() => migrateSnapshot(v4, "device-test")).toThrow("不兼容开发快照");
    expect(v4.manifest.schemaVersion).toBe(4);
    expect(v4.exercises).toHaveLength(empty ? 0 : 63);
  });

  it("rejects a v4 document inside a v5 manifest without mutating the source snapshot", () => {
    const mixed = makeEmptySnapshot("device-test");
    mixed.exercises[0].schemaVersion = 4;

    expect(() => migrateSnapshot(mixed, "device-test")).toThrow("不兼容开发快照");
    expect(mixed.manifest.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
    expect(mixed.exercises[0].schemaVersion).toBe(4);
  });

  it("does not migrate legacy performance records after the schema replacement", () => {
    const legacy = makeEmptySnapshot("device-test");
    legacy.manifest.schemaVersion = 4;
    legacy.exercisePerformanceRecords = [performanceRecord()];
    legacy.exercisePerformanceRecords[0].schemaVersion = 4;

    expect(() => migrateSnapshot(legacy, "device-test")).toThrow("不兼容开发快照");
    expect(legacy.exercisePerformanceRecords[0].schemaVersion).toBe(4);
  });

  it("preserves current-schema count basis, unknown fields, provenance, and nested ids", () => {
    const raw = makeEmptySnapshot("device-test");
    raw.exercises.push({
      id: "custom-ex-roundtrip",
      name: "往返动作",
      category: "core",
      recordingMode: "reps",
      loadBasis: null,
      countBasis: "per_side",
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
      schemaVersion: CURRENT_SCHEMA_VERSION,
      syncImportedMarker: "keep",
    } as (typeof raw.exercises)[number]);
    raw.workouts = [{
      id: "workout-roundtrip",
      date: "2026-07-14",
      startTime: null,
      endTime: null,
      planTemplateId: null,
      note: null,
      mood: null,
      exercises: [{ id: "workout-exercise-stable", exerciseId: "custom-ex-roundtrip", recordingMode: "reps", loadBasis: null, countBasis: "per_side", loadDirection: null, rateMetric: "none", sortOrder: 0, supersetGroup: 7, sets: [] }],
      createdAt: "2026-07-14T00:00:00.000Z",
      updatedAt: "2026-07-14T00:00:00.000Z",
      deletedAt: null,
      schemaVersion: CURRENT_SCHEMA_VERSION,
    }];

    const snapshot = migrateSnapshot(raw, "device-test");
    expect(snapshot.exercises[snapshot.exercises.length - 1]).toMatchObject({
      equipment: "band",
      countBasis: "per_side",
      description: "第一段\n\n第二段",
      provenance: { source: "roundtrip", sourceId: "1", sourceRevision: "r1" },
      syncImportedMarker: "keep",
    });
    expect(snapshot.workouts[0].exercises[0]).toMatchObject({ id: "workout-exercise-stable", supersetGroup: 7, recordingMode: "reps", countBasis: "per_side" });
  });

  it("accepts only the current performance input summary with raw fields", () => {
    const raw = makeEmptySnapshot("device-test");
    raw.exercisePerformanceRecords = [performanceRecord()];

    const snapshot = migrateSnapshot(raw, "device-test");
    expect(snapshot.exercisePerformanceRecords[0]).toMatchObject({ metricType: "weight.max", input: { countBasis: "whole_set", enteredLoad: 100 } });
    expect(Object.keys(snapshot.exercisePerformanceRecords[0].input).sort()).toEqual([
      "countBasis", "distanceM", "durationSec", "enteredLoad", "enteredLoadUnit", "loadBasis",
      "loadDirection", "rateMetric", "recordingMode", "reps", "rpe",
    ]);

    const missingCountBasis = makeEmptySnapshot("device-test");
    const invalid = performanceRecord();
    delete (invalid.input as Partial<typeof invalid.input>).countBasis;
    missingCountBasis.exercisePerformanceRecords = [invalid];
    expect(() => migrateSnapshot(missingCountBasis, "device-test")).toThrow("成绩输入上下文与当前 schema 不兼容");

    const invalidCountBasis = makeEmptySnapshot("device-test");
    const invalidBasisRecord = performanceRecord();
    invalidBasisRecord.input.countBasis = "invalid" as never;
    invalidCountBasis.exercisePerformanceRecords = [invalidBasisRecord];
    expect(() => migrateSnapshot(invalidCountBasis, "device-test")).toThrow("必须选择有效的计数口径");
  });

  it("lists static, workout-month, and performance-month shards without an index shard", () => {
    const snapshot = makeEmptySnapshot("device-test");
    snapshot.workouts = [{
      id: "workout-june", date: "2026-06-30", startTime: null, endTime: null, planTemplateId: null, note: null, mood: null, exercises: [],
      createdAt: "2026-06-30T10:00:00.000Z", updatedAt: "2026-06-30T10:00:00.000Z", deletedAt: null, schemaVersion: CURRENT_SCHEMA_VERSION,
    }];
    snapshot.exercisePerformanceRecords = [performanceRecord()];

    const paths = buildShardList(snapshot).map((shard) => shard.path);
    expect(paths).toEqual(expect.arrayContaining(["exercises.json", "body-metrics.json", "timeline-notes.json", "workouts/2026-06.json", "exercise-performance/2026-07.json"]));
    expect(paths).not.toContain("workouts/index.json");
  });
});

function performanceRecord(): ExercisePerformanceRecordDoc {
  const timestamp = "2026-07-15T10:00:00.000Z";
  return {
    id: "performance-1",
    exerciseId: "ex-bench-press",
    kind: "true_pr",
    metricType: "weight.max",
    value: 100,
    unit: "kg",
    achievedAt: timestamp,
    sourceWorkoutId: "workout-total",
    sourceWorkoutExerciseId: "workout-exercise-total",
    sourceSetId: "set-total",
    input: {
      recordingMode: "weight_reps",
      enteredLoad: 100,
      enteredLoadUnit: "kg",
      loadBasis: "total",
      countBasis: "whole_set",
      loadDirection: "higher_better",
      rateMetric: "none",
      reps: 5,
      rpe: null,
      distanceM: null,
      durationSec: null,
    },
    rm: null,
    createdAt: timestamp,
    updatedAt: timestamp,
    deletedAt: null,
    schemaVersion: CURRENT_SCHEMA_VERSION,
  };
}

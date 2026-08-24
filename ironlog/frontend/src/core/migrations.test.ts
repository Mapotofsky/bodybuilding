import { describe, expect, it } from "vitest";
import { DEFAULT_EXERCISES } from "./defaultData";
import { CURRENT_SCHEMA_VERSION, type DataSnapshot, type ExercisePerformanceRecordDoc } from "./models";
import { buildShardList, makeEmptySnapshot, migrateSnapshot } from "./migrations";

describe("local-first schema migration", () => {
  it("creates a new current-schema snapshot with the exact 87-item catalog", () => {
    const snapshot = makeEmptySnapshot("device-test");

    expect(snapshot.manifest.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
    expect(snapshot.exercises).toHaveLength(87);
    expect(snapshot.exercises).toEqual(DEFAULT_EXERCISES);
    expect(new Set(snapshot.exercises.map((exercise) => exercise.id)).size).toBe(87);
    expect(snapshot.exercises.every((exercise) => exercise.schemaVersion === CURRENT_SCHEMA_VERSION)).toBe(true);
    const retiredIds = ["squat", "plank", "cat-cow-stretch"].map((suffix) => `ex-${suffix}`);
    expect(snapshot.exercises.some((exercise) => retiredIds.includes(exercise.id))).toBe(false);
  });

  it.each([false, true])("rejects an existing v4 development snapshot whether exercises are empty=%s", (empty) => {
    const v4 = makeEmptySnapshot("device-test");
    v4.manifest.schemaVersion = 4;
    if (empty) v4.exercises = [];

    expect(() => migrateSnapshot(v4, "device-test")).toThrow("不兼容快照");
    expect(v4.manifest.schemaVersion).toBe(4);
    expect(v4.exercises).toHaveLength(empty ? 0 : 87);
  });

  it("rejects a v4 document inside a v6 manifest without mutating the source snapshot", () => {
    const mixed = makeEmptySnapshot("device-test");
    mixed.exercises[0].schemaVersion = 4;

    expect(() => migrateSnapshot(mixed, "device-test")).toThrow("不兼容快照");
    expect(mixed.manifest.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
    expect(mixed.exercises[0].schemaVersion).toBe(4);
  });

  it("does not migrate legacy performance records after the schema replacement", () => {
    const legacy = makeEmptySnapshot("device-test");
    legacy.manifest.schemaVersion = 4;
    legacy.exercisePerformanceRecords = [performanceRecord()];
    legacy.exercisePerformanceRecords[0].schemaVersion = 4;

    expect(() => migrateSnapshot(legacy, "device-test")).toThrow("不兼容快照");
    expect(legacy.exercisePerformanceRecords[0].schemaVersion).toBe(4);
  });

  it("migrates a non-empty v5 snapshot by fusing built-ins and preserving history", () => {
    const v5 = makeEmptySnapshot("device-test");
    v5.manifest.schemaVersion = 5;
    v5.exercises.forEach((exercise) => {
      exercise.schemaVersion = 5;
      delete exercise.contextKind;
    });
    const bike = v5.exercises.find((exercise) => exercise.id === "ex-stationary-bike")!;
    bike.name = "用户旧目录名称";
    bike.rateMetric = "distance_per_time";
    v5.exercises.push({
      ...v5.exercises[0],
      id: "custom-ex-preserved",
      name: "保留的自定义动作",
      isCustom: true,
      schemaVersion: 5,
    });
    v5.workouts = [{
      id: "workout-v5",
      date: "2026-07-20",
      startTime: "2026-07-20T10:00:00.000Z",
      endTime: "2026-07-20T10:20:00.000Z",
      planTemplateId: null,
      note: "历史保留",
      mood: null,
      exercises: [{
        id: "workout-exercise-v5",
        exerciseId: "ex-stationary-bike",
        recordingMode: "distance_duration",
        loadBasis: null,
        countBasis: "whole_set",
        loadDirection: null,
        rateMetric: "distance_per_time",
        sortOrder: 0,
        supersetGroup: null,
        sets: [{
          id: "set-v5",
          setNumber: 1,
          weight: null,
          reps: null,
          unit: "kg",
          durationSec: 600,
          distanceM: 3000,
          rpe: null,
          isWarmup: false,
          isFailure: false,
          restSeconds: null,
        }],
      }],
      createdAt: "2026-07-20T10:00:00.000Z",
      updatedAt: "2026-07-20T10:20:00.000Z",
      deletedAt: null,
      schemaVersion: 5,
    }];
    const oldBikeRecord = performanceRecord();
    oldBikeRecord.exerciseId = "ex-stationary-bike";
    oldBikeRecord.schemaVersion = 5;
    delete oldBikeRecord.input.contextKind;
    delete oldBikeRecord.input.contextValue;
    v5.exercisePerformanceRecords = [oldBikeRecord];

    const migrated = migrateSnapshot(v5, "device-test");

    expect(migrated.manifest.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
    expect(migrated.exercises.find((exercise) => exercise.id === "ex-stationary-bike")).toMatchObject({
      name: "固定自行车",
      contextKind: "resistance_level",
      rateMetric: "none",
    });
    expect(migrated.exercises.find((exercise) => exercise.id === "custom-ex-preserved")?.name).toBe("保留的自定义动作");
    expect(migrated.workouts[0]).toMatchObject({ id: "workout-v5", note: "历史保留" });
    expect(migrated.workouts[0].exercises[0]).toMatchObject({ contextKind: "none" });
    expect(migrated.workouts[0].exercises[0].sets[0]).toMatchObject({ contextValue: null, distanceM: 3000, durationSec: 600 });
    expect(migrated.exercisePerformanceRecords[0].deletedAt).not.toBeNull();
  });

  it("migrates a v6 stepmill snapshot without losing custom, unknown, or nested history fields", () => {
    const raw = avdV6Snapshot();
    const original = structuredClone(raw);

    const migrated = migrateSnapshot(raw, "device-test");

    expect(migrated.manifest.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
    expect(migrated.exercises.find((exercise) => exercise.id === "ex-stepmill")).toMatchObject({
      recordingMode: "reps_duration",
      rateMetric: "reps_per_time",
      contextKind: "none",
    });
    expect(migrated.exercises.find((exercise) => exercise.id === "custom-ex-avd")).toMatchObject({
      name: "AVD 自定义动作",
      contextKind: "none",
      syncImportedMarker: "keep-custom",
    });
    expect(migrated.exercises.find((exercise) => exercise.id === "unknown-ex-avd")).toMatchObject({
      name: "AVD 未知动作",
      deletedAt: "2026-07-16T00:00:00.000Z",
      syncImportedMarker: "keep-unknown",
    });
    expect(migrated.workouts[0]).toMatchObject({
      id: "workout-avd-draft",
      endTime: null,
      syncImportedMarker: "keep-workout",
    });
    expect(migrated.workouts[0].exercises[0]).toMatchObject({
      id: "workout-exercise-avd",
      recordingMode: "reps_duration",
      rateMetric: "reps_per_time",
      contextKind: "none",
    });
    expect(migrated.workouts[0].exercises[0].sets[0]).toMatchObject({
      id: "set-avd",
      reps: 720,
      durationSec: 600,
      contextValue: null,
      syncImportedMarker: "keep-set",
    });
    expect(migrateSnapshot(structuredClone(migrated), "device-test")).toEqual(migrated);
    expect(raw).toEqual(original);
  });

  it("migrates a non-empty v7 snapshot to the 87-item catalog without clearing local records or tombstones", () => {
    const v7 = makeEmptySnapshot("device-test");
    const addedIds = new Set([
      "ex-dumbbell-bench-press",
      "ex-dumbbell-fly",
      "ex-machine-chest-fly",
      "ex-machine-reverse-fly",
      "ex-dumbbell-reverse-lunge",
      "ex-barbell-zercher-squat",
      "ex-dumbbell-arnold-press",
      "ex-dumbbell-front-raise",
      "ex-cable-one-arm-lateral-raise",
      "ex-floor-crunch",
      "ex-hanging-straight-leg-raise",
      "ex-machine-hack-squat",
      "ex-dumbbell-single-leg-deadlift",
      "ex-trap-bar-deadlift",
      "ex-barbell-preacher-curl",
      "ex-barbell-lying-triceps-extension",
      "ex-incline-treadmill-walk",
      "ex-standing-cable-chest-press",
      "ex-kettlebell-renegade-row",
      "ex-overhead-press",
      "ex-face-pull",
      "ex-trap-bar-farmer-walk",
      "ex-single-arm-farmer-walk",
      "ex-copenhagen-side-plank",
    ]);
    v7.manifest.schemaVersion = 7;
    v7.exercises = v7.exercises
      .filter((exercise) => !addedIds.has(exercise.id))
      .map((exercise) => ({ ...exercise, schemaVersion: 7 }));
    const bench = v7.exercises.find((exercise) => exercise.id === "ex-bench-press")!;
    bench.description = "旧版单段说明";
    bench.deletedAt = "2026-07-24T12:00:00.000Z";
    v7.exercises.push({
      ...v7.exercises[0],
      id: "custom-ex-v7-preserved",
      name: "保留的 v7 自定义动作",
      isCustom: true,
      deletedAt: null,
      schemaVersion: 7,
      syncImportedMarker: "keep-custom",
    } as (typeof v7.exercises)[number]);
    v7.exercises.push({
      ...v7.exercises[0],
      id: "unknown-ex-v7-preserved",
      name: "保留的 v7 未知动作",
      isCustom: false,
      deletedAt: "2026-07-23T12:00:00.000Z",
      schemaVersion: 7,
      syncImportedMarker: "keep-unknown",
    } as (typeof v7.exercises)[number]);

    const migrated = migrateSnapshot(v7, "device-test");

    expect(migrated.manifest.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
    expect(migrated.exercises).toHaveLength(89);
    expect(migrated.exercises.find((exercise) => exercise.id === "ex-bench-press")).toMatchObject({
      deletedAt: "2026-07-24T12:00:00.000Z",
      schemaVersion: CURRENT_SCHEMA_VERSION,
    });
    expect(migrated.exercises.find((exercise) => exercise.id === "ex-bench-press")?.description).not.toContain("\n\n");
    expect(migrated.exercises.find((exercise) => exercise.id === "ex-trap-bar-deadlift")).toMatchObject({
      equipment: "trap_bar",
      provenance: { sourceId: "0811" },
    });
    expect(migrated.exercises.find((exercise) => exercise.id === "ex-overhead-press")?.provenance).toBeUndefined();
    expect(migrated.exercises.find((exercise) => exercise.id === "custom-ex-v7-preserved")).toMatchObject({
      name: "保留的 v7 自定义动作",
      syncImportedMarker: "keep-custom",
    });
    expect(migrated.exercises.find((exercise) => exercise.id === "unknown-ex-v7-preserved")).toMatchObject({
      deletedAt: "2026-07-23T12:00:00.000Z",
      syncImportedMarker: "keep-unknown",
    });
  });

  it("normalizes controlled v8 built-in descriptions while preserving user records", () => {
    const v8 = makeEmptySnapshot("device-test");
    const bench = v8.exercises.find((exercise) => exercise.id === "ex-bench-press")!;
    bench.description = "旧步骤一\n\n旧步骤二";
    bench.createdAt = "2026-02-01T00:00:00.000Z";
    bench.updatedAt = "2026-07-24T11:00:00.000Z";
    bench.deletedAt = "2026-07-24T12:00:00.000Z";
    bench.replacedByExerciseId = "ex-push-up";
    (bench as typeof bench & { syncImportedMarker: string }).syncImportedMarker = "keep-built-in";
    v8.exercises.push({
      ...v8.exercises[0],
      id: "custom-ex-v8-preserved",
      name: "保留的 v8 自定义动作",
      description: "自定义步骤一\n\n自定义步骤二",
      isCustom: true,
      syncImportedMarker: "keep-custom",
    } as (typeof v8.exercises)[number]);
    v8.exercises.push({
      ...v8.exercises[0],
      id: "unknown-ex-v8-preserved",
      name: "保留的 v8 未知动作",
      isCustom: false,
      syncImportedMarker: "keep-unknown",
    } as (typeof v8.exercises)[number]);
    v8.workouts = [{
      id: "workout-v8-preserved",
      date: "2026-07-31",
      startTime: null,
      endTime: null,
      planTemplateId: null,
      note: "历史不改写",
      mood: null,
      exercises: [{ id: "workout-exercise-v8", exerciseId: "ex-bench-press", recordingMode: "weight_reps", loadBasis: "total", countBasis: "whole_set", loadDirection: "higher_better", rateMetric: "none", sortOrder: 0, supersetGroup: null, sets: [] }],
      createdAt: "2026-07-31T00:00:00.000Z",
      updatedAt: "2026-07-31T00:00:00.000Z",
      deletedAt: null,
      schemaVersion: CURRENT_SCHEMA_VERSION,
      syncImportedMarker: "keep-workout",
    } as (typeof v8.workouts)[number]];
    const original = structuredClone(v8);

    const migrated = migrateSnapshot(v8, "device-test");
    const refreshedBench = migrated.exercises.find((exercise) => exercise.id === "ex-bench-press")!;

    expect(refreshedBench).toMatchObject({
      description: DEFAULT_EXERCISES.find((exercise) => exercise.id === "ex-bench-press")?.description,
      createdAt: "2026-02-01T00:00:00.000Z",
      updatedAt: "2026-07-24T11:00:00.000Z",
      deletedAt: "2026-07-24T12:00:00.000Z",
      replacedByExerciseId: "ex-push-up",
      syncImportedMarker: "keep-built-in",
    });
    expect(refreshedBench.description).not.toContain("\n\n");
    expect(migrated.exercises.find((exercise) => exercise.id === "custom-ex-v8-preserved")).toMatchObject({
      description: "自定义步骤一\n\n自定义步骤二",
      syncImportedMarker: "keep-custom",
    });
    expect(migrated.exercises.find((exercise) => exercise.id === "unknown-ex-v8-preserved")).toMatchObject({
      description: "旧步骤一\n\n旧步骤二",
      syncImportedMarker: "keep-unknown",
    });
    expect(migrated.workouts[0]).toMatchObject({ id: "workout-v8-preserved", note: "历史不改写", syncImportedMarker: "keep-workout" });
    expect(migrateSnapshot(structuredClone(migrated), "device-test")).toEqual(migrated);
    expect(v8).toEqual(original);
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
      "contextKind", "contextValue", "countBasis", "distanceM", "durationSec", "enteredLoad", "enteredLoadUnit",
      "loadBasis", "loadDirection", "rateMetric", "recordingMode", "reps", "rpe",
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
      contextKind: "none",
      contextValue: null,
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

export function avdV6Snapshot(): Partial<DataSnapshot> {
  const raw = makeEmptySnapshot("device-avd");
  raw.manifest.schemaVersion = 6;
  raw.profile.schemaVersion = 6;
  raw.settings.schemaVersion = 6;
  raw.exercises.forEach((exercise) => {
    exercise.schemaVersion = 6;
    delete exercise.contextKind;
  });
  const stepmill = raw.exercises.find((exercise) => exercise.id === "ex-stepmill") as unknown as Record<string, unknown>;
  stepmill.recordingMode = "step_count_duration";
  stepmill.rateMetric = "steps_per_time";
  raw.exercises.push({
    ...raw.exercises[0],
    id: "custom-ex-avd",
    name: "AVD 自定义动作",
    recordingMode: "reps",
    loadBasis: null,
    loadDirection: null,
    rateMetric: "none",
    isCustom: true,
    schemaVersion: 6,
    syncImportedMarker: "keep-custom",
  } as typeof raw.exercises[number]);
  raw.exercises.push({
    ...raw.exercises[0],
    id: "unknown-ex-avd",
    name: "AVD 未知动作",
    recordingMode: "reps",
    loadBasis: null,
    loadDirection: null,
    rateMetric: "none",
    isCustom: false,
    deletedAt: "2026-07-16T00:00:00.000Z",
    schemaVersion: 6,
    syncImportedMarker: "keep-unknown",
  } as typeof raw.exercises[number]);
  const legacyWorkout = {
    id: "workout-avd-draft",
    date: "2026-07-17",
    startTime: "2026-07-17T04:40:00.000Z",
    endTime: null,
    planTemplateId: null,
    note: "保留草稿",
    mood: null,
    exercises: [{
      id: "workout-exercise-avd",
      exerciseId: "ex-stepmill",
      recordingMode: "step_count_duration",
      loadBasis: null,
      countBasis: "whole_set",
      loadDirection: null,
      rateMetric: "steps_per_time",
      sortOrder: 0,
      supersetGroup: null,
      sets: [{
        id: "set-avd",
        setNumber: 1,
        weight: null,
        reps: 720,
        unit: "kg",
        durationSec: 600,
        distanceM: null,
        rpe: null,
        isWarmup: false,
        isFailure: false,
        restSeconds: null,
        syncImportedMarker: "keep-set",
      }],
    }],
    createdAt: "2026-07-17T04:40:00.000Z",
    updatedAt: "2026-07-17T04:50:00.000Z",
    deletedAt: null,
    schemaVersion: 6,
    syncImportedMarker: "keep-workout",
  };
  raw.workouts = [legacyWorkout] as unknown as DataSnapshot["workouts"];
  raw.manifest.shards = buildShardList(raw);
  return raw as unknown as Partial<DataSnapshot>;
}

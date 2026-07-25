import { describe, expect, it } from "vitest";
import { buildShardList, makeEmptySnapshot, migrateSnapshot } from "@/core/migrations";
import { CURRENT_SCHEMA_VERSION, type DataSnapshot, type WorkoutDoc } from "@/core/models";
import {
  assertManagedDocumentsPresent,
  filesToSnapshot,
  isMissingDocumentError,
  parseDocumentJson,
  snapshotToFiles,
} from "./documentStore";

function workout(id: string, date: string): WorkoutDoc {
  return {
    id,
    date,
    startTime: null,
    endTime: null,
    planTemplateId: null,
    note: null,
    mood: null,
    exercises: [],
    createdAt: `${date}T10:00:00.000Z`,
    updatedAt: `${date}T10:00:00.000Z`,
    deletedAt: null,
    schemaVersion: CURRENT_SCHEMA_VERSION,
  };
}

describe("document file serialization", () => {
  it("writes cross-month workouts to two month files without an index file", () => {
    const snapshot = makeEmptySnapshot("device-test");
    const juneWorkout = workout("workout-june", "2026-06-30");
    const julyWorkout = workout("workout-july", "2026-07-01");
    snapshot.workouts = [juneWorkout, julyWorkout];
    snapshot.manifest.shards = buildShardList(snapshot);

    const files = snapshotToFiles(snapshot);

    expect(files["workouts/2026-06.json"]).toEqual([juneWorkout]);
    expect(files["workouts/2026-07.json"]).toEqual([julyWorkout]);
    expect(files["templates.json"]).toEqual({ plans: [], templates: [] });
    expect(files["body-metrics.json"]).toEqual([]);
    expect(files["timeline-notes.json"]).toEqual([]);
    expect((files["exercises.json"] as typeof snapshot.exercises)[0]).toHaveProperty("primaryMuscleGroupIds");
    expect((files["exercises.json"] as typeof snapshot.exercises)[0]).toHaveProperty("secondaryMuscleGroupIds");
    expect((files["exercises.json"] as typeof snapshot.exercises)[0]).toMatchObject({
      equipment: "barbell",
      provenance: { source: "hasaneyldrm/exercises-dataset", sourceId: "0025", sourceRevision: "118e4bd6b14da6df0e36605d7169b65db18389a4" },
    });
    expect(files).not.toHaveProperty("workouts/index.json");
  });

  it("preserves equipment, provenance, and description paragraph breaks in exercises.json", () => {
    const snapshot = makeEmptySnapshot("device-test");
    snapshot.exercises[0] = {
      ...snapshot.exercises[0],
      equipment: "cable",
      description: "第一段\n\n第二段",
      provenance: { source: "roundtrip", sourceId: "0025", sourceRevision: "fixed" },
    };

    const exercise = (snapshotToFiles(snapshot)["exercises.json"] as typeof snapshot.exercises)[0];
    expect(exercise).toMatchObject({
      equipment: "cable",
      description: "第一段\n\n第二段",
      provenance: { source: "roundtrip", sourceId: "0025", sourceRevision: "fixed" },
    });
  });

  it("round-trips farmer-walk snapshots and nested set metadata through workout shards", () => {
    const snapshot = makeEmptySnapshot("device-test");
    const farmerWorkout = workout("workout-farmer", "2026-07-15");
    farmerWorkout.exercises = [{
      id: "workout-exercise-farmer",
      exerciseId: "ex-farmer-walk",
      recordingMode: "weight_distance_duration",
      loadBasis: "per_hand",
      countBasis: "whole_set",
      loadDirection: "higher_better",
      rateMetric: "load_distance_per_time",
      sortOrder: 0,
      supersetGroup: 2,
      sets: [{
        id: "workout-set-farmer",
        setNumber: 1,
        weight: 32,
        reps: null,
        unit: "kg",
        durationSec: 28,
        distanceM: 40,
        rpe: 8,
        isWarmup: false,
        isFailure: false,
        restSeconds: 90,
      }],
    }];
    snapshot.workouts = [farmerWorkout];
    snapshot.manifest.shards = buildShardList(snapshot);

    const files = snapshotToFiles(snapshot);
    const imported = filesToSnapshot(files);

    expect((files["workouts/2026-07.json"] as WorkoutDoc[])[0].exercises[0]).toEqual(farmerWorkout.exercises[0]);
    expect(imported.workouts?.[0].exercises[0]).toEqual(farmerWorkout.exercises[0]);
    expect(imported.workouts?.[0].exercises[0]?.countBasis).toBe("whole_set");
  });

  it("writes exercise performance records to achieved month files", () => {
    const snapshot = makeEmptySnapshot("device-test");
    const record = {
      id: "performance-1",
      exerciseId: "ex-bench-press",
      kind: "true_pr" as const,
      metricType: "weight.max" as const,
      value: 60,
      unit: "kg" as const,
      achievedAt: "2026-07-02T10:00:00.000Z",
      sourceWorkoutId: "workout-1",
      sourceWorkoutExerciseId: "workout-exercise-1",
      sourceSetId: "set-1",
      input: {
        recordingMode: "weight_distance_duration" as const,
        enteredLoad: 60,
        enteredLoadUnit: "kg" as const,
        loadBasis: "per_hand" as const,
        countBasis: "whole_set" as const,
        loadDirection: "higher_better" as const,
        rateMetric: "load_distance_per_time" as const,
        reps: null,
        rpe: null,
        distanceM: 40,
        durationSec: 28,
      },
      rm: null,
      createdAt: "2026-07-02T10:00:00.000Z",
      updatedAt: "2026-07-02T10:00:00.000Z",
      deletedAt: null,
      schemaVersion: CURRENT_SCHEMA_VERSION,
    };
    snapshot.exercisePerformanceRecords = [record];
    snapshot.manifest.shards = buildShardList(snapshot);

    const files = snapshotToFiles(snapshot);

    expect(files["exercise-performance/2026-07.json"]).toEqual([record]);
    expect(snapshot.manifest.shards.map((shard) => shard.path)).toContain("exercise-performance/2026-07.json");
    expect(filesToSnapshot(files).exercisePerformanceRecords?.[0].input).toEqual(record.input);
    expect(filesToSnapshot(files).exercisePerformanceRecords?.[0].input.countBasis).toBe("whole_set");
  });

  it("serializes avatar resources as separate files", () => {
    const snapshot = makeEmptySnapshot("device-test");
    snapshot.profile.avatarUrl = "assets/avatar/profile-local.txt";
    snapshot.resources["assets/avatar/profile-local.txt"] = "data:image/png;base64,AAA";
    snapshot.manifest.shards = buildShardList(snapshot);

    const files = snapshotToFiles(snapshot);

    expect(files["profile.json"]).toMatchObject({ avatarUrl: "assets/avatar/profile-local.txt" });
    expect(files["assets/avatar/profile-local.txt"]).toBe("data:image/png;base64,AAA");
    expect(snapshot.manifest.shards.map((shard) => shard.path)).toContain("assets/avatar/profile-local.txt");
  });

  it("round-trips the migrated AVD v6 stepmill shape through JSON/WebDAV shard serialization", () => {
    const migrated = migrateSnapshot(legacyV6FileSnapshot(), "device-avd");
    const files = JSON.parse(JSON.stringify(snapshotToFiles(migrated))) as Record<string, unknown>;
    const reloaded = migrateSnapshot(filesToSnapshot(files), "device-avd");

    expect(reloaded.manifest.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
    expect(reloaded.exercises.find((exercise) => exercise.id === "ex-stepmill")).toMatchObject({
      recordingMode: "reps_duration",
      rateMetric: "reps_per_time",
      contextKind: "none",
    });
    expect(reloaded.workouts[0]).toMatchObject({ id: "workout-avd", endTime: null });
    expect(reloaded.workouts[0].exercises[0]).toMatchObject({ id: "workout-exercise-avd", recordingMode: "reps_duration" });
    expect(reloaded.workouts[0].exercises[0].sets[0]).toMatchObject({ id: "set-avd", reps: 300, durationSec: 240 });
    expect(snapshotToFiles(reloaded)).toEqual(files);
  });

  it("rejects malformed JSON with its document path instead of treating it as missing", () => {
    expect(() => parseDocumentJson("exercises.json", "{broken"))
      .toThrow("文档 JSON 无效：exercises.json");
  });

  it("treats only the Capacitor does-not-exist error as a missing file", () => {
    expect(isMissingDocumentError({ code: "OS-PLUG-FILE-0008" })).toBe(true);
    expect(isMissingDocumentError({ code: "OS-PLUG-FILE-0013" })).toBe(false);
    expect(isMissingDocumentError(new Error("permission denied"))).toBe(false);
  });

  it("rejects a manifest-referenced missing shard instead of silently dropping its records", () => {
    expect(() => assertManagedDocumentsPresent(
      ["workouts/2026-07.json"],
      { "manifest.json": { schemaVersion: CURRENT_SCHEMA_VERSION } },
    )).toThrow("清单引用的文档缺失：workouts/2026-07.json");
  });
});

function legacyV6FileSnapshot(): DataSnapshot {
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
  raw.workouts = [{
    id: "workout-avd",
    date: "2026-07-17",
    startTime: "2026-07-17T04:40:00.000Z",
    endTime: null,
    planTemplateId: null,
    note: null,
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
        reps: 300,
        unit: "kg",
        durationSec: 240,
        distanceM: null,
        rpe: null,
        isWarmup: false,
        isFailure: false,
        restSeconds: null,
      }],
    }],
    createdAt: "2026-07-17T04:40:00.000Z",
    updatedAt: "2026-07-17T04:50:00.000Z",
    deletedAt: null,
    schemaVersion: 6,
  }] as unknown as DataSnapshot["workouts"];
  raw.manifest.shards = buildShardList(raw);
  return raw;
}

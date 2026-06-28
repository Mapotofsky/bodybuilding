import { describe, expect, it } from "vitest";
import { CURRENT_SCHEMA_VERSION } from "./models";
import { buildShardList, makeEmptySnapshot, migrateSnapshot } from "./migrations";

describe("local-first schema migration", () => {
  it("creates v1 document shards with string ids and default exercises", () => {
    const snapshot = makeEmptySnapshot("device-test");

    expect(snapshot.manifest.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
    expect(snapshot.manifest.shards.map((shard) => shard.path)).not.toContain("workouts/index.json");
    expect(snapshot.profile.id).toBe("profile-local");
    expect(snapshot.settings.themeId).toBe("emerald-slate");
    expect(snapshot.exercises.length).toBeGreaterThan(0);
    expect(typeof snapshot.exercises[0].id).toBe("string");
  });

  it("preserves unknown theme ids while migrating settings", () => {
    const snapshot = migrateSnapshot({
      settings: {
        ...makeEmptySnapshot("device-test").settings,
        themeId: "future-theme",
      },
    }, "device-test");

    expect(snapshot.settings.themeId).toBe("future-theme");
  });

  it("lists a separate shard for each workout month without an index shard", () => {
    const snapshot = makeEmptySnapshot("device-test");
    snapshot.workouts = [
      {
        id: "workout-june",
        date: "2026-06-30",
        startTime: null,
        endTime: null,
        planTemplateId: null,
        note: null,
        mood: null,
        exercises: [],
        createdAt: "2026-06-30T10:00:00.000Z",
        updatedAt: "2026-06-30T10:00:00.000Z",
        deletedAt: null,
        schemaVersion: CURRENT_SCHEMA_VERSION,
      },
      {
        id: "workout-july",
        date: "2026-07-01",
        startTime: null,
        endTime: null,
        planTemplateId: null,
        note: null,
        mood: null,
        exercises: [],
        createdAt: "2026-07-01T10:00:00.000Z",
        updatedAt: "2026-07-01T10:00:00.000Z",
        deletedAt: null,
        schemaVersion: CURRENT_SCHEMA_VERSION,
      },
    ];

    const paths = buildShardList(snapshot).map((shard) => shard.path);

    expect(paths).toContain("workouts/2026-06.json");
    expect(paths).toContain("workouts/2026-07.json");
    expect(paths).not.toContain("workouts/index.json");
  });

  it("migrates missing metadata without losing tombstones", () => {
    const snapshot = migrateSnapshot({
      workouts: [
        {
          id: "workout-1",
          date: "2026-06-11",
          startTime: null,
          endTime: null,
          planTemplateId: null,
          note: null,
          mood: null,
          exercises: [],
          deletedAt: "2026-06-12T00:00:00.000Z",
        } as never,
      ],
    }, "device-test");

    expect(snapshot.workouts[0].schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
    expect(snapshot.workouts[0].deletedAt).toBe("2026-06-12T00:00:00.000Z");
  });

  it("adds a durable cardio snapshot to legacy workouts without clearing distance or duration", () => {
    const snapshot = migrateSnapshot({
      workouts: [{
        id: "legacy-run", date: "2026-06-12", startTime: null, endTime: null, planTemplateId: null, note: null, mood: null,
        exercises: [{ id: "legacy-run-exercise", exerciseId: "ex-running", sortOrder: 0, supersetGroup: null, sets: [{ id: "legacy-run-set", setNumber: 1, weight: null, reps: null, unit: "kg", distanceM: 5000, durationSec: 1800, rpe: null, isWarmup: false, isFailure: false, restSeconds: null }] }],
      } as never],
    }, "device-test");
    expect(snapshot.workouts[0].exercises[0].exerciseType).toBe("cardio");
    expect(snapshot.workouts[0].exercises[0].sets[0]).toMatchObject({ distanceM: 5000, durationSec: 1800 });
  });

  it("drops legacy dropset flags while keeping supported set metadata", () => {
    const legacyFlagKey = "is" + "Drop" + "set";
    const snapshot = migrateSnapshot({
      workouts: [{
        id: "legacy-dropset", date: "2026-06-12", startTime: null, endTime: null, planTemplateId: null, note: null, mood: null,
        exercises: [{ id: "legacy-exercise", exerciseId: "ex-bench-press", exerciseType: "strength", sortOrder: 0, supersetGroup: null, sets: [{ id: "legacy-set", setNumber: 1, weight: 50, reps: 8, unit: "kg", distanceM: null, durationSec: null, rpe: 8, isWarmup: true, [legacyFlagKey]: true, isFailure: true, restSeconds: 90 }] }],
      } as never],
    }, "device-test");
    expect(snapshot.workouts[0].exercises[0].sets[0]).toMatchObject({ rpe: 8, isWarmup: true, isFailure: true, restSeconds: 90 });
    expect(snapshot.workouts[0].exercises[0].sets[0]).not.toHaveProperty(legacyFlagKey);
  });

  it("upgrades the built-in running exercise to cardio", () => {
    const snapshot = migrateSnapshot({
      exercises: [{ ...makeEmptySnapshot("device-test").exercises.find((exercise) => exercise.id === "ex-running")!, type: "strength" }],
    }, "device-test");
    expect(snapshot.exercises[0].type).toBe("cardio");
  });

  it("incrementally adds missing built-ins to a non-empty exercise file without replacing custom records", () => {
    const custom = {
      id: "custom-ex-kept", name: "我的动作", category: "core", type: "reps_only" as const, description: null,
      primaryMuscleGroupIds: ["core" as const], secondaryMuscleGroupIds: [], isCustom: true, replacedByExerciseId: null, createdAt: "2026-02-01T00:00:00.000Z", updatedAt: "2026-02-01T00:00:00.000Z", deletedAt: null, schemaVersion: 1,
    };
    const snapshot = migrateSnapshot({ exercises: [custom] }, "device-test");
    expect(snapshot.exercises.filter((exercise) => exercise.id === "custom-ex-kept")).toHaveLength(1);
    expect(snapshot.exercises.find((exercise) => exercise.id === "ex-cat-cow-stretch")).toMatchObject({ category: "stretch", type: "reps_only" });
    expect(snapshot.exercises).toHaveLength(makeEmptySnapshot("device-test").exercises.length + 1);
  });

  it("provides the static hold and stretching exercise contracts", () => {
    const exercises = makeEmptySnapshot("device-test").exercises;
    expect(exercises.find((exercise) => exercise.id === "ex-plank")?.type).toBe("static_hold");
    expect(exercises.find((exercise) => exercise.id === "ex-cat-cow-stretch")).toMatchObject({ category: "stretch", type: "reps_only", primaryMuscleGroupIds: ["core"] });
  });
});

import { describe, expect, it } from "vitest";
import { CURRENT_SCHEMA_VERSION } from "./models";
import { buildShardList, makeEmptySnapshot, migrateSnapshot } from "./migrations";

describe("local-first schema migration", () => {
  it("creates v1 document shards with string ids and default exercises", () => {
    const snapshot = makeEmptySnapshot("device-test");

    expect(snapshot.manifest.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
    expect(snapshot.manifest.shards.map((shard) => shard.path)).not.toContain("workouts/index.json");
    expect(snapshot.profile.id).toBe("profile-local");
    expect(snapshot.exercises.length).toBeGreaterThan(0);
    expect(typeof snapshot.exercises[0].id).toBe("string");
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
});

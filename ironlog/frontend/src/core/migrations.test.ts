import { describe, expect, it } from "vitest";
import { CURRENT_SCHEMA_VERSION } from "./models";
import { makeEmptySnapshot, migrateSnapshot } from "./migrations";

describe("local-first schema migration", () => {
  it("creates v1 document shards with string ids and default exercises", () => {
    const snapshot = makeEmptySnapshot("device-test");

    expect(snapshot.manifest.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
    expect(snapshot.manifest.shards.map((shard) => shard.path)).toContain("workouts/index.json");
    expect(snapshot.profile.id).toBe("profile-local");
    expect(snapshot.exercises.length).toBeGreaterThan(0);
    expect(typeof snapshot.exercises[0].id).toBe("string");
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

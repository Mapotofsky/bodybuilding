import { describe, expect, it } from "vitest";
import { buildShardList, makeEmptySnapshot } from "@/core/migrations";
import { CURRENT_SCHEMA_VERSION, type WorkoutDoc } from "@/core/models";
import { snapshotToFiles } from "./documentStore";

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
    expect((files["exercises.json"] as typeof snapshot.exercises)[0]).toHaveProperty("primaryMuscleGroupIds");
    expect((files["exercises.json"] as typeof snapshot.exercises)[0]).toHaveProperty("secondaryMuscleGroupIds");
    expect(files).not.toHaveProperty("workouts/index.json");
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
});

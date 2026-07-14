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

  it("writes exercise performance records to achieved month files", () => {
    const snapshot = makeEmptySnapshot("device-test");
    const record = {
      id: "performance-1",
      exerciseId: "ex-bench-press",
      kind: "true_pr" as const,
      metricType: "strength.max_weight" as const,
      value: 120,
      unit: "kg" as const,
      achievedAt: "2026-07-02T10:00:00.000Z",
      sourceWorkoutId: "workout-1",
      sourceWorkoutExerciseId: "workout-exercise-1",
      sourceSetId: "set-1",
      input: { weightKg: 120, reps: 3, rpe: null, effectiveReps: null, distanceM: null, durationSec: null, workoutVolumeKgReps: null },
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

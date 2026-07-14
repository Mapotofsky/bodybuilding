import { describe, expect, it } from "vitest";
import { makeEmptySnapshot } from "./migrations";
import { resolveExerciseId } from "./exerciseRedirects";

describe("exercise replacement resolution", () => {
  it("resolves a directed multi-hop chain and protects against cycles and missing targets", () => {
    const exercises = makeEmptySnapshot("device-test").exercises;
    exercises.push(
      custom("custom-ex-a", "custom-ex-b"),
      custom("custom-ex-b", "ex-dead-bug"),
      custom("custom-ex-loop-a", "custom-ex-loop-b"),
      custom("custom-ex-loop-b", "custom-ex-loop-a"),
      custom("custom-ex-missing", "custom-ex-none"),
      custom("custom-ex-none", null),
    );
    expect(resolveExerciseId("custom-ex-a", exercises)).toEqual({ status: "resolved", resolvedId: "ex-dead-bug" });
    expect(resolveExerciseId("custom-ex-loop-a", exercises)).toEqual({ status: "unresolved", reason: "cycle" });
    expect(resolveExerciseId("custom-ex-missing", exercises)).toEqual({ status: "unresolved", reason: "deleted_without_replacement" });
    expect(resolveExerciseId("custom-ex-unknown", exercises)).toEqual({ status: "unresolved", reason: "missing" });
    expect(resolveExerciseId("custom-ex-none", exercises)).toEqual({ status: "unresolved", reason: "deleted_without_replacement" });
  });
});

function custom(id: string, replacedByExerciseId: string | null) {
  return { id, name: id, category: "core" as const, type: "reps_only" as const, equipment: null, description: null, primaryMuscleGroupIds: [], secondaryMuscleGroupIds: [], isCustom: true, replacedByExerciseId, createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z", deletedAt: "2026-01-02T00:00:00.000Z", schemaVersion: 3 };
}

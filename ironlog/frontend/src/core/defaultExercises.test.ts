import { describe, expect, it } from "vitest";
import { DEFAULT_EXERCISES } from "./defaultData";
import { CURRENT_SCHEMA_VERSION } from "./models";

const VALID_CATEGORIES = new Set(["chest", "back", "legs", "shoulders", "arms", "core", "cardio", "stretch", "other"]);
const VALID_TYPES = new Set(["strength", "cardio", "reps_only", "static_hold"]);
const VALID_EQUIPMENT = new Set(["body_weight", "barbell", "dumbbell", "cable", "machine", "band", "kettlebell", "ab_wheel", "stationary_bike", "jump_rope", "elliptical", "stepmill", "external_weight", "other"]);
const RETIRED_DEFAULT_IDS = ["squat", "overhead-press", "face-pull", "plank", "cat-cow-stretch"].map((suffix) => `ex-${suffix}`);

describe("generated default exercise catalog", () => {
  it("contains 62 unique, valid, deterministic v3 documents", () => {
    expect(DEFAULT_EXERCISES).toHaveLength(62);
    expect(new Set(DEFAULT_EXERCISES.map((exercise) => exercise.id)).size).toBe(62);
    expect(new Set(DEFAULT_EXERCISES.map((exercise) => exercise.provenance?.sourceId)).size).toBe(62);

    for (const exercise of DEFAULT_EXERCISES) {
      expect(VALID_CATEGORIES.has(exercise.category)).toBe(true);
      expect(VALID_TYPES.has(exercise.type)).toBe(true);
      expect(exercise.equipment === null || VALID_EQUIPMENT.has(exercise.equipment)).toBe(true);
      expect(exercise.description === null || (exercise.description.trim().length >= 1 && exercise.description.length <= 500)).toBe(true);
      expect(new Set(exercise.primaryMuscleGroupIds).size).toBe(exercise.primaryMuscleGroupIds.length);
      expect(new Set(exercise.secondaryMuscleGroupIds).size).toBe(exercise.secondaryMuscleGroupIds.length);
      expect(exercise.secondaryMuscleGroupIds.some((muscle) => exercise.primaryMuscleGroupIds.includes(muscle))).toBe(false);
      expect(exercise.provenance).toEqual({
        source: "hasaneyldrm/exercises-dataset",
        sourceId: expect.stringMatching(/^[0-9]{4}$/),
        sourceRevision: "118e4bd6b14da6df0e36605d7169b65db18389a4",
      });
      expect(exercise).toMatchObject({
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
        deletedAt: null,
        schemaVersion: CURRENT_SCHEMA_VERSION,
        isCustom: false,
        replacedByExerciseId: null,
      });
    }
  });

  it("keeps the approved running expansion and excludes discarded development ids", () => {
    const running = DEFAULT_EXERCISES.find((exercise) => exercise.id === "ex-running");
    expect(running).toMatchObject({ name: "跑步", type: "cardio", equipment: "body_weight", provenance: { sourceId: "0685" } });
    expect(running?.description).toContain("\n");
    expect(running?.description).not.toContain("原地");
    expect(DEFAULT_EXERCISES.some((exercise) => exercise.provenance?.sourceId === "0684")).toBe(false);
    for (const id of RETIRED_DEFAULT_IDS) {
      expect(DEFAULT_EXERCISES.some((exercise) => exercise.id === id)).toBe(false);
    }
  });

  it("does not include media, attribution, grades, or instruction arrays", () => {
    const serialized = JSON.stringify(DEFAULT_EXERCISES);
    for (const forbidden of ["media_id", "gif_url", "attribution", "instruction_steps", "instructions", "supportedTypes", "movementPattern", "\"grade\""]) {
      expect(serialized).not.toContain(forbidden);
    }
  });
});

import { describe, expect, it } from "vitest";
import { DEFAULT_EXERCISES } from "./defaultData";
import { CURRENT_SCHEMA_VERSION } from "./models";

const VALID_CATEGORIES = new Set(["chest", "back", "legs", "shoulders", "arms", "core", "cardio", "stretch", "other"]);
const VALID_RECORDING_MODES = new Set(["weight_reps", "reps", "duration", "distance_duration", "weight_duration", "weight_distance_duration"]);
const WEIGHT_RECORDING_MODES = new Set(["weight_reps", "weight_duration", "weight_distance_duration"]);
const VALID_LOAD_BASIS = new Set(["total", "per_hand"]);
const VALID_COUNT_BASIS = new Set(["whole_set", "per_side"]);
const VALID_LOAD_DIRECTIONS = new Set(["higher_better", "lower_better"]);
const VALID_RATE_METRICS = new Set(["none", "distance_per_time", "load_distance_per_time"]);
const VALID_EQUIPMENT = new Set(["body_weight", "barbell", "dumbbell", "cable", "machine", "band", "kettlebell", "ab_wheel", "stationary_bike", "jump_rope", "elliptical", "stepmill", "external_weight", "other"]);
const RETIRED_DEFAULT_IDS = ["squat", "overhead-press", "face-pull", "plank", "cat-cow-stretch"].map((suffix) => `ex-${suffix}`);

describe("generated default exercise catalog", () => {
  it("contains 63 unique, valid, deterministic current-schema documents", () => {
    expect(DEFAULT_EXERCISES).toHaveLength(63);
    expect(new Set(DEFAULT_EXERCISES.map((exercise) => exercise.id)).size).toBe(63);
    expect(new Set(DEFAULT_EXERCISES.map((exercise) => exercise.provenance?.sourceId)).size).toBe(63);

    for (const exercise of DEFAULT_EXERCISES) {
      expect(VALID_CATEGORIES.has(exercise.category)).toBe(true);
      expect(VALID_RECORDING_MODES.has(exercise.recordingMode)).toBe(true);
      expect(VALID_COUNT_BASIS.has(exercise.countBasis)).toBe(true);
      expect(VALID_RATE_METRICS.has(exercise.rateMetric)).toBe(true);
      if (WEIGHT_RECORDING_MODES.has(exercise.recordingMode)) {
        expect(VALID_LOAD_BASIS.has(exercise.loadBasis ?? "")).toBe(true);
        expect(VALID_LOAD_DIRECTIONS.has(exercise.loadDirection ?? "")).toBe(true);
      } else {
        expect(exercise.loadBasis).toBeNull();
        expect(exercise.loadDirection).toBeNull();
      }
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
    expect(running).toMatchObject({ name: "跑步", recordingMode: "distance_duration", loadBasis: null, loadDirection: null, rateMetric: "distance_per_time", equipment: "body_weight", provenance: { sourceId: "0685" } });
    expect(running?.description).toContain("\n");
    expect(running?.description).not.toContain("原地");
    expect(DEFAULT_EXERCISES.some((exercise) => exercise.provenance?.sourceId === "0684")).toBe(false);
    for (const id of RETIRED_DEFAULT_IDS) {
      expect(DEFAULT_EXERCISES.some((exercise) => exercise.id === id)).toBe(false);
    }
  });

  it("uses audited recording modes for cardio and farmer walk actions", () => {
    const cardioIds = DEFAULT_EXERCISES
      .filter((exercise) => exercise.recordingMode === "distance_duration")
      .map((exercise) => exercise.id)
      .sort();

    expect(cardioIds).toEqual([
      "ex-elliptical-trainer",
      "ex-running",
      "ex-stationary-bike",
    ]);
    expect(DEFAULT_EXERCISES.find((exercise) => exercise.id === "ex-jump-rope")?.recordingMode).toBe("reps");
    expect(DEFAULT_EXERCISES.find((exercise) => exercise.id === "ex-stepmill")?.recordingMode).toBe("duration");
    expect(DEFAULT_EXERCISES.find((exercise) => exercise.id === "ex-farmer-walk")).toMatchObject({
      name: "农夫行走",
      recordingMode: "weight_distance_duration",
      loadBasis: "per_hand",
      countBasis: "whole_set",
      loadDirection: "higher_better",
      rateMetric: "load_distance_per_time",
      equipment: "dumbbell",
      provenance: { sourceId: "2133" },
    });
    expect(DEFAULT_EXERCISES.find((exercise) => exercise.id === "ex-assisted-pull-up")).toMatchObject({
      recordingMode: "weight_reps",
      loadBasis: "total",
      loadDirection: "lower_better",
      rateMetric: "none",
    });
  });

  it("uses the audited count basis for every default action", () => {
    const perSideIds = DEFAULT_EXERCISES
      .filter((exercise) => exercise.countBasis === "per_side")
      .map((exercise) => exercise.id)
      .sort();

    expect(perSideIds).toEqual([
      "ex-band-pallof-press",
      "ex-bodyweight-split-squat",
      "ex-dead-bug",
      "ex-dumbbell-bulgarian-split-squat",
      "ex-dumbbell-lunge",
      "ex-dumbbell-step-up",
      "ex-one-arm-dumbbell-row",
      "ex-side-plank",
    ]);
    expect(DEFAULT_EXERCISES.find((exercise) => exercise.id === "ex-one-arm-dumbbell-row")).toMatchObject({
      loadBasis: "total",
      countBasis: "per_side",
    });
  });

  it("does not include media, attribution, grades, or instruction arrays", () => {
    const serialized = JSON.stringify(DEFAULT_EXERCISES);
    const retiredSupportedModesField = ["supported", "Types"].join("");
    const retiredWorkoutModeFields = [
      ["exercise", "Type"].join(""),
      ["exercise", "_type"].join(""),
    ];
    for (const forbidden of [
      "media_id",
      "gif_url",
      "attribution",
      "instruction_steps",
      "instructions",
      retiredSupportedModesField,
      "movementPattern",
      "\"grade\"",
      "\"type\"",
      ...retiredWorkoutModeFields,
    ]) {
      expect(serialized).not.toContain(forbidden);
    }
  });
});

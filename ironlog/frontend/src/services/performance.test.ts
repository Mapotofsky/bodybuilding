import { describe, expect, it } from "vitest";
import { CURRENT_SCHEMA_VERSION, type ExerciseDoc, type LoadDirection, type WorkoutDoc } from "@/core/models";
import { makeEmptySnapshot } from "@/core/migrations";
import { calculateRpeAdjustedRm } from "@/core/rm";
import { KG_PER_LB } from "@/core/workoutMetrics";
import { buildExercisePerformanceTrend, buildPerformanceRecords, buildPerformanceRefreshRecordsForWorkout } from "./performance";

describe("exercise performance records", () => {
  it("uses the input weight for weight PR and RPE-adjusted 1RM, after converting lb", () => {
    const snapshot = makeEmptySnapshot("device-test");
    const enteredLb = 20 / KG_PER_LB;
    const recorded = workout("per-hand", "2026-06-01", [set("set-1", 1, enteredLb, 10, 8, false, "lb")], "per_hand");

    const records = buildPerformanceRecords([recorded], snapshot.exercises);
    expect(metric(records, "volume.max_set").value).toBeCloseTo(400, 5);
    expect(metric(records, "weight.max").value).toBeCloseTo(20, 5);
    expect(metric(records, "rm.rpe_adjusted_mean").value).toBeCloseTo(
      calculateRpeAdjustedRm({ weightKg: 20, reps: 10, rpe: 8 })!.formulas.meanKg,
      5
    );
    expect(metric(records, "rm.rpe_adjusted_mean").input).toMatchObject({
      recordingMode: "weight_reps",
      enteredLoadUnit: "lb",
      loadBasis: "per_hand",
      countBasis: "whole_set",
    });
    expect(metric(records, "rm.rpe_adjusted_mean").input.enteredLoad).toBeCloseTo(enteredLb, 5);
  });

  it("keeps whole-set and per-side count aggregation independent from the weight PR", () => {
    const snapshot = makeEmptySnapshot("device-test");
    const perHandWholeSet = buildPerformanceRecords([
      workout("per-hand-whole", "2026-06-01", [set("set-1", 1, 20, 10, null, false)], "per_hand", "whole_set"),
    ], snapshot.exercises);
    const totalPerSide = buildPerformanceRecords([
      workout("total-per-side", "2026-06-01", [set("set-1", 1, 20, 10, null, false)], "total", "per_side"),
    ], snapshot.exercises);
    const perHandPerSide = buildPerformanceRecords([
      workout("per-hand-per-side", "2026-06-01", [set("set-1", 1, 20, 10, null, false)], "per_hand", "per_side"),
    ], snapshot.exercises);

    expect(metric(perHandWholeSet, "volume.max_set").value).toBe(400);
    expect(metric(totalPerSide, "volume.max_set").value).toBe(400);
    expect(metric(perHandPerSide, "volume.max_set").value).toBe(800);
    expect(metric(perHandPerSide, "weight.max").value).toBe(20);
    expect(metric(perHandPerSide, "reps.max_set").value).toBe(10);
    expect(metric(perHandPerSide, "reps.max_workout").value).toBe(20);
  });

  it("calculates farmer and suitcase carry load metrics without a side-specific set", () => {
    const snapshot = makeEmptySnapshot("device-test");
    const farmer = carryWorkout("farmer", "2026-06-02", [
      farmerSet("distance", 1, 32, 40, 20),
      farmerSet("duration", 2, 32, null, 30),
    ], "per_hand", "whole_set", "ex-farmer-walk");
    const suitcase = carryWorkout("suitcase", "2026-06-03", [
      farmerSet("distance", 1, 32, 40, 20),
    ], "total", "per_side", "custom-suitcase-carry");

    const farmerRecords = buildPerformanceRecords([farmer], snapshot.exercises);
    const suitcaseRecords = buildPerformanceRecords([suitcase], snapshot.exercises);
    expect(metric(farmerRecords, "weight.max").value).toBe(32);
    expect(metric(farmerRecords, "load_distance.max").value).toBe(2560);
    expect(metric(farmerRecords, "load_distance_rate.max").value).toBe(128);
    expect(metric(farmerRecords, "load_duration.max").value).toBe(1920);
    expect(metric(suitcaseRecords, "load_distance.max").value).toBe(2560);
    expect(metric(suitcaseRecords, "load_distance_rate.max").value).toBe(64);
    expect(metric(suitcaseRecords, "load_distance.max").input).toMatchObject({
      enteredLoad: 32,
      enteredLoadUnit: "kg",
      loadBasis: "total",
      countBasis: "per_side",
      distanceM: 40,
      durationSec: 20,
    });
    expect(farmerRecords.some((record) => record.unit === "kg_reps" || record.kind === "rpe_adjusted_rm")).toBe(false);
  });

  it("uses independent min/max directions for assisted weight-reps and emits no normal volume or RM", () => {
    const snapshot = makeEmptySnapshot("device-test");
    const assisted = exercise("custom-assisted", "lower_better");
    snapshot.exercises.push(assisted);
    const records = buildPerformanceRecords([
      assistedWorkout("a1", "2026-06-01", 30, 8),
      assistedWorkout("a2", "2026-06-02", 25, 8),
      assistedWorkout("a3", "2026-06-03", 25, 10),
    ], snapshot.exercises);

    const bestReps = records.filter((record) => record.metricType === "assistance.best_reps");
    const minAssistance = records.filter((record) => record.metricType === "assistance.min_weight");
    expect(bestReps.map((record) => record.sourceWorkoutId)).toEqual(["a1", "a2", "a3"]);
    expect(minAssistance.map((record) => record.sourceWorkoutId)).toEqual(["a1", "a2", "a3"]);
    expect(records.some((record) => record.metricType.startsWith("volume.") || record.metricType.startsWith("rm."))).toBe(false);
  });

  it("emits only historical refresh events and builds configured trends", () => {
    const snapshot = makeEmptySnapshot("device-test");
    snapshot.workouts = [
      workout("w1", "2026-06-01", [set("warmup", 1, 120, 1, 10, true), set("set-1", 2, 100, 5, 8, false)]),
      workout("w2", "2026-06-02", [set("set-2", 1, 105, 5, 8, false)]),
      workout("draft", "2026-06-03", [set("draft-set", 1, 200, 1, 10, false)], "total", "whole_set", null),
    ];

    const records = buildPerformanceRecords(snapshot.workouts, snapshot.exercises);
    expect(records.find((record) => record.sourceSetId === "warmup")).toBeUndefined();
    expect(records.find((record) => record.sourceWorkoutId === "draft")).toBeUndefined();
    expect(records.filter((record) => record.metricType === "weight.max").map((record) => record.sourceSetId)).toEqual(["set-1", "set-2"]);

    const trend = buildExercisePerformanceTrend(snapshot.workouts, snapshot.exercises, "ex-bench-press", "weight_reps");
    expect(trend.metric_type).toBe("rm.rpe_adjusted_mean");
    expect(trend.points.map((point) => point.date)).toEqual(["2026-06-01", "2026-06-02"]);
  });

  it("builds trends only from immutable snapshots matching the current load and count conventions", () => {
    const snapshot = makeEmptySnapshot("device-test");
    const custom = exercise("custom-changing-convention", "higher_better");
    snapshot.exercises.push(custom);
    const perHandPerSide = workoutForExercise(
      "old-per-hand-per-side",
      "2026-06-01",
      custom.id,
      [set("old-set", 1, 20, 10, 8, false)],
      "per_hand",
      "per_side"
    );
    const totalWholeSet = workoutForExercise(
      "current-total-whole",
      "2026-06-02",
      custom.id,
      [set("current-set", 1, 20, 10, 8, false)],
      "total",
      "whole_set"
    );

    const totalTrend = buildExercisePerformanceTrend(
      [perHandPerSide, totalWholeSet],
      snapshot.exercises,
      custom.id,
      "weight_reps"
    );
    expect(totalTrend.metric_label).toBe("估算 1RM");
    expect(totalTrend.points.map((point) => point.date)).toEqual(["2026-06-02"]);

    custom.loadBasis = "per_hand";
    custom.countBasis = "per_side";
    const perHandTrend = buildExercisePerformanceTrend(
      [perHandPerSide, totalWholeSet],
      snapshot.exercises,
      custom.id,
      "weight_reps"
    );
    expect(perHandTrend.metric_label).toBe("每手估算 1RM");
    expect(perHandTrend.points.map((point) => point.date)).toEqual(["2026-06-01"]);
  });

  it("emits incremental records only when a newly completed workout refreshes current bests", () => {
    const snapshot = makeEmptySnapshot("device-test");
    const previous = workout("previous", "2026-06-01", [set("previous-set", 1, 100, 5, 8, false)]);
    const lower = workout("lower", "2026-06-02", [set("lower-set", 1, 90, 5, 8, false)]);
    const better = workout("better", "2026-06-03", [set("better-set", 1, 105, 5, 8, false)]);
    const existing = buildPerformanceRecords([previous], snapshot.exercises);

    expect(buildPerformanceRefreshRecordsForWorkout(lower, snapshot.exercises, existing)).toEqual([]);
    const refreshed = buildPerformanceRefreshRecordsForWorkout(better, snapshot.exercises, existing);
    expect(refreshed.map((record) => record.metricType)).toEqual(expect.arrayContaining([
      "weight.max", "volume.max_set", "volume.max_workout", "rm.rpe_adjusted_mean",
    ]));
  });

  it("reassigns deleted-source PRs through a compatible redirect without rewriting workout history", () => {
    const snapshot = makeEmptySnapshot("device-test");
    const source: ExerciseDoc = {
      ...exercise("custom-source", "higher_better"),
      deletedAt: "2026-06-02T00:00:00.000Z",
      replacedByExerciseId: "ex-bench-press",
    };
    snapshot.exercises.push(source);
    const historical = baseWorkout("history", "2026-06-01", "2026-06-01T11:00:00.000Z", [{
      id: "historical-exercise",
      exerciseId: source.id,
      recordingMode: "weight_reps",
      loadBasis: "total",
      countBasis: "whole_set",
      loadDirection: "higher_better",
      rateMetric: "none",
      sortOrder: 0,
      supersetGroup: null,
      sets: [set("historical-set", 1, 100, 5, 8, false)],
    }]);

    const records = buildPerformanceRecords([historical], snapshot.exercises);
    expect(records.length).toBeGreaterThan(0);
    expect(records.every((record) => record.exerciseId === "ex-bench-press")).toBe(true);
    expect(historical.exercises[0]).toMatchObject({
      exerciseId: "custom-source",
      recordingMode: "weight_reps",
      loadBasis: "total",
      countBasis: "whole_set",
    });

    source.replacedByExerciseId = null;
    expect(buildPerformanceRecords([historical], snapshot.exercises)).toEqual([]);
  });

  it("never generates automatic records for resistance actions", () => {
    const snapshot = makeEmptySnapshot("device-test");
    const workout = baseWorkout("bike", "2026-07-20", "2026-07-20T11:00:00.000Z", [{
      id: "bike-exercise",
      exerciseId: "ex-stationary-bike",
      recordingMode: "distance_duration",
      loadBasis: null,
      countBasis: "whole_set",
      loadDirection: null,
      rateMetric: "none",
      contextKind: "none",
      sortOrder: 0,
      supersetGroup: null,
      sets: [{
        id: "bike-set",
        setNumber: 1,
        weight: null,
        reps: null,
        unit: "kg",
        durationSec: 600,
        distanceM: 5000,
        contextValue: 7.5,
        rpe: null,
        isWarmup: false,
        isFailure: false,
        restSeconds: null,
      }],
    }]);

    expect(buildPerformanceRecords([workout], snapshot.exercises)).toEqual([]);
  });

  it("derives frequency only when reps and duration are both present", () => {
    const snapshot = makeEmptySnapshot("device-test");
    const workout = baseWorkout("stepmill", "2026-07-20", "2026-07-20T11:00:00.000Z", [{
      id: "stepmill-exercise",
      exerciseId: "ex-stepmill",
      recordingMode: "reps_duration",
      loadBasis: null,
      countBasis: "whole_set",
      loadDirection: null,
      rateMetric: "reps_per_time",
      contextKind: "none",
      sortOrder: 0,
      supersetGroup: null,
      sets: [
        { id: "steps", setNumber: 1, weight: null, reps: 600, unit: "kg", durationSec: 600, distanceM: null, contextValue: null, rpe: null, isWarmup: false, isFailure: false, restSeconds: null },
        { id: "time-only", setNumber: 2, weight: null, reps: null, unit: "kg", durationSec: 300, distanceM: null, contextValue: null, rpe: null, isWarmup: false, isFailure: false, restSeconds: null },
      ],
    }]);

    const frequencies = buildPerformanceRecords([workout], snapshot.exercises).filter((record) => record.metricType === "frequency.max");
    expect(frequencies).toHaveLength(1);
    expect(frequencies[0]).toMatchObject({ value: 60, unit: "reps_per_minute", sourceSetId: "steps" });
  });

  it("prefers the higher incline when speed is tied", () => {
    const snapshot = makeEmptySnapshot("device-test");
    snapshot.exercises.push({
      ...exercise("custom-incline", "higher_better"),
      recordingMode: "distance_duration",
      loadBasis: null,
      loadDirection: null,
      rateMetric: "distance_per_time",
      contextKind: "incline_percent",
    });
    const workout = baseWorkout("incline", "2026-07-20", "2026-07-20T11:00:00.000Z", [{
      id: "incline-exercise",
      exerciseId: "custom-incline",
      recordingMode: "distance_duration",
      loadBasis: null,
      countBasis: "whole_set",
      loadDirection: null,
      rateMetric: "distance_per_time",
      contextKind: "incline_percent",
      sortOrder: 0,
      supersetGroup: null,
      sets: [
        { id: "low", setNumber: 1, weight: null, reps: null, unit: "kg", durationSec: 100, distanceM: 1000, contextValue: 3, rpe: null, isWarmup: false, isFailure: false, restSeconds: null },
        { id: "high", setNumber: 2, weight: null, reps: null, unit: "kg", durationSec: 100, distanceM: 1000, contextValue: 8, rpe: null, isWarmup: false, isFailure: false, restSeconds: null },
      ],
    }]);

    const speeds = buildPerformanceRecords([workout], snapshot.exercises).filter((record) => record.metricType === "speed.max");
    expect(speeds[speeds.length - 1]?.sourceSetId).toBe("high");
  });
});

function metric(records: ReturnType<typeof buildPerformanceRecords>, type: ReturnType<typeof buildPerformanceRecords>[number]["metricType"]) {
  const found = records.find((record) => record.metricType === type);
  if (!found) throw new Error(`missing metric ${type}`);
  return found;
}

function workout(
  id: string,
  date: string,
  sets: WorkoutDoc["exercises"][number]["sets"],
  loadBasis: "total" | "per_hand" = "total",
  countBasis: "whole_set" | "per_side" = "whole_set",
  endTime: string | null = `${date}T11:00:00.000Z`
): WorkoutDoc {
  return baseWorkout(id, date, endTime, [{
    id: `${id}-exercise`,
    exerciseId: "ex-bench-press",
    recordingMode: "weight_reps",
    loadBasis,
    countBasis,
    loadDirection: "higher_better",
    rateMetric: "none",
    sortOrder: 0,
    supersetGroup: null,
    sets,
  }]);
}

function carryWorkout(
  id: string,
  date: string,
  sets: WorkoutDoc["exercises"][number]["sets"],
  loadBasis: "total" | "per_hand",
  countBasis: "whole_set" | "per_side",
  exerciseId: string
): WorkoutDoc {
  return baseWorkout(id, date, `${date}T11:00:00.000Z`, [{
    id: `${id}-exercise`,
    exerciseId,
    recordingMode: "weight_distance_duration",
    loadBasis,
    countBasis,
    loadDirection: "higher_better",
    rateMetric: "load_distance_per_time",
    sortOrder: 0,
    supersetGroup: null,
    sets,
  }]);
}

function workoutForExercise(
  id: string,
  date: string,
  exerciseId: string,
  sets: WorkoutDoc["exercises"][number]["sets"],
  loadBasis: "total" | "per_hand",
  countBasis: "whole_set" | "per_side"
): WorkoutDoc {
  return baseWorkout(id, date, `${date}T11:00:00.000Z`, [{
    id: `${id}-exercise`,
    exerciseId,
    recordingMode: "weight_reps",
    loadBasis,
    countBasis,
    loadDirection: "higher_better",
    rateMetric: "none",
    sortOrder: 0,
    supersetGroup: null,
    sets,
  }]);
}

function assistedWorkout(id: string, date: string, weight: number, reps: number): WorkoutDoc {
  return baseWorkout(id, date, `${date}T11:00:00.000Z`, [{
    id: `${id}-exercise`, exerciseId: "custom-assisted", recordingMode: "weight_reps", loadBasis: "total", countBasis: "whole_set",
    loadDirection: "lower_better", rateMetric: "none", sortOrder: 0, supersetGroup: null,
    sets: [set(`${id}-set`, 1, weight, reps, null, false)],
  }]);
}

function baseWorkout(id: string, date: string, endTime: string | null, exercises: WorkoutDoc["exercises"]): WorkoutDoc {
  return {
    id, date, startTime: `${date}T10:00:00.000Z`, endTime, planTemplateId: null, note: null, mood: null, exercises,
    createdAt: `${date}T10:00:00.000Z`, updatedAt: `${date}T11:00:00.000Z`, deletedAt: null, schemaVersion: CURRENT_SCHEMA_VERSION,
  };
}

function exercise(id: string, loadDirection: LoadDirection): ExerciseDoc {
  return {
    id, name: id, category: "other", recordingMode: "weight_reps", loadBasis: "total", countBasis: "whole_set", loadDirection, rateMetric: "none",
    equipment: "machine", description: null, primaryMuscleGroupIds: [], secondaryMuscleGroupIds: [], isCustom: true,
    replacedByExerciseId: null, createdAt: "2026-06-01T00:00:00.000Z", updatedAt: "2026-06-01T00:00:00.000Z",
    deletedAt: null, schemaVersion: CURRENT_SCHEMA_VERSION,
  };
}

function set(id: string, setNumber: number, weight: number, reps: number, rpe: number | null, isWarmup: boolean, unit: "kg" | "lb" = "kg") {
  return { id, setNumber, weight, reps, unit, durationSec: null, distanceM: null, rpe, isWarmup, isFailure: false, restSeconds: null };
}

function farmerSet(id: string, setNumber: number, weight: number, distanceM: number | null, durationSec: number | null) {
  return { id, setNumber, weight, reps: null, unit: "kg" as const, durationSec, distanceM, rpe: null, isWarmup: false, isFailure: false, restSeconds: null };
}

import { describe, expect, it } from "vitest";
import { makeEmptySnapshot } from "@/core/migrations";
import type { ExerciseDoc, LoadDirection, WorkoutDoc } from "@/core/models";
import { calculateRpeAdjustedRm } from "@/core/rm";
import { KG_PER_LB } from "@/core/workoutMetrics";
import { buildExercisePerformanceTrend, buildPerformanceRecords, buildPerformanceRefreshRecordsForWorkout } from "./performance";

describe("exercise performance records", () => {
  it("uses effective per-hand load for volume and RPE-adjusted RM", () => {
    const snapshot = makeEmptySnapshot("device-test");
    const enteredLb = 20 / KG_PER_LB;
    const recorded = workout("per-hand", "2026-06-01", [set("set-1", 1, enteredLb, 10, 8, false, "lb")], "per_hand");

    const records = buildPerformanceRecords([recorded], snapshot.exercises);
    expect(metric(records, "volume.max_set").value).toBeCloseTo(400, 5);
    expect(metric(records, "weight.max_input").value).toBeCloseTo(20, 5);
    expect(metric(records, "weight.max_effective").value).toBeCloseTo(40, 5);
    expect(metric(records, "rm.rpe_adjusted_mean").value).toBeCloseTo(
      calculateRpeAdjustedRm({ weightKg: 40, reps: 10, rpe: 8 })!.formulas.meanKg,
      5
    );
    expect(metric(records, "rm.rpe_adjusted_mean").input).toMatchObject({
      enteredLoadUnit: "lb",
      effectiveLoadKg: 40,
      loadBasis: "per_hand",
    });
    expect(metric(records, "rm.rpe_adjusted_mean").input.enteredLoad).toBeCloseTo(enteredLb, 5);
  });

  it("generates farmer-walk load metrics with complete raw input context", () => {
    const snapshot = makeEmptySnapshot("device-test");
    const recorded = farmerWorkout("farmer", "2026-06-02", [
      farmerSet("distance", 1, 32, 40, 28),
      farmerSet("duration", 2, 32, null, 30),
    ]);

    const records = buildPerformanceRecords([recorded], snapshot.exercises);
    expect(metric(records, "weight.max_effective").value).toBe(64);
    expect(metric(records, "load_distance.max").value).toBe(2560);
    expect(metric(records, "load_distance_rate.max").value).toBeCloseTo(91.428571, 5);
    expect(metric(records, "load_duration.max").value).toBe(1920);
    expect(metric(records, "load_distance.max").input).toMatchObject({
      enteredLoad: 32,
      enteredLoadUnit: "kg",
      effectiveLoadKg: 64,
      distanceM: 40,
      durationSec: 28,
    });
    expect(records.some((record) => record.unit === "kg_reps" || record.kind === "rpe_adjusted_rm")).toBe(false);
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
      workout("draft", "2026-06-03", [set("draft-set", 1, 200, 1, 10, false)], "total", null),
    ];

    const records = buildPerformanceRecords(snapshot.workouts, snapshot.exercises);
    expect(records.find((record) => record.sourceSetId === "warmup")).toBeUndefined();
    expect(records.find((record) => record.sourceWorkoutId === "draft")).toBeUndefined();
    expect(records.filter((record) => record.metricType === "weight.max_effective").map((record) => record.sourceSetId)).toEqual(["set-1", "set-2"]);

    const trend = buildExercisePerformanceTrend(snapshot.workouts, snapshot.exercises, "ex-bench-press", "weight_reps");
    expect(trend.metric_type).toBe("rm.rpe_adjusted_mean");
    expect(trend.points.map((point) => point.date)).toEqual(["2026-06-01", "2026-06-02"]);
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
      "weight.max_effective", "volume.max_set", "volume.max_workout", "rm.rpe_adjusted_mean",
    ]));
    expect(refreshed.some((record) => record.metricType === "weight.max_input")).toBe(false);
  });

  it("reassigns deleted-source PRs through a compatible redirect without rewriting workout history", () => {
    const snapshot = makeEmptySnapshot("device-test");
    const source: ExerciseDoc = { ...exercise("custom-source", "higher_better"), deletedAt: "2026-06-02T00:00:00.000Z", replacedByExerciseId: "ex-bench-press" };
    snapshot.exercises.push(source);
    const historical = baseWorkout("history", "2026-06-01", "2026-06-01T11:00:00.000Z", [{
      id: "historical-exercise",
      exerciseId: source.id,
      recordingMode: "weight_reps",
      loadBasis: "total",
      loadDirection: "higher_better",
      rateMetric: "none",
      sortOrder: 0,
      supersetGroup: null,
      sets: [set("historical-set", 1, 100, 5, 8, false)],
    }]);

    const records = buildPerformanceRecords([historical], snapshot.exercises);
    expect(records.length).toBeGreaterThan(0);
    expect(records.every((record) => record.exerciseId === "ex-bench-press")).toBe(true);
    expect(historical.exercises[0]).toMatchObject({ exerciseId: "custom-source", recordingMode: "weight_reps", loadBasis: "total" });

    source.replacedByExerciseId = null;
    expect(buildPerformanceRecords([historical], snapshot.exercises)).toEqual([]);
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
  endTime: string | null = `${date}T11:00:00.000Z`
): WorkoutDoc {
  return baseWorkout(id, date, endTime, [{
    id: `${id}-exercise`,
    exerciseId: "ex-bench-press",
    recordingMode: "weight_reps",
    loadBasis,
    loadDirection: "higher_better",
    rateMetric: "none",
    sortOrder: 0,
    supersetGroup: null,
    sets,
  }]);
}

function farmerWorkout(id: string, date: string, sets: WorkoutDoc["exercises"][number]["sets"]): WorkoutDoc {
  return baseWorkout(id, date, `${date}T11:00:00.000Z`, [{
    id: `${id}-exercise`,
    exerciseId: "ex-farmer-walk",
    recordingMode: "weight_distance_duration",
    loadBasis: "per_hand",
    loadDirection: "higher_better",
    rateMetric: "load_distance_per_time",
    sortOrder: 0,
    supersetGroup: null,
    sets,
  }]);
}

function assistedWorkout(id: string, date: string, weight: number, reps: number): WorkoutDoc {
  return baseWorkout(id, date, `${date}T11:00:00.000Z`, [{
    id: `${id}-exercise`, exerciseId: "custom-assisted", recordingMode: "weight_reps", loadBasis: "total",
    loadDirection: "lower_better", rateMetric: "none", sortOrder: 0, supersetGroup: null,
    sets: [set(`${id}-set`, 1, weight, reps, null, false)],
  }]);
}

function baseWorkout(id: string, date: string, endTime: string | null, exercises: WorkoutDoc["exercises"]): WorkoutDoc {
  return {
    id, date, startTime: `${date}T10:00:00.000Z`, endTime, planTemplateId: null, note: null, mood: null, exercises,
    createdAt: `${date}T10:00:00.000Z`, updatedAt: `${date}T11:00:00.000Z`, deletedAt: null, schemaVersion: 4,
  };
}

function exercise(id: string, loadDirection: LoadDirection): ExerciseDoc {
  return {
    id, name: id, category: "other", recordingMode: "weight_reps", loadBasis: "total", loadDirection, rateMetric: "none",
    equipment: "machine", description: null, primaryMuscleGroupIds: [], secondaryMuscleGroupIds: [], isCustom: true,
    replacedByExerciseId: null, createdAt: "2026-06-01T00:00:00.000Z", updatedAt: "2026-06-01T00:00:00.000Z",
    deletedAt: null, schemaVersion: 4,
  };
}

function set(id: string, setNumber: number, weight: number, reps: number, rpe: number | null, isWarmup: boolean, unit: "kg" | "lb" = "kg") {
  return { id, setNumber, weight, reps, unit, durationSec: null, distanceM: null, rpe, isWarmup, isFailure: false, restSeconds: null };
}

function farmerSet(id: string, setNumber: number, weight: number, distanceM: number | null, durationSec: number | null) {
  return { id, setNumber, weight, reps: null, unit: "kg" as const, durationSec, distanceM, rpe: null, isWarmup: false, isFailure: false, restSeconds: null };
}

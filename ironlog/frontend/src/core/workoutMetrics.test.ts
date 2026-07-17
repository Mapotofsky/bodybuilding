import { describe, expect, it } from "vitest";
import type { RecordingConfig } from "./recordingModes";
import {
  calculateWorkoutMetrics,
  convertWeight,
  formatOneDecimal,
  formatVolume,
  getSetLoadSemantics,
} from "./workoutMetrics";

const strengthWholeSet: RecordingConfig = {
  recordingMode: "weight_reps",
  loadBasis: "total",
  countBasis: "whole_set",
  loadDirection: "higher_better",
  rateMetric: "none",
};

describe("workout metrics", () => {
  it("converts mixed kg/lb strength volume into the requested display unit and includes warmups", () => {
    const metrics = calculateWorkoutMetrics([{
      ...strengthWholeSet,
      sets: [
        { weight: 100, reps: 10, unit: "lb", durationSec: null, distanceM: null },
        { weight: 60, reps: 5, unit: "kg", durationSec: null, distanceM: null },
      ],
    }], "kg");

    expect(metrics.totalSets).toBe(2);
    expect(metrics.totalVolumeUnit).toBe("kg");
    expect(metrics.totalVolume).toBeCloseTo(753.59237, 5);
  });

  it("keeps load and count conventions independent when calculating strength volume", () => {
    const perHandWhole = getSetLoadSemantics({ ...strengthWholeSet, loadBasis: "per_hand" }, set({ weight: 20, reps: 10 }));
    const totalPerSide = getSetLoadSemantics({ ...strengthWholeSet, countBasis: "per_side" }, set({ weight: 20, reps: 10 }));
    const perHandPerSide = getSetLoadSemantics({ ...strengthWholeSet, loadBasis: "per_hand", countBasis: "per_side" }, set({ weight: 20, reps: 10 }));

    expect(perHandWhole).toMatchObject({ inputLoadKg: 20, loadMultiplier: 2, countMultiplier: 1, aggregateMultiplier: 2, aggregateReps: 10, volumeKgReps: 400 });
    expect(totalPerSide).toMatchObject({ inputLoadKg: 20, loadMultiplier: 1, countMultiplier: 2, aggregateMultiplier: 2, aggregateReps: 20, volumeKgReps: 400 });
    expect(perHandPerSide).toMatchObject({ inputLoadKg: 20, loadMultiplier: 2, countMultiplier: 2, aggregateMultiplier: 4, aggregateReps: 20, volumeKgReps: 800 });
  });

  it("applies the two multipliers to distance load without inventing side-specific sets", () => {
    const farmer = getSetLoadSemantics({
      recordingMode: "weight_distance_duration",
      loadBasis: "per_hand",
      countBasis: "whole_set",
      loadDirection: "higher_better",
      rateMetric: "load_distance_per_time",
    }, set({ weight: 32, distanceM: 40, durationSec: 20 }));
    const suitcase = getSetLoadSemantics({
      recordingMode: "weight_distance_duration",
      loadBasis: "total",
      countBasis: "per_side",
      loadDirection: "higher_better",
      rateMetric: "load_distance_per_time",
    }, set({ weight: 32, distanceM: 40, durationSec: 20 }));

    expect(farmer.loadDistanceKgM).toBe(2560);
    expect(suitcase.loadDistanceKgM).toBe(2560);
    expect(suitcase.aggregateDistanceM).toBe(80);
    expect(suitcase.aggregateDurationSec).toBe(40);
  });

  it("converts lb before applying the aggregate multiplier", () => {
    const semantics = getSetLoadSemantics({ ...strengthWholeSet, loadBasis: "per_hand", countBasis: "per_side" }, set({
      weight: 20 / 0.45359237,
      reps: 10,
      unit: "lb",
    }));

    expect(semantics.inputLoadKg).toBeCloseTo(20, 8);
    expect(semantics.volumeKgReps).toBeCloseTo(800, 8);
  });

  it("uses matching aggregate numerators and denominators so per-side rates do not double", () => {
    const distanceOnly = getSetLoadSemantics({
      recordingMode: "distance_duration",
      loadBasis: null,
      countBasis: "per_side",
      loadDirection: null,
      rateMetric: "distance_per_time",
    }, set({ distanceM: 40, durationSec: 20 }));
    const loaded = getSetLoadSemantics({
      recordingMode: "weight_distance_duration",
      loadBasis: "total",
      countBasis: "per_side",
      loadDirection: "higher_better",
      rateMetric: "load_distance_per_time",
    }, set({ weight: 32, distanceM: 40, durationSec: 20 }));

    expect(distanceOnly.distanceRateMps).toBe(2);
    expect(loaded.loadDistanceRateKgMps).toBe(64);
  });

  it("aggregates reps, distance, and duration with the count multiplier", () => {
    const metrics = calculateWorkoutMetrics([
      {
        recordingMode: "weight_reps",
        loadBasis: "total",
        countBasis: "per_side",
        loadDirection: "higher_better",
        rateMetric: "none",
        sets: [set({ weight: 20, reps: 10 })],
      },
      {
        recordingMode: "distance_duration",
        loadBasis: null,
        countBasis: "per_side",
        loadDirection: null,
        rateMetric: "distance_per_time",
        sets: [set({ distanceM: 40, durationSec: 20 })],
      },
    ], "kg");

    expect(metrics.totalReps).toBe(20);
    expect(metrics.totalDistanceM).toBe(80);
    expect(metrics.totalDurationSec).toBe(40);
    expect(metrics.totalVolume).toBe(400);
  });

  it("uses the same conversion constant in both directions", () => {
    expect(convertWeight(100, "lb", "kg")).toBeCloseTo(45.359237);
    expect(convertWeight(45.359237, "kg", "lb")).toBeCloseTo(100);
  });

  it("formats strength volume with one decimal and kg/lb reps unit", () => {
    expect(formatVolume(753.59237, "kg")).toBe("753.6 kg·次");
    expect(formatVolume(1234, "lb")).toBe("1234.0 lb·次");
    expect(formatOneDecimal(-0.01)).toBe("0.0");
  });
});

function set(values: Partial<{
  weight: number | null;
  reps: number | null;
  unit: "kg" | "lb";
  distanceM: number | null;
  durationSec: number | null;
}>) {
  return {
    weight: values.weight ?? null,
    reps: values.reps ?? null,
    unit: values.unit ?? "kg",
    distanceM: values.distanceM ?? null,
    durationSec: values.durationSec ?? null,
  };
}

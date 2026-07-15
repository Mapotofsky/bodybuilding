import { describe, expect, it } from "vitest";
import { calculateWorkoutMetrics, convertWeight, formatOneDecimal, formatVolume } from "./workoutMetrics";

describe("workout metrics", () => {
  it("converts mixed kg/lb strength volume into the requested display unit and includes warmups", () => {
    const metrics = calculateWorkoutMetrics([
      {
        recordingMode: "weight_reps",
        loadBasis: "total",
        loadDirection: "higher_better",
        rateMetric: "none",
        sets: [
          { weight: 100, reps: 10, unit: "lb", durationSec: null, distanceM: null },
          { weight: 60, reps: 5, unit: "kg", durationSec: null, distanceM: null },
        ],
      },
    ], "kg");

    expect(metrics.totalSets).toBe(2);
    expect(metrics.totalVolumeUnit).toBe("kg");
    expect(metrics.totalVolume).toBeCloseTo(753.59237, 5);
  });

  it("applies the per-hand multiplier after unit conversion", () => {
    const metrics = calculateWorkoutMetrics([{
      recordingMode: "weight_reps",
      loadBasis: "per_hand",
      loadDirection: "higher_better",
      rateMetric: "none",
      sets: [{ weight: 20, reps: 10, unit: "kg", durationSec: null, distanceM: null }],
    }], "kg");

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

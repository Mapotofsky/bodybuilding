import { describe, expect, it } from "vitest";
import { calculateWorkoutMetrics, convertWeight } from "./workoutMetrics";

describe("workout metrics", () => {
  it("converts mixed kg/lb strength volume into the requested display unit and includes warmups", () => {
    const metrics = calculateWorkoutMetrics([
      {
        exerciseType: "strength",
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

  it("uses the same conversion constant in both directions", () => {
    expect(convertWeight(100, "lb", "kg")).toBeCloseTo(45.359237);
    expect(convertWeight(45.359237, "kg", "lb")).toBeCloseTo(100);
  });
});

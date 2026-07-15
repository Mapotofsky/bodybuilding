import { describe, expect, it } from "vitest";
import {
  formatPerformanceInput,
  formatPerformanceMetric,
  formatSet,
  weightFieldLabel,
} from "./recordingPresentation";

const farmerRecording = {
  recording_mode: "weight_distance_duration",
  load_basis: "per_hand",
  load_direction: "higher_better",
  rate_metric: "load_distance_per_time",
} as const;

describe("recording presentation", () => {
  it("formats farmer-walk inputs without invented zero values", () => {
    expect(formatSet(farmerRecording, {
      weight: 32,
      reps: null,
      unit: "kg",
      distance_m: 40,
      duration_sec: 28,
    })).toBe("每手 32 kg · 40 m · 28 s");

    expect(formatSet(farmerRecording, {
      weight: 32,
      reps: null,
      unit: "kg",
      distance_m: null,
      duration_sec: 30,
    })).toBe("每手 32 kg · 30 s");
  });

  it("derives a user-facing weight label from basis and direction", () => {
    expect(weightFieldLabel(farmerRecording)).toBe("每手重量");
    expect(weightFieldLabel({ load_basis: "total", load_direction: "higher_better" })).toBe("重量");
    expect(weightFieldLabel({ load_basis: "per_hand", load_direction: "lower_better" })).toBe("辅助重量");
  });

  it("formats composite load metrics and preserves their raw context", () => {
    const metric = {
      metric_type: "load_distance_rate.max",
      value: 64 * 40 / 28,
      unit: "kg_meters_per_second",
      input: {
        enteredLoad: 32,
        enteredLoadUnit: "kg",
        effectiveLoadKg: 64,
        loadBasis: "per_hand",
        loadDirection: "higher_better",
        reps: null,
        rpe: null,
        effectiveReps: null,
        distanceM: 40,
        durationSec: 28,
        workoutVolumeKgReps: null,
      },
      rm: null,
    } as const;

    expect(formatPerformanceMetric(metric, "kg")).toBe("91.43 kg·m/s");
    expect(formatPerformanceInput(metric.input, "kg")).toBe("每手 32 kg · 40 m · 28 s");
  });
});

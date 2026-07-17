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
  count_basis: "whole_set",
  load_direction: "higher_better",
  rate_metric: "load_distance_per_time",
} as const;

const unilateralRecording = {
  recording_mode: "weight_reps",
  load_basis: "total",
  count_basis: "per_side",
  load_direction: "higher_better",
  rate_metric: "none",
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
        recordingMode: "weight_distance_duration",
        loadBasis: "per_hand",
        countBasis: "whole_set",
        loadDirection: "higher_better",
        rateMetric: "load_distance_per_time",
        reps: null,
        rpe: null,
        distanceM: 40,
        durationSec: 28,
      },
      rm: null,
    } as const;

    expect(formatPerformanceMetric(metric, "kg")).toBe("91.43 kg·m/s");
    expect(formatPerformanceInput(metric.input, "kg")).toBe("每手 32 kg · 40 m · 28 s");
  });

  it("marks unilateral count fields as per-side while retaining one set record", () => {
    expect(formatSet(unilateralRecording, {
      weight: 20,
      reps: 10,
      unit: "kg",
      distance_m: null,
      duration_sec: null,
    })).toBe("20 kg × 每侧 10 次");

    expect(formatPerformanceInput({
      recordingMode: "weight_reps",
      enteredLoad: 20,
      enteredLoadUnit: "kg",
      loadBasis: "total",
      countBasis: "per_side",
      loadDirection: "higher_better",
      rateMetric: "none",
      reps: 10,
      rpe: null,
      distanceM: null,
      durationSec: null,
    }, "kg")).toBe("20 kg · 每侧 10 次");
  });
});

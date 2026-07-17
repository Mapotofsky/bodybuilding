import { describe, expect, it } from "vitest";
import type { RecordingConfig } from "@/core/recordingModes";
import { draftCompletionTime, validateWorkoutSet } from "./workout";

const strength: RecordingConfig = {
  recordingMode: "weight_reps",
  loadBasis: "total",
  countBasis: "whole_set",
  loadDirection: "higher_better",
  rateMetric: "none",
};
const farmerWalk: RecordingConfig = {
  recordingMode: "weight_distance_duration",
  loadBasis: "per_hand",
  countBasis: "whole_set",
  loadDirection: "higher_better",
  rateMetric: "load_distance_per_time",
};

describe("workout service validation", () => {
  it("separates draft range validation from completed-set requirements", () => {
    expect(() => validateWorkoutSet({ set_number: 1, weight: null, reps: null }, strength, "draft")).not.toThrow();
    expect(() => validateWorkoutSet({ set_number: 1, weight: null, reps: null }, strength, "complete")).toThrow("重量不能为空");
    expect(() => validateWorkoutSet({ set_number: 1, weight: 20, reps: 0 }, strength, "draft")).toThrow("次数");
    expect(() => validateWorkoutSet({ set_number: 0, weight: 20, reps: 8 }, strength, "complete")).toThrow("组号");
  });

  it("accepts all farmer-walk completion variants and rejects incomplete ones", () => {
    expect(() => validateWorkoutSet({ set_number: 1, weight: 32, distance_m: 40 }, farmerWalk)).not.toThrow();
    expect(() => validateWorkoutSet({ set_number: 1, weight: 32, duration_sec: 30 }, farmerWalk)).not.toThrow();
    expect(() => validateWorkoutSet({ set_number: 1, weight: 32, distance_m: 40, duration_sec: 28 }, farmerWalk)).not.toThrow();
    expect(() => validateWorkoutSet({ set_number: 1, weight: 32 }, farmerWalk)).toThrow("至少填写一项");
    expect(() => validateWorkoutSet({ set_number: 1, distance_m: 40 }, farmerWalk)).toThrow("重量不能为空");
    expect(() => validateWorkoutSet({ set_number: 1 }, farmerWalk, "draft")).not.toThrow();
  });

  it("rejects invalid numeric values and fields outside the selected mode", () => {
    expect(() => validateWorkoutSet({ set_number: 1, weight: -1, distance_m: 10 }, farmerWalk, "draft")).toThrow("重量");
    expect(() => validateWorkoutSet({ set_number: 1, weight: Number.NaN, distance_m: 10 }, farmerWalk, "draft")).toThrow("有效数值");
    expect(() => validateWorkoutSet({ set_number: 1, weight: Number.POSITIVE_INFINITY, distance_m: 10 }, farmerWalk, "draft")).toThrow("有效数值");
    expect(() => validateWorkoutSet({ set_number: 1, weight: 20, reps: 8, distance_m: 10 }, strength, "draft")).toThrow("不适用于");
  });

  it("accepts supported non-default set metadata", () => {
    expect(() => validateWorkoutSet({
      set_number: 1,
      weight: 80,
      reps: 6,
      unit: "kg",
      rpe: 9,
      is_warmup: true,
      is_failure: true,
      rest_seconds: 120,
    }, strength)).not.toThrow();
  });

  it("ends a discarded draft at its last recorded activity instead of the selection time", () => {
    expect(draftCompletionTime({ createdAt: "2026-06-22T10:00:00.000Z", updatedAt: "2026-06-22T10:18:00.000Z" })).toBe("2026-06-22T10:18:00.000Z");
  });
});

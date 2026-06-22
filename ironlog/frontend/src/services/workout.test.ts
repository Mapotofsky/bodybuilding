import { describe, expect, it } from "vitest";
import { draftCompletionTime, validateWorkoutSet } from "./workout";

describe("workout service validation", () => {
  it("rejects values that do not match the exercise type", () => {
    expect(() => validateWorkoutSet({ set_number: 1, reps: 0 }, "reps_only")).toThrow("次数");
    expect(() => validateWorkoutSet({ set_number: 1, duration_sec: 0, distance_m: 100 }, "cardio")).toThrow("时长");
    expect(() => validateWorkoutSet({ set_number: 1, duration_sec: 0 }, "static_hold")).toThrow("保持时长");
    expect(() => validateWorkoutSet({ set_number: 0, weight: 20, reps: 8 }, "strength")).toThrow("组号");
  });

  it("allows nullable unfilled fields while validating values supplied by the user", () => {
    expect(() => validateWorkoutSet({ set_number: 1, weight: null, reps: null }, "strength")).not.toThrow();
    expect(() => validateWorkoutSet({ set_number: 1, distance_m: 1000, duration_sec: 300 }, "cardio")).not.toThrow();
    expect(() => validateWorkoutSet({ set_number: 1, duration_sec: 45 }, "static_hold")).not.toThrow();
  });

  it("ends a discarded draft at its last recorded activity instead of the selection time", () => {
    expect(draftCompletionTime({ createdAt: "2026-06-22T10:00:00.000Z", updatedAt: "2026-06-22T10:18:00.000Z" })).toBe("2026-06-22T10:18:00.000Z");
  });
});

import { describe, expect, it } from "vitest";
import { calculateRmFormulaResults, calculateRpeAdjustedRm } from "./rm";

describe("RPE adjusted RM", () => {
  it("uses effective reps derived from RPE without persisting RIR", () => {
    const result = calculateRpeAdjustedRm({ weightKg: 100, reps: 5, rpe: 8 });

    expect(result?.rir).toBe(2);
    expect(result?.effectiveReps).toBe(7);
    expect(result?.formulas.epleyKg).toBeCloseTo(100 * (1 + 7 / 30));
    expect(result?.formulas.meanKg).toBeGreaterThan(100);
  });

  it("rejects reps or effective reps outside 1..12", () => {
    expect(calculateRpeAdjustedRm({ weightKg: 100, reps: 13, rpe: 10 })).toBeNull();
    expect(calculateRpeAdjustedRm({ weightKg: 100, reps: 12, rpe: 8 })).toBeNull();
  });

  it("exposes formula multipliers for the RM tool chart", () => {
    const result = calculateRmFormulaResults(1, 5);

    expect(result.epleyKg).toBeCloseTo(1 * (1 + 5 / 30));
    expect(result.brzyckiKg).toBeCloseTo(1 * 36 / (37 - 5));
    expect(result.lombardiKg).toBeCloseTo(Math.pow(5, 0.10));
    expect(result.wathenKg).toBeGreaterThan(1);
  });
});

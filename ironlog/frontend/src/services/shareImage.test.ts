import { describe, expect, it } from "vitest";
import type { PerformanceRecord } from "@/services/performance";
import { formatPerformanceShareLines } from "./shareImage";

describe("workout share performance lines", () => {
  it("shows both the farmer-walk composite result and its original inputs", () => {
    const record = {
      exercise_name: "农夫行走",
      metric_label: "最大单位时间负载",
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
    } as PerformanceRecord;

    expect(formatPerformanceShareLines(record, "kg")).toEqual([
      "• 农夫行走 最大单位时间负载 91.43 kg·m/s",
      "原始记录：每手 32 kg · 40 m · 28 s",
    ]);
  });
});

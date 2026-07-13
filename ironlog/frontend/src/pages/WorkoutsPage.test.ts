import { describe, expect, it } from "vitest";
import type { WorkoutSummary } from "@/types";
import { monthlySummaryMetric } from "./WorkoutsPage";

describe("workout list monthly summary", () => {
  it("does not show zero kg volume for a month containing only static-hold training", () => {
    const workout = {
      total_volume: 0,
      total_volume_unit: "kg",
      total_distance_m: 0,
      total_duration_sec: 105,
      total_reps: 0,
    } as WorkoutSummary;

    expect(monthlySummaryMetric([workout])).toEqual({ label: "动作时长", value: "1 分 45 秒" });
  });
});

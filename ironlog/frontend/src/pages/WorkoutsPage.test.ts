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
      total_load_distance_kg_m: 0,
      total_load_duration_kg_sec: 0,
      total_reps: 0,
    } as WorkoutSummary;

    expect(monthlySummaryMetric([workout])).toEqual({ label: "动作时长", value: "1 分 45 秒" });
  });

  it("prefers a farmer-walk distance load over its raw distance", () => {
    const workout = {
      total_volume: 0,
      total_volume_unit: "kg",
      total_distance_m: 40,
      total_duration_sec: 0,
      total_load_distance_kg_m: 2560,
      total_load_duration_kg_sec: 0,
      total_reps: 0,
    } as WorkoutSummary;

    expect(monthlySummaryMetric([workout])).toEqual({ label: "总距离负载", value: "2560.0 kg·m" });
  });
});

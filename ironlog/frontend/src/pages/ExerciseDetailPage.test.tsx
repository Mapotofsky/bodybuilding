import { describe, expect, it } from "vitest";
import type { ExerciseDetail } from "@/types";
import { bestStatCards } from "./ExerciseDetailPage";

const emptyPerformance: ExerciseDetail["stats"]["performance"] = {
  load_basis: null,
  count_basis: "whole_set",
  load_direction: null,
  best_load: null,
  best_set_volume: null,
  best_workout_volume: null,
  best_reps: null,
  best_distance_m: null,
  best_duration_sec: null,
  best_speed_mps: null,
  best_load_distance_kg_m: null,
  best_load_duration_kg_sec: null,
  best_load_distance_rate_kg_mps: null,
  display_unit: "kg",
};

describe("exercise detail load stat cards", () => {
  it("shows the input-weight PR for total-load exercises", () => {
    const labels = bestStatCards({
      ...emptyPerformance,
      load_basis: "total",
      load_direction: "higher_better",
      best_load: 60,
    }).map((card) => card.label);

    expect(labels).toEqual(["最大重量"]);
  });

  it("labels per-hand PRs without a derived effective-load card", () => {
    const labels = bestStatCards({
      ...emptyPerformance,
      load_basis: "per_hand",
      load_direction: "higher_better",
      best_load: 32,
    }).map((card) => card.label);

    expect(labels).toEqual(["每手最大重量"]);
  });

  it("keeps per-side set PRs in the entered count basis", () => {
    const labels = bestStatCards({
      ...emptyPerformance,
      count_basis: "per_side",
      best_reps: 10,
      best_distance_m: 40,
      best_duration_sec: 28,
    }).map((card) => card.label);

    expect(labels).toEqual(["每侧最大次数", "每侧最大距离", "每侧最长时间"]);
  });
});

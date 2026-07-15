import { describe, expect, it } from "vitest";
import type { ExerciseDetail } from "@/types";
import { bestStatCards } from "./ExerciseDetailPage";

const emptyPerformance: ExerciseDetail["stats"]["performance"] = {
  load_basis: null,
  load_direction: null,
  best_input_load: null,
  best_effective_load: null,
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
  it("shows only effective load for total-load exercises", () => {
    const labels = bestStatCards({
      ...emptyPerformance,
      load_basis: "total",
      load_direction: "higher_better",
      best_input_load: 60,
      best_effective_load: 60,
    }).map((card) => card.label);

    expect(labels).toContain("最大有效负重");
    expect(labels).not.toContain("最大输入重量");
  });

  it("shows both input and effective load for per-hand exercises", () => {
    const labels = bestStatCards({
      ...emptyPerformance,
      load_basis: "per_hand",
      load_direction: "higher_better",
      best_input_load: 32,
      best_effective_load: 64,
    }).map((card) => card.label);

    expect(labels).toEqual(["最大输入重量", "最大有效负重"]);
  });
});

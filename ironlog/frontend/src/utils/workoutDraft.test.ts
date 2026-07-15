import { describe, expect, it } from "vitest";
import type { Exercise, WorkoutExercise } from "@/types";
import { exerciseForDraftResume, sessionExerciseForDraft } from "./workoutDraft";

const draftExercise: WorkoutExercise = {
  id: "workout-exercise-1",
  exercise_id: "custom-ex-1",
  recording_mode: "weight_distance_duration",
  load_basis: "per_hand",
  load_direction: "higher_better",
  rate_metric: "load_distance_per_time",
  exercise_name: "旧名称",
  exercise_category: "core",
  sort_order: 0,
  superset_group: 7,
  sets: [],
};

describe("exerciseForDraftResume", () => {
  it("keeps the complete workout recording snapshot while using current exercise metadata", () => {
    const linked: Exercise = {
      id: "custom-ex-1",
      name: "当前名称",
      category: "arms",
      recording_mode: "weight_reps",
      load_basis: "total",
      load_direction: "higher_better",
      rate_metric: "none",
      equipment: "barbell",
      description: "当前说明",
      primary_muscle_group_ids: ["biceps"],
      secondary_muscle_group_ids: [],
      is_custom: true,
    };

    expect(exerciseForDraftResume(draftExercise, linked)).toMatchObject({
      id: "custom-ex-1",
      name: "当前名称",
      category: "arms",
      recording_mode: "weight_distance_duration",
      load_basis: "per_hand",
      load_direction: "higher_better",
      rate_metric: "load_distance_per_time",
      description: "当前说明",
    });
  });

  it("builds a readable snapshot when the exercise no longer exists", () => {
    expect(exerciseForDraftResume(draftExercise)).toMatchObject({
      id: "custom-ex-1",
      name: "旧名称",
      category: "core",
      recording_mode: "weight_distance_duration",
      load_basis: "per_hand",
      load_direction: "higher_better",
      rate_metric: "load_distance_per_time",
      is_custom: false,
    });
  });

  it("keeps the imported superset group when restoring a draft", () => {
    expect(sessionExerciseForDraft(draftExercise).superset_group).toBe(7);
  });
});

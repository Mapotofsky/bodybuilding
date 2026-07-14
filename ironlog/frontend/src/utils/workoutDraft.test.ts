import { describe, expect, it } from "vitest";
import type { Exercise, WorkoutExercise } from "@/types";
import { exerciseForDraftResume } from "./workoutDraft";

const draftExercise: WorkoutExercise = {
  id: "workout-exercise-1",
  exercise_id: "custom-ex-1",
  exercise_type: "reps_only",
  exercise_name: "旧名称",
  exercise_category: "core",
  sort_order: 0,
  superset_group: null,
  sets: [],
};

describe("exerciseForDraftResume", () => {
  it("keeps the workout type snapshot while using current exercise metadata", () => {
    const linked: Exercise = {
      id: "custom-ex-1",
      name: "当前名称",
      category: "arms",
      type: "strength",
      description: "当前说明",
      primary_muscle_group_ids: ["biceps"],
      secondary_muscle_group_ids: [],
      is_custom: true,
    };

    expect(exerciseForDraftResume(draftExercise, linked)).toMatchObject({
      id: "custom-ex-1",
      name: "当前名称",
      category: "arms",
      type: "reps_only",
      description: "当前说明",
    });
  });

  it("builds a readable snapshot when the exercise no longer exists", () => {
    expect(exerciseForDraftResume(draftExercise)).toMatchObject({
      id: "custom-ex-1",
      name: "旧名称",
      category: "core",
      type: "reps_only",
      is_custom: false,
    });
  });
});

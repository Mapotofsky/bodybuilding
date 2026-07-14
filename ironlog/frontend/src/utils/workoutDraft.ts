import type { Exercise, WorkoutExercise } from "@/types";

export function exerciseForDraftResume(item: WorkoutExercise, linked?: Exercise): Exercise {
  if (linked) {
    return { ...linked, type: item.exercise_type };
  }
  return {
    id: item.exercise_id,
    name: item.exercise_name || `动作#${item.exercise_id}`,
    category: item.exercise_category || "",
    type: item.exercise_type,
    description: null,
    primary_muscle_group_ids: [],
    secondary_muscle_group_ids: [],
    is_custom: false,
  };
}

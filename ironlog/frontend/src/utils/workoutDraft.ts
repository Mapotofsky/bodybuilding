import { CATEGORY_LABELS, type Exercise, type ExerciseCategory, type WorkoutExercise } from "@/types";

export function exerciseForDraftResume(item: WorkoutExercise, linked?: Exercise): Exercise {
  if (linked) {
    return { ...linked, type: item.exercise_type };
  }
  return {
    id: item.exercise_id,
    name: item.exercise_name || `动作#${item.exercise_id}`,
    category: isExerciseCategory(item.exercise_category) ? item.exercise_category : "other",
    type: item.exercise_type,
    equipment: null,
    description: null,
    primary_muscle_group_ids: [],
    secondary_muscle_group_ids: [],
    is_custom: false,
  };
}

function isExerciseCategory(value: string | undefined): value is ExerciseCategory {
  return Boolean(value && Object.prototype.hasOwnProperty.call(CATEGORY_LABELS, value));
}

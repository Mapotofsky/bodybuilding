import { CATEGORY_LABELS, type Exercise, type ExerciseCategory, type WorkoutExercise } from "@/types";

export interface RestoredSessionExercise {
  id?: string;
  exercise: Exercise;
  superset_group: number | null;
  sets: WorkoutExercise["sets"];
}

export function sessionExerciseForDraft(item: WorkoutExercise, linked?: Exercise): RestoredSessionExercise {
  return {
    id: item.id,
    exercise: exerciseForDraftResume(item, linked),
    superset_group: item.superset_group,
    sets: item.sets,
  };
}

export function exerciseForDraftResume(item: WorkoutExercise, linked?: Exercise): Exercise {
  if (linked) {
    return {
      ...linked,
      recording_mode: item.recording_mode,
      load_basis: item.load_basis,
      count_basis: item.count_basis,
      load_direction: item.load_direction,
      rate_metric: item.rate_metric,
    };
  }
  return {
    id: item.exercise_id,
    name: item.exercise_name || `动作#${item.exercise_id}`,
    category: isExerciseCategory(item.exercise_category) ? item.exercise_category : "other",
    recording_mode: item.recording_mode,
    load_basis: item.load_basis,
    count_basis: item.count_basis,
    load_direction: item.load_direction,
    rate_metric: item.rate_metric,
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

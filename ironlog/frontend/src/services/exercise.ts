import { localRepository } from "@/repositories/localJsonRepository";
import { toExercise } from "@/services/localMappers";
import type { Exercise, ExerciseType } from "@/types";

export async function getExercises(params?: {
  category?: string;
  q?: string;
}): Promise<Exercise[]> {
  const docs = await localRepository.list(params);
  return docs.map(toExercise);
}

export async function createExercise(body: {
  name: string;
  category: string;
  type?: ExerciseType;
  description?: string;
}): Promise<Exercise> {
  const doc = await localRepository.create({
    name: body.name,
    category: body.category,
    type: body.type || "strength",
    description: body.description || null,
    metValue: null,
  });
  return toExercise(doc);
}

export interface ExerciseHistoryRecord {
  date: string;
  exercise_type: ExerciseType;
  set_number: number;
  weight: number | null;
  reps: number | null;
  unit: string;
  duration_sec: number | null;
  distance_m: number | null;
  rest_seconds: number | null;
}

export async function getExerciseHistory(
  exerciseId: string,
  limit = 30
): Promise<ExerciseHistoryRecord[]> {
  const workouts = await localRepository.listWorkouts();
  return workouts
    .flatMap((workout) =>
      workout.exercises
        .filter((exercise) => exercise.exerciseId === exerciseId)
        .flatMap((exercise) =>
          exercise.sets.map((set) => ({
            date: workout.date,
            exercise_type: exercise.exerciseType,
            set_number: set.setNumber,
            weight: set.weight,
            reps: set.reps,
            unit: set.unit,
            duration_sec: set.durationSec,
            distance_m: set.distanceM,
            rest_seconds: set.restSeconds,
          }))
        )
    )
    .sort((a, b) => b.date.localeCompare(a.date) || a.set_number - b.set_number)
    .slice(0, limit);
}

import { localRepository } from "@/repositories/localJsonRepository";
import { toExercise } from "@/services/localMappers";
import type { Exercise } from "@/types";

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
  type?: string;
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
  set_number: number;
  weight: number | null;
  reps: number | null;
  unit: string;
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
            set_number: set.setNumber,
            weight: set.weight,
            reps: set.reps,
            unit: set.unit,
            rest_seconds: set.restSeconds,
          }))
        )
    )
    .sort((a, b) => b.date.localeCompare(a.date) || a.set_number - b.set_number)
    .slice(0, limit);
}

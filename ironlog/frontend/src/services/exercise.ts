import { localRepository } from "@/repositories/localJsonRepository";
import { toExercise } from "@/services/localMappers";
import type { Exercise, ExerciseType } from "@/types";
import { resolveExerciseId } from "@/core/exerciseRedirects";

const VALID_TYPES: ExerciseType[] = ["strength", "cardio", "reps_only", "static_hold"];

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
  const input = validateExerciseInput(body);
  const doc = await localRepository.create({
    ...input,
    metValue: null,
  });
  return toExercise(doc);
}

export async function updateExercise(id: string, body: { name: string; category: string; type: ExerciseType; description?: string | null }): Promise<Exercise> {
  const input = validateExerciseInput(body);
  return toExercise(await localRepository.updateExercise(id, input));
}

export async function deleteExercise(id: string, replacedByExerciseId: string | null): Promise<void> {
  await localRepository.deleteExercise(id, replacedByExerciseId);
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
  const exercises = (await localRepository.getSnapshot()).exercises;
  return workouts
    .flatMap((workout) =>
      workout.exercises
        .filter((exercise) => {
          const resolved = resolveExerciseId(exercise.exerciseId, exercises);
          return exercise.exerciseId === exerciseId || (resolved.status === "resolved" && resolved.resolvedId === exerciseId);
        })
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

function validateExerciseInput(body: { name: string; category: string; type?: ExerciseType; description?: string | null }): { name: string; category: string; type: ExerciseType; description: string | null } {
  const name = body.name.trim();
  const category = body.category.trim();
  const type = body.type || "strength";
  if (!name || name.length > 80) throw new Error("动作名称必须为 1 到 80 个字符");
  if (!category || category.length > 40) throw new Error("动作分类必须为 1 到 40 个字符");
  if (!VALID_TYPES.includes(type)) throw new Error("动作记录类型无效");
  const description = body.description?.trim() || null;
  if (description && description.length > 500) throw new Error("动作说明不能超过 500 个字符");
  return { name, category, type, description };
}

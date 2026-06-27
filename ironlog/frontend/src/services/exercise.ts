import { localRepository } from "@/repositories/localJsonRepository";
import { toExercise } from "@/services/localMappers";
import { MUSCLE_GROUP_LABELS, type Exercise, type ExerciseType, type MuscleGroupId } from "@/types";
import { resolveExerciseId } from "@/core/exerciseRedirects";

const VALID_TYPES: ExerciseType[] = ["strength", "cardio", "reps_only", "static_hold"];
const VALID_MUSCLE_GROUPS = new Set<MuscleGroupId>(Object.keys(MUSCLE_GROUP_LABELS) as MuscleGroupId[]);

type ValidatedExerciseInput = {
  name: string;
  category: string;
  type: ExerciseType;
  description?: string | null;
  primaryMuscleGroupIds?: MuscleGroupId[];
  secondaryMuscleGroupIds?: MuscleGroupId[];
};

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
  primary_muscle_group_ids?: MuscleGroupId[];
  secondary_muscle_group_ids?: MuscleGroupId[];
}): Promise<Exercise> {
  const input = validateExerciseInput(body);
  const doc = await localRepository.create({
    name: input.name,
    category: input.category,
    type: input.type,
    description: input.description ?? null,
    primaryMuscleGroupIds: input.primaryMuscleGroupIds ?? [],
    secondaryMuscleGroupIds: input.secondaryMuscleGroupIds ?? [],
    metValue: null,
  });
  return toExercise(doc);
}

export async function updateExercise(id: string, body: {
  name: string;
  category: string;
  type: ExerciseType;
  description?: string | null;
  primary_muscle_group_ids?: MuscleGroupId[];
  secondary_muscle_group_ids?: MuscleGroupId[];
}): Promise<Exercise> {
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
  rpe: number | null;
  is_warmup: boolean;
  is_failure: boolean;
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
          if (workout.endTime == null) return false;
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
            rpe: set.rpe,
            is_warmup: set.isWarmup,
            is_failure: set.isFailure,
            rest_seconds: set.restSeconds,
          }))
        )
    )
    .sort((a, b) => b.date.localeCompare(a.date) || a.set_number - b.set_number)
    .slice(0, limit);
}

function validateExerciseInput(body: {
  name: string;
  category: string;
  type?: ExerciseType;
  description?: string | null;
  primary_muscle_group_ids?: MuscleGroupId[];
  secondary_muscle_group_ids?: MuscleGroupId[];
}): ValidatedExerciseInput {
  const name = body.name.trim();
  const category = body.category.trim();
  const type = body.type || "strength";
  if (!name || name.length > 80) throw new Error("动作名称必须为 1 到 80 个字符");
  if (!category || category.length > 40) throw new Error("动作分类必须为 1 到 40 个字符");
  if (!VALID_TYPES.includes(type)) throw new Error("动作记录类型无效");
  const result: ValidatedExerciseInput = { name, category, type };
  if ("description" in body) {
    const description = body.description?.trim() || null;
    if (description && description.length > 500) throw new Error("动作说明不能超过 500 个字符");
    result.description = description;
  }
  if ("primary_muscle_group_ids" in body || "secondary_muscle_group_ids" in body) {
    const primary = validateMuscleGroups(body.primary_muscle_group_ids ?? [], "主目标肌群", 3);
    const secondary = validateMuscleGroups(body.secondary_muscle_group_ids ?? [], "次要目标肌群", 6);
    const primarySet = new Set(primary);
    if (secondary.some((item) => primarySet.has(item))) throw new Error("主目标肌群和次要目标肌群不能重复");
    result.primaryMuscleGroupIds = primary;
    result.secondaryMuscleGroupIds = secondary;
  }
  return result;
}

function validateMuscleGroups(values: MuscleGroupId[], label: string, max: number): MuscleGroupId[] {
  const seen = new Set<MuscleGroupId>();
  for (const value of values) {
    if (!VALID_MUSCLE_GROUPS.has(value)) throw new Error(`${label}无效`);
    if (seen.has(value)) throw new Error(`${label}不能重复`);
    seen.add(value);
  }
  if (seen.size > max) throw new Error(`${label}最多选择 ${max} 个`);
  return [...seen];
}

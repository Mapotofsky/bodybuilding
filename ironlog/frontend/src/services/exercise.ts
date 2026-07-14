import { resolveExerciseId } from "@/core/exerciseRedirects";
import type { EquipmentId, ExerciseCategory, ExerciseDoc, ExerciseType, MuscleGroupId } from "@/core/models";
import { localRepository } from "@/repositories/localJsonRepository";
import { toExercise } from "@/services/localMappers";
import { CATEGORY_LABELS, EQUIPMENT_LABELS, MUSCLE_GROUP_LABELS, type Exercise } from "@/types";

const VALID_TYPES: ExerciseType[] = ["strength", "cardio", "reps_only", "static_hold"];
const VALID_CATEGORIES = new Set<ExerciseCategory>(Object.keys(CATEGORY_LABELS) as ExerciseCategory[]);
const VALID_EQUIPMENT = new Set<EquipmentId>(Object.keys(EQUIPMENT_LABELS) as EquipmentId[]);
const VALID_MUSCLE_GROUPS = new Set<MuscleGroupId>(Object.keys(MUSCLE_GROUP_LABELS) as MuscleGroupId[]);

export interface CreateExerciseInput {
  name: string;
  category: ExerciseCategory;
  type: ExerciseType;
  equipment: EquipmentId | null;
  description: string | null;
  primary_muscle_group_ids: MuscleGroupId[];
  secondary_muscle_group_ids: MuscleGroupId[];
}

export interface UpdateExerciseInput {
  name?: string;
  category?: ExerciseCategory;
  type?: ExerciseType;
  equipment?: EquipmentId | null;
  description?: string | null;
  primary_muscle_group_ids?: MuscleGroupId[];
  secondary_muscle_group_ids?: MuscleGroupId[];
}

export async function getExercises(params?: {
  category?: ExerciseCategory;
  equipment?: EquipmentId | null;
  q?: string;
}): Promise<Exercise[]> {
  return (await localRepository.list(params)).map(toExercise);
}

export async function createExercise(body: CreateExerciseInput): Promise<Exercise> {
  const input = validateCreateExerciseInput(body);
  return toExercise(await localRepository.create(input));
}

export async function updateExercise(id: string, body: UpdateExerciseInput): Promise<Exercise> {
  const current = await localRepository.get(id);
  if (!current) throw new Error("动作不存在");
  const patch = validateUpdateExerciseInput(body, current);
  return toExercise(await localRepository.updateExercise(id, patch));
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

export async function getExerciseHistory(exerciseId: string, limit = 30): Promise<ExerciseHistoryRecord[]> {
  const workouts = await localRepository.listWorkouts();
  const exercises = (await localRepository.getSnapshot()).exercises;
  return workouts
    .flatMap((workout) => workout.exercises
      .filter((exercise) => {
        if (workout.endTime == null) return false;
        const resolved = resolveExerciseId(exercise.exerciseId, exercises);
        return exercise.exerciseId === exerciseId || (resolved.status === "resolved" && resolved.resolvedId === exerciseId);
      })
      .flatMap((exercise) => exercise.sets.map((set) => ({
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
      }))))
    .sort((a, b) => b.date.localeCompare(a.date) || a.set_number - b.set_number)
    .slice(0, limit);
}

export function validateCreateExerciseInput(body: CreateExerciseInput) {
  if (body.type === undefined || body.equipment === undefined || body.description === undefined) {
    throw new Error("创建动作必须明确提交记录类型、器械和动作说明");
  }
  const primary = validateMuscleGroups(body.primary_muscle_group_ids, "主目标肌群", 3);
  const secondary = validateMuscleGroups(body.secondary_muscle_group_ids, "次要目标肌群", 6);
  validateMuscleOverlap(primary, secondary);
  return {
    name: validateName(body.name),
    category: validateCategory(body.category),
    type: validateType(body.type),
    equipment: validateEquipment(body.equipment),
    description: validateDescription(body.description),
    primaryMuscleGroupIds: primary,
    secondaryMuscleGroupIds: secondary,
  };
}

export function validateUpdateExerciseInput(body: UpdateExerciseInput, current: ExerciseDoc) {
  const patch: Partial<Pick<ExerciseDoc, "name" | "category" | "type" | "equipment" | "description" | "primaryMuscleGroupIds" | "secondaryMuscleGroupIds">> = {};
  if (body.name !== undefined) patch.name = validateName(body.name);
  if (body.category !== undefined) patch.category = validateCategory(body.category);
  if (body.type !== undefined) patch.type = validateType(body.type);
  if (body.equipment !== undefined) patch.equipment = validateEquipment(body.equipment);
  if (body.description !== undefined) patch.description = validateDescription(body.description);
  if (body.primary_muscle_group_ids !== undefined) patch.primaryMuscleGroupIds = validateMuscleGroups(body.primary_muscle_group_ids, "主目标肌群", 3);
  if (body.secondary_muscle_group_ids !== undefined) patch.secondaryMuscleGroupIds = validateMuscleGroups(body.secondary_muscle_group_ids, "次要目标肌群", 6);
  validateMuscleOverlap(patch.primaryMuscleGroupIds ?? current.primaryMuscleGroupIds, patch.secondaryMuscleGroupIds ?? current.secondaryMuscleGroupIds);
  return patch;
}

function validateName(value: string): string {
  const name = value.trim();
  if (!name || name.length > 80) throw new Error("动作名称必须为 1 到 80 个字符");
  return name;
}

function validateCategory(value: ExerciseCategory): ExerciseCategory {
  if (!VALID_CATEGORIES.has(value)) throw new Error("动作分类无效");
  return value;
}

function validateType(value: ExerciseType): ExerciseType {
  if (!VALID_TYPES.includes(value)) throw new Error("动作记录类型无效");
  return value;
}

function validateEquipment(value: EquipmentId | null): EquipmentId | null {
  if (value !== null && !VALID_EQUIPMENT.has(value)) throw new Error("动作器械无效");
  return value;
}

function validateDescription(value: string | null): string | null {
  if (value === null) return null;
  const description = value.trim();
  if (!description) return null;
  if (description.length > 500) throw new Error("动作说明不能超过 500 个字符");
  return description;
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

function validateMuscleOverlap(primary: MuscleGroupId[], secondary: MuscleGroupId[]) {
  const primarySet = new Set(primary);
  if (secondary.some((item) => primarySet.has(item))) throw new Error("主目标肌群和次要目标肌群不能重复");
}

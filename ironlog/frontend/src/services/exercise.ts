import { resolveExerciseId } from "@/core/exerciseRedirects";
import type { ContextKind, CountBasis, EquipmentId, ExerciseCategory, ExerciseDoc, LoadBasis, LoadDirection, MuscleGroupId, RateMetric, RecordingMode, WeightUnit } from "@/core/models";
import { recordingConfigEquals, recordingConfigOf, validateRecordingConfig } from "@/core/recordingModes";
import { localRepository } from "@/repositories/localJsonRepository";
import { toExercise } from "@/services/localMappers";
import { CATEGORY_LABELS, EQUIPMENT_LABELS, MUSCLE_GROUP_LABELS, type Exercise } from "@/types";
import { rebuildAllPerformanceRecords } from "@/services/performance";
import { buildExercisePersonalStats } from "@/core/exerciseStats";
import { convertWeight, formatOneDecimal, formatVolume } from "@/core/workoutMetrics";

const VALID_CATEGORIES = new Set<ExerciseCategory>(Object.keys(CATEGORY_LABELS) as ExerciseCategory[]);
const VALID_EQUIPMENT = new Set<EquipmentId>(Object.keys(EQUIPMENT_LABELS) as EquipmentId[]);
const VALID_MUSCLE_GROUPS = new Set<MuscleGroupId>(Object.keys(MUSCLE_GROUP_LABELS) as MuscleGroupId[]);

export interface CreateExerciseInput {
  name: string;
  category: ExerciseCategory;
  recording_mode: RecordingMode;
  load_basis: LoadBasis | null;
  count_basis: CountBasis;
  load_direction: LoadDirection | null;
  rate_metric: RateMetric;
  context_kind: ContextKind;
  equipment: EquipmentId | null;
  description: string | null;
  primary_muscle_group_ids: MuscleGroupId[];
  secondary_muscle_group_ids: MuscleGroupId[];
}

export interface UpdateExerciseInput {
  name?: string;
  category?: ExerciseCategory;
  recording_mode?: RecordingMode;
  load_basis?: LoadBasis | null;
  count_basis?: CountBasis;
  load_direction?: LoadDirection | null;
  rate_metric?: RateMetric;
  context_kind?: ContextKind;
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

export interface ExercisePrimaryStat {
  label: string;
  value: string;
}

export async function getExercisePrimaryStats(): Promise<Record<string, ExercisePrimaryStat>> {
  const [docs, workouts, settings] = await Promise.all([
    localRepository.getSnapshot(), localRepository.listWorkouts(), localRepository.getSettings(),
  ]);
  const result: Record<string, ExercisePrimaryStat> = {};
  for (const exercise of docs.exercises) {
    if (exercise.deletedAt) continue;
    const performance = buildExercisePersonalStats({ exerciseId: exercise.id, exercises: docs.exercises, workouts, weightUnit: settings.weightUnit }).performance;
    const stat = primaryExerciseStat({
      best_load: performance.bestLoad, best_set_volume: performance.bestSetVolume,
      best_reps: performance.bestReps, best_distance_m: performance.bestDistanceM,
      best_duration_sec: performance.bestDurationSec, best_speed_mps: performance.bestSpeedMps,
      best_load_distance_kg_m: performance.bestLoadDistanceKgM,
      best_load_duration_kg_sec: performance.bestLoadDurationKgSec,
      best_load_distance_rate_kg_mps: performance.bestLoadDistanceRateKgMps,
      load_basis: performance.loadBasis, count_basis: performance.countBasis,
      load_direction: performance.loadDirection, display_unit: performance.displayUnit,
    });
    if (stat) result[exercise.id] = stat;
  }
  return result;
}

export function primaryExerciseStat(stats: {
  best_load: number | null; best_set_volume: number | null; best_reps: number | null;
  best_distance_m: number | null; best_duration_sec: number | null; best_speed_mps: number | null;
  best_load_distance_kg_m: number | null; best_load_duration_kg_sec: number | null;
  best_load_distance_rate_kg_mps: number | null; load_basis: LoadBasis | null;
  count_basis: CountBasis | null; load_direction: LoadDirection | null; display_unit: WeightUnit;
}): ExercisePrimaryStat | null {
  const rounded = (value: number) => String(Math.round(value * 10) / 10);
  if (stats.best_load != null) return {
    label: `${stats.load_basis === "per_hand" ? "每手" : ""}${stats.load_direction === "lower_better" ? "最低辅助重量" : "最大重量"}`,
    value: `${rounded(stats.best_load)} ${stats.display_unit}${stats.load_basis === "per_hand" ? "/手" : ""}`,
  };
  if (stats.best_set_volume != null) return { label: "最大单组容量", value: formatVolume(stats.best_set_volume, stats.display_unit) };
  if (stats.best_reps != null) return { label: stats.count_basis === "per_side" ? "每侧最大次数" : "最大次数", value: `${stats.best_reps} 次` };
  if (stats.best_distance_m != null) return { label: stats.count_basis === "per_side" ? "每侧最大距离" : "最大距离", value: `${rounded(stats.best_distance_m)} m` };
  if (stats.best_duration_sec != null) return { label: stats.count_basis === "per_side" ? "每侧最长时间" : "最长时间", value: `${stats.best_duration_sec} 秒` };
  if (stats.best_speed_mps != null) return { label: "最快速度", value: `${rounded(stats.best_speed_mps)} m/s` };
  if (stats.best_load_distance_kg_m != null) return { label: "最大距离负载", value: `${formatOneDecimal(convertWeight(stats.best_load_distance_kg_m, "kg", stats.display_unit))} ${stats.display_unit}·m` };
  if (stats.best_load_duration_kg_sec != null) return { label: "最大持续负载", value: `${formatOneDecimal(convertWeight(stats.best_load_duration_kg_sec, "kg", stats.display_unit))} ${stats.display_unit}·s` };
  if (stats.best_load_distance_rate_kg_mps != null) return { label: "最大单位时间负载", value: `${rounded(convertWeight(stats.best_load_distance_rate_kg_mps, "kg", stats.display_unit))} ${stats.display_unit}·m/s` };
  return null;
}

export async function createExercise(body: CreateExerciseInput): Promise<Exercise> {
  const input = validateCreateExerciseInput(body);
  return toExercise(await localRepository.create(input));
}

export async function updateExercise(id: string, body: UpdateExerciseInput): Promise<Exercise> {
  const current = await localRepository.get(id);
  if (!current) throw new Error("动作不存在");
  const patch = validateUpdateExerciseInput(body, current);
  if (!recordingConfigEquals(recordingConfigOf(current), recordingConfigOf({ ...current, ...patch }))) {
    const hasRecordedSnapshot = (await localRepository.listWorkouts())
      .some((workout) => workout.exercises.some((exercise) => exercise.exerciseId === id));
    if (hasRecordedSnapshot) {
      throw new Error("已有训练记录的动作不能修改记录方式、重量口径、计数口径、成绩方向或竞速指标");
    }
  }
  return toExercise(await localRepository.updateExercise(id, patch));
}

export async function deleteExercise(id: string, replacedByExerciseId: string | null): Promise<void> {
  await localRepository.deleteExercise(id, replacedByExerciseId);
  await rebuildAllPerformanceRecords();
}

export interface ExerciseHistoryRecord {
  date: string;
  recording_mode: RecordingMode;
  load_basis: LoadBasis | null;
  count_basis: CountBasis;
  load_direction: LoadDirection | null;
  rate_metric: RateMetric;
  context_kind: ContextKind;
  set_number: number;
  weight: number | null;
  reps: number | null;
  unit: WeightUnit;
  duration_sec: number | null;
  distance_m: number | null;
  context_value: number | null;
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
      .flatMap((exercise) => {
        const resolved = resolveExerciseId(exercise.exerciseId, exercises);
        const currentId = resolved.status === "resolved" ? resolved.resolvedId : exercise.exerciseId;
        const current = exercises.find((item) => item.id === currentId);
        const contextKind = current?.contextKind === "resistance_level" ? "resistance_level" : exercise.contextKind ?? "none";
        return exercise.sets.map((set) => ({
        date: workout.date,
        recording_mode: exercise.recordingMode,
        load_basis: exercise.loadBasis,
        count_basis: exercise.countBasis,
        load_direction: exercise.loadDirection,
        rate_metric: exercise.rateMetric,
        context_kind: contextKind,
        set_number: set.setNumber,
        weight: set.weight,
        reps: set.reps,
        unit: set.unit,
        duration_sec: set.durationSec,
        distance_m: set.distanceM,
        context_value: set.contextValue ?? null,
        rpe: set.rpe,
        is_warmup: set.isWarmup,
        is_failure: set.isFailure,
        rest_seconds: set.restSeconds,
      }));
      }))
    .sort((a, b) => b.date.localeCompare(a.date) || a.set_number - b.set_number)
    .slice(0, limit);
}

export function validateCreateExerciseInput(body: CreateExerciseInput) {
  if (body.recording_mode === undefined || body.load_basis === undefined || body.count_basis === undefined || body.load_direction === undefined
    || body.rate_metric === undefined || body.context_kind === undefined || body.equipment === undefined || body.description === undefined) {
    throw new Error("创建动作必须明确提交记录方式、重量口径、计数口径、成绩方向、竞速指标、设备信息、器械和动作说明");
  }
  const config = validateRecordingConfig({
    recordingMode: body.recording_mode,
    loadBasis: body.load_basis,
    countBasis: body.count_basis,
    loadDirection: body.load_direction,
    rateMetric: body.rate_metric,
    contextKind: body.context_kind,
  });
  const primary = validateMuscleGroups(body.primary_muscle_group_ids, "主目标肌群", 3);
  const secondary = validateMuscleGroups(body.secondary_muscle_group_ids, "次要目标肌群", 6);
  validateMuscleOverlap(primary, secondary);
  return {
    name: validateName(body.name),
    category: validateCategory(body.category),
    ...config,
    equipment: validateEquipment(body.equipment),
    description: validateDescription(body.description),
    primaryMuscleGroupIds: primary,
    secondaryMuscleGroupIds: secondary,
  };
}

export function validateUpdateExerciseInput(body: UpdateExerciseInput, current: ExerciseDoc) {
  const patch: Partial<Pick<ExerciseDoc, "name" | "category" | "recordingMode" | "loadBasis" | "countBasis" | "loadDirection" | "rateMetric" | "contextKind" | "equipment" | "description" | "primaryMuscleGroupIds" | "secondaryMuscleGroupIds">> = {};
  if (body.name !== undefined) patch.name = validateName(body.name);
  if (body.category !== undefined) patch.category = validateCategory(body.category);
  if (body.recording_mode !== undefined) patch.recordingMode = body.recording_mode;
  if (body.load_basis !== undefined) patch.loadBasis = body.load_basis;
  if (body.count_basis !== undefined) patch.countBasis = body.count_basis;
  if (body.load_direction !== undefined) patch.loadDirection = body.load_direction;
  if (body.rate_metric !== undefined) patch.rateMetric = body.rate_metric;
  if (body.context_kind !== undefined) patch.contextKind = body.context_kind;
  if (body.equipment !== undefined) patch.equipment = validateEquipment(body.equipment);
  if (body.description !== undefined) patch.description = validateDescription(body.description);
  if (body.primary_muscle_group_ids !== undefined) patch.primaryMuscleGroupIds = validateMuscleGroups(body.primary_muscle_group_ids, "主目标肌群", 3);
  if (body.secondary_muscle_group_ids !== undefined) patch.secondaryMuscleGroupIds = validateMuscleGroups(body.secondary_muscle_group_ids, "次要目标肌群", 6);
  validateRecordingConfig(recordingConfigOf({ ...current, ...patch }));
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

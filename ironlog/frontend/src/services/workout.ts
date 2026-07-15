import type {
  LoadBasis,
  LoadDirection,
  RateMetric,
  RecordingMode,
  WorkoutDoc,
  WorkoutSetDoc,
} from "@/core/models";
import {
  RECORDING_LIMITS,
  recordingConfigOf,
  validateRecordingConfig,
  validateWorkoutSetForMode,
  type RecordingConfig,
  type SetValidationPhase,
} from "@/core/recordingModes";
import { calculateWorkoutMetrics, type MetricExercise } from "@/core/workoutMetrics";
import { localRepository } from "@/repositories/localJsonRepository";
import { toWorkout, toWorkoutSummary } from "@/services/localMappers";
import { rebuildAllPerformanceRecords, recordPerformanceForCompletedWorkout } from "@/services/performance";
import type { Workout, WorkoutSummary } from "@/types";

export const WORKOUT_LIMITS = {
  ...RECORDING_LIMITS,
  minRpe: 1,
  maxRpe: 10,
  maxRestSeconds: 86_400,
  minMood: 1,
  maxMood: 5,
} as const;

export interface WorkoutSetPayload {
  id?: string;
  set_number: number;
  weight?: number | null;
  reps?: number | null;
  unit?: string;
  duration_sec?: number | null;
  distance_m?: number | null;
  rpe?: number | null;
  is_warmup?: boolean;
  is_failure?: boolean;
  rest_seconds?: number | null;
}

export interface WorkoutExercisePayload {
  id?: string;
  exercise_id: string;
  /** Immutable snapshot of the exercise interpretation at recording time. */
  recording_mode?: RecordingMode;
  load_basis?: LoadBasis | null;
  load_direction?: LoadDirection | null;
  rate_metric?: RateMetric;
  sort_order: number;
  superset_group?: number | null;
  sets: WorkoutSetPayload[];
}

export interface WorkoutCreatePayload {
  date: string;
  start_time?: string | null;
  end_time?: string | null;
  plan_template_id?: string | null;
  note?: string | null;
  mood?: number | null;
  exercises: WorkoutExercisePayload[];
}

export async function getWorkouts(params?: { month?: string; from?: string; to?: string }): Promise<WorkoutSummary[]> {
  return Promise.all((await localRepository.listWorkouts(params)).map(toWorkoutSummary));
}

export async function getWorkout(id: string): Promise<Workout> {
  const doc = await localRepository.getWorkout(id);
  if (!doc) throw new Error("训练记录不存在");
  return toWorkout(doc);
}

export async function getLatestWorkoutDraft(): Promise<Workout | null> {
  const draft = await localRepository.getLatestWorkoutDraft();
  return draft ? toWorkout(draft) : null;
}

export async function createWorkout(body: WorkoutCreatePayload): Promise<Workout> {
  const doc = await normalizeWorkoutPayload(body);
  const created = await localRepository.createWorkout(doc);
  if (created.endTime != null) await recordPerformanceForCompletedWorkout(created.id);
  return toWorkout(created);
}

export async function updateWorkout(id: string, body: Partial<WorkoutCreatePayload>): Promise<Workout> {
  const existing = await localRepository.getWorkout(id);
  if (!existing) throw new Error("训练记录不存在");
  const merged = mergeWithExisting(existing, body);
  const normalized = await normalizeWorkoutPayload(merged);
  const doc = preserveAggregateFields(existing, normalized);
  const updated = await localRepository.updateWorkout(id, doc);
  if (existing.endTime == null && updated.endTime != null) await recordPerformanceForCompletedWorkout(updated.id);
  else if (existing.endTime != null || updated.endTime != null) await rebuildAllPerformanceRecords();
  return toWorkout(updated);
}

/** Mark an unfinished auto-saved workout as completed at its last recorded activity. */
export async function completeWorkoutDraft(id: string): Promise<Workout> {
  const draft = await localRepository.getWorkout(id);
  if (!draft || draft.endTime !== null) throw new Error("未找到可结束的训练草稿");
  return updateWorkout(id, { end_time: draftCompletionTime(draft) });
}

export function draftCompletionTime(draft: Pick<WorkoutDoc, "createdAt" | "updatedAt">): string {
  return draft.updatedAt || draft.createdAt;
}

export async function deleteWorkout(id: string): Promise<void> {
  const existing = await localRepository.getWorkout(id);
  await localRepository.deleteWorkout(id);
  if (existing?.endTime != null) await rebuildAllPerformanceRecords();
}

export async function copyWorkout(id: string, targetDate: string): Promise<Workout> {
  const source = await localRepository.getWorkout(id);
  if (!source) throw new Error("训练记录不存在");
  const payload = workoutToPayload(source);
  return createWorkout({
    ...payload,
    date: targetDate,
    start_time: null,
    end_time: null,
    exercises: payload.exercises.map((exercise) => ({
      ...exercise,
      id: "",
      sets: exercise.sets.map((set) => ({ ...set, id: "" })),
    })),
  });
}

export interface WorkoutShareData {
  date: string;
  mood: number | null;
  duration_minutes: number | null;
  exercise_count: number;
  total_sets: number;
  total_volume: number;
  total_volume_unit: "kg" | "lb";
  total_distance_m: number;
  total_duration_sec: number;
  total_load_distance_kg_m: number;
  total_load_duration_kg_sec: number;
  exercises: Array<{
    name: string;
    category: string | null;
    recording_mode: RecordingMode;
    load_basis: LoadBasis | null;
    load_direction: LoadDirection | null;
    rate_metric: RateMetric;
    sets: number;
    volume: number;
    distance_m: number;
    duration_sec: number;
    reps: number;
    load_distance_kg_m: number;
    load_duration_kg_sec: number;
  }>;
  note: string | null;
}

export async function shareWorkout(id: string): Promise<WorkoutShareData> {
  const workout = await getWorkout(id);
  const displayUnit = (await localRepository.getSettings()).weightUnit;
  const exercises = workout.exercises.map((exercise) => {
    const metrics = calculateWorkoutMetrics([toMetricExercise(exercise)], displayUnit);
    return {
      name: exercise.exercise_name || `动作#${exercise.exercise_id}`,
      category: exercise.exercise_category || null,
      recording_mode: exercise.recording_mode,
      load_basis: exercise.load_basis,
      load_direction: exercise.load_direction,
      rate_metric: exercise.rate_metric,
      sets: exercise.sets.length,
      volume: metrics.totalVolume,
      distance_m: metrics.totalDistanceM,
      duration_sec: metrics.totalDurationSec,
      reps: metrics.totalReps,
      load_distance_kg_m: metrics.totalLoadDistanceKgM,
      load_duration_kg_sec: metrics.totalLoadDurationKgSec,
    };
  });
  const metrics = calculateWorkoutMetrics(workout.exercises.map(toMetricExercise), displayUnit);
  const duration = workout.start_time && workout.end_time
    ? Math.round((new Date(workout.end_time).getTime() - new Date(workout.start_time).getTime()) / 60_000)
    : null;
  return {
    date: workout.date,
    mood: workout.mood,
    duration_minutes: duration,
    exercise_count: workout.exercises.length,
    total_sets: metrics.totalSets,
    total_volume: metrics.totalVolume,
    total_volume_unit: metrics.totalVolumeUnit,
    total_distance_m: metrics.totalDistanceM,
    total_duration_sec: metrics.totalDurationSec,
    total_load_distance_kg_m: metrics.totalLoadDistanceKgM,
    total_load_duration_kg_sec: metrics.totalLoadDurationKgSec,
    exercises,
    note: workout.note,
  };
}

async function normalizeWorkoutPayload(body: WorkoutCreatePayload): Promise<Omit<WorkoutDoc, "id" | "createdAt" | "updatedAt" | "deletedAt" | "schemaVersion">> {
  validateWorkoutHeader(body);
  const phase: SetValidationPhase = body.end_time == null ? "draft" : "complete";
  const exercises = await Promise.all(body.exercises.map(async (exercise, index) => {
    const linked = await localRepository.get(exercise.exercise_id);
    const config = resolveRecordingSnapshot(exercise, linked ? recordingConfigOf(linked) : null);
    return {
      id: exercise.id || "",
      exerciseId: exercise.exercise_id,
      ...config,
      sortOrder: exercise.sort_order ?? index,
      supersetGroup: exercise.superset_group ?? null,
      sets: exercise.sets.map((set) => normalizeSet(set, config, phase)),
    };
  }));
  return {
    date: body.date,
    startTime: body.start_time ?? null,
    endTime: body.end_time ?? null,
    planTemplateId: body.plan_template_id ?? null,
    note: body.note ?? null,
    mood: body.mood ?? null,
    exercises,
  };
}

function resolveRecordingSnapshot(exercise: WorkoutExercisePayload, linked: RecordingConfig | null): RecordingConfig {
  const values = [exercise.recording_mode, exercise.load_basis, exercise.load_direction, exercise.rate_metric];
  const hasAny = values.some((value) => value !== undefined);
  const hasAll = values.every((value) => value !== undefined);
  if (hasAny && !hasAll) throw new Error("训练动作必须完整提交记录方式快照");
  if (hasAll) {
    return validateRecordingConfig({
      recordingMode: exercise.recording_mode!,
      loadBasis: exercise.load_basis!,
      loadDirection: exercise.load_direction!,
      rateMetric: exercise.rate_metric!,
    });
  }
  if (!linked) throw new Error("动作不存在，且缺少记录方式快照");
  return validateRecordingConfig(linked);
}

function mergeWithExisting(existing: WorkoutDoc, update: Partial<WorkoutCreatePayload>): WorkoutCreatePayload {
  const source = workoutToPayload(existing);
  return {
    date: update.date ?? source.date,
    start_time: update.start_time === undefined ? source.start_time : update.start_time,
    end_time: update.end_time === undefined ? source.end_time : update.end_time,
    plan_template_id: update.plan_template_id === undefined ? source.plan_template_id : update.plan_template_id,
    note: update.note === undefined ? source.note : update.note,
    mood: update.mood === undefined ? source.mood : update.mood,
    exercises: update.exercises === undefined
      ? source.exercises
      : update.exercises.map((exercise) => mergeExercisePayload(source.exercises, exercise)),
  };
}

function mergeExercisePayload(existing: WorkoutExercisePayload[], incoming: WorkoutExercisePayload): WorkoutExercisePayload {
  const current = incoming.id ? existing.find((exercise) => exercise.id === incoming.id) : undefined;
  if (!current) return incoming;
  assertRecordingSnapshotImmutable(current, incoming);
  return {
    ...current,
    ...withoutUndefined(incoming),
    sets: incoming.sets.map((set) => {
      const currentSet = set.id ? current.sets.find((item) => item.id === set.id) : undefined;
      return currentSet ? { ...currentSet, ...withoutUndefined(set) } : set;
    }),
  };
}

function assertRecordingSnapshotImmutable(current: WorkoutExercisePayload, incoming: WorkoutExercisePayload): void {
  const fields: Array<keyof Pick<WorkoutExercisePayload, "recording_mode" | "load_basis" | "load_direction" | "rate_metric">> = [
    "recording_mode", "load_basis", "load_direction", "rate_metric",
  ];
  if (fields.some((field) => incoming[field] !== undefined && incoming[field] !== current[field])) {
    throw new Error("已记录训练的记录方式快照不可修改");
  }
}

function preserveAggregateFields(
  existing: WorkoutDoc,
  normalized: Omit<WorkoutDoc, "id" | "createdAt" | "updatedAt" | "deletedAt" | "schemaVersion">
): typeof normalized {
  return {
    ...normalized,
    exercises: normalized.exercises.map((exercise) => {
      const current = exercise.id ? existing.exercises.find((item) => item.id === exercise.id) : undefined;
      if (!current) return exercise;
      return {
        ...current,
        ...exercise,
        sets: exercise.sets.map((set) => {
          const currentSet = set.id ? current.sets.find((item) => item.id === set.id) : undefined;
          return currentSet ? { ...currentSet, ...set } : set;
        }),
      };
    }),
  };
}

function workoutToPayload(workout: WorkoutDoc): WorkoutCreatePayload {
  return {
    date: workout.date,
    start_time: workout.startTime,
    end_time: workout.endTime,
    plan_template_id: workout.planTemplateId,
    note: workout.note,
    mood: workout.mood,
    exercises: workout.exercises.map((exercise) => ({
      id: exercise.id,
      exercise_id: exercise.exerciseId,
      recording_mode: exercise.recordingMode,
      load_basis: exercise.loadBasis,
      load_direction: exercise.loadDirection,
      rate_metric: exercise.rateMetric,
      sort_order: exercise.sortOrder,
      superset_group: exercise.supersetGroup,
      sets: exercise.sets.map((set) => ({
        id: set.id,
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
      })),
    })),
  };
}

function normalizeSet(set: WorkoutSetPayload, config: RecordingConfig, phase: SetValidationPhase): WorkoutSetDoc {
  validateWorkoutSet(set, config, phase);
  return {
    id: set.id || "",
    setNumber: set.set_number,
    weight: set.weight ?? null,
    reps: set.reps ?? null,
    unit: normalizeUnit(set.unit),
    durationSec: set.duration_sec ?? null,
    distanceM: set.distance_m ?? null,
    rpe: set.rpe ?? null,
    isWarmup: set.is_warmup ?? false,
    isFailure: set.is_failure ?? false,
    restSeconds: set.rest_seconds ?? null,
  };
}

function validateWorkoutHeader(body: WorkoutCreatePayload): void {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(body.date) || Number.isNaN(Date.parse(`${body.date}T00:00:00Z`))) {
    throw new Error("训练日期格式无效");
  }
  validateIsoTime(body.start_time, "开始时间");
  validateIsoTime(body.end_time, "结束时间");
  if (body.start_time && body.end_time && new Date(body.end_time) < new Date(body.start_time)) {
    throw new Error("结束时间不能早于开始时间");
  }
  if (body.mood != null && (!Number.isInteger(body.mood) || body.mood < WORKOUT_LIMITS.minMood || body.mood > WORKOUT_LIMITS.maxMood)) {
    throw new Error("心情评分必须是 1 到 5 的整数");
  }
}

/** Final validation authority shared by pages and every workout write entry. */
export function validateWorkoutSet(
  set: WorkoutSetPayload,
  config: RecordingConfig,
  phase: SetValidationPhase = "complete"
): void {
  if (!Number.isInteger(set.set_number) || set.set_number < 1) throw new Error("组号必须是正整数");
  normalizeUnit(set.unit);
  validateWorkoutSetForMode({
    weight: set.weight,
    reps: set.reps,
    durationSec: set.duration_sec,
    distanceM: set.distance_m,
  }, config, phase);
  validateInteger(set.rpe, "RPE", WORKOUT_LIMITS.minRpe, WORKOUT_LIMITS.maxRpe);
  validateInteger(set.rest_seconds, "休息秒数", 0, WORKOUT_LIMITS.maxRestSeconds);
}

function validateIsoTime(value: string | null | undefined, label: string): void {
  if (value != null && Number.isNaN(Date.parse(value))) throw new Error(`${label}格式无效`);
}

function validateInteger(value: number | null | undefined, label: string, min: number, max: number): void {
  if (value != null && (!Number.isInteger(value) || value < min || value > max)) {
    throw new Error(`${label}必须是 ${min} 到 ${max} 的整数`);
  }
}

function normalizeUnit(value: string | undefined): "kg" | "lb" {
  if (value === undefined || value === "kg") return "kg";
  if (value === "lb") return "lb";
  throw new Error("重量单位无效");
}

function withoutUndefined<T extends object>(value: T): Partial<T> {
  return Object.fromEntries(Object.entries(value).filter(([, item]) => item !== undefined)) as Partial<T>;
}

function toMetricExercise(exercise: {
  recording_mode: RecordingMode;
  load_basis: LoadBasis | null;
  load_direction: LoadDirection | null;
  rate_metric: RateMetric;
  sets: Array<{
    weight: number | null;
    reps: number | null;
    unit: "kg" | "lb";
    duration_sec: number | null;
    distance_m: number | null;
  }>;
}): MetricExercise {
  return {
    recordingMode: exercise.recording_mode,
    loadBasis: exercise.load_basis,
    loadDirection: exercise.load_direction,
    rateMetric: exercise.rate_metric,
    sets: exercise.sets.map((set) => ({
      weight: set.weight,
      reps: set.reps,
      unit: set.unit,
      durationSec: set.duration_sec,
      distanceM: set.distance_m,
    })),
  };
}

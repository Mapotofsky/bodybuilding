import type { ExerciseType, WorkoutDoc, WorkoutExerciseDoc, WorkoutSetDoc } from "@/core/models";
import { calculateWorkoutMetrics } from "@/core/workoutMetrics";
import { localRepository } from "@/repositories/localJsonRepository";
import { toWorkout, toWorkoutSummary } from "@/services/localMappers";
import { rebuildAllPerformanceRecords, recordPerformanceForCompletedWorkout } from "@/services/performance";
import type { Workout, WorkoutSummary } from "@/types";

export const WORKOUT_LIMITS = {
  maxWeight: 2_000,
  maxReps: 10_000,
  maxDurationSeconds: 86_400,
  maxDistanceMeters: 1_000_000,
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
  /** Snapshot of the exercise interpretation at recording time. */
  exercise_type?: ExerciseType;
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
  const doc = await normalizeWorkoutPayload(merged);
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
  return createWorkout({
    ...workoutToPayload(source),
    date: targetDate,
    start_time: null,
    end_time: null,
    exercises: workoutToPayload(source).exercises.map((exercise) => ({
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
  exercises: Array<{ name: string; category: string | null; type: ExerciseType; sets: number; volume: number; distance_m: number; duration_sec: number; reps: number }>;
  note: string | null;
}

export async function shareWorkout(id: string): Promise<WorkoutShareData> {
  const workout = await getWorkout(id);
  const displayUnit = (await localRepository.getSettings()).weightUnit;
  const exercises = workout.exercises.map((exercise) => ({
    name: exercise.exercise_name || `动作#${exercise.exercise_id}`,
    category: exercise.exercise_category || null,
    type: exercise.exercise_type,
    sets: exercise.sets.length,
    volume: exercise.exercise_type === "strength" ? calculateWorkoutMetrics([toMetricExercise(exercise)], displayUnit).totalVolume : 0,
    distance_m: exercise.exercise_type === "cardio" ? sum(exercise.sets.map((set) => set.distance_m || 0)) : 0,
    duration_sec: exercise.exercise_type === "cardio" || exercise.exercise_type === "static_hold" ? sum(exercise.sets.map((set) => set.duration_sec || 0)) : 0,
    reps: exercise.exercise_type === "strength" || exercise.exercise_type === "reps_only" ? sum(exercise.sets.map((set) => set.reps || 0)) : 0,
  }));
  const metrics = calculateWorkoutMetrics(workout.exercises.map(toMetricExercise), displayUnit);
  const duration = workout.start_time && workout.end_time ? Math.round((new Date(workout.end_time).getTime() - new Date(workout.start_time).getTime()) / 60_000) : null;
  return {
    date: workout.date, mood: workout.mood, duration_minutes: duration,
    exercise_count: workout.exercises.length,
    total_sets: metrics.totalSets,
    total_volume: metrics.totalVolume,
    total_volume_unit: metrics.totalVolumeUnit,
    total_distance_m: metrics.totalDistanceM,
    total_duration_sec: metrics.totalDurationSec,
    exercises, note: workout.note,
  };
}

async function normalizeWorkoutPayload(body: WorkoutCreatePayload): Promise<Omit<WorkoutDoc, "id" | "createdAt" | "updatedAt" | "deletedAt" | "schemaVersion">> {
  validateWorkoutHeader(body);
  const exercises = await Promise.all(body.exercises.map(async (exercise, index) => {
    const linked = await localRepository.get(exercise.exercise_id);
    const exerciseType = exercise.exercise_type || linked?.type || inferLegacyType(exercise.sets);
    return {
      id: exercise.id || "",
      exerciseId: exercise.exercise_id,
      exerciseType,
      sortOrder: exercise.sort_order ?? index,
      supersetGroup: exercise.superset_group ?? null,
      sets: exercise.sets.map((set) => normalizeSet(set, exerciseType)),
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

function mergeWithExisting(existing: WorkoutDoc, update: Partial<WorkoutCreatePayload>): WorkoutCreatePayload {
  const source = workoutToPayload(existing);
  return {
    date: update.date ?? source.date,
    start_time: update.start_time === undefined ? source.start_time : update.start_time,
    end_time: update.end_time === undefined ? source.end_time : update.end_time,
    plan_template_id: update.plan_template_id === undefined ? source.plan_template_id : update.plan_template_id,
    note: update.note === undefined ? source.note : update.note,
    mood: update.mood === undefined ? source.mood : update.mood,
    exercises: update.exercises === undefined ? source.exercises : update.exercises,
  };
}

function workoutToPayload(workout: WorkoutDoc): WorkoutCreatePayload {
  return {
    date: workout.date, start_time: workout.startTime, end_time: workout.endTime,
    plan_template_id: workout.planTemplateId, note: workout.note, mood: workout.mood,
    exercises: workout.exercises.map((exercise) => ({
      id: exercise.id, exercise_id: exercise.exerciseId, exercise_type: exercise.exerciseType,
      sort_order: exercise.sortOrder, superset_group: exercise.supersetGroup,
      sets: exercise.sets.map((set) => ({ id: set.id, set_number: set.setNumber, weight: set.weight, reps: set.reps, unit: set.unit, duration_sec: set.durationSec, distance_m: set.distanceM, rpe: set.rpe, is_warmup: set.isWarmup, is_failure: set.isFailure, rest_seconds: set.restSeconds })),
    })),
  };
}

function normalizeSet(set: WorkoutSetPayload, type: ExerciseType): WorkoutSetDoc {
  validateSet(set, type);
  return {
    id: set.id || "", setNumber: set.set_number, weight: set.weight ?? null, reps: set.reps ?? null,
    unit: set.unit === "lb" ? "lb" : "kg", durationSec: set.duration_sec ?? null, distanceM: set.distance_m ?? null,
    rpe: set.rpe ?? null, isWarmup: set.is_warmup ?? false,
    isFailure: set.is_failure ?? false, restSeconds: set.rest_seconds ?? null,
  };
}

function validateWorkoutHeader(body: WorkoutCreatePayload): void {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(body.date) || Number.isNaN(Date.parse(`${body.date}T00:00:00Z`))) throw new Error("训练日期格式无效");
  validateIsoTime(body.start_time, "开始时间");
  validateIsoTime(body.end_time, "结束时间");
  if (body.start_time && body.end_time && new Date(body.end_time) < new Date(body.start_time)) throw new Error("结束时间不能早于开始时间");
  if (body.mood != null && (!Number.isInteger(body.mood) || body.mood < WORKOUT_LIMITS.minMood || body.mood > WORKOUT_LIMITS.maxMood)) throw new Error("心情评分必须是 1 到 5 的整数");
}

function validateSet(set: WorkoutSetPayload, type: ExerciseType): void {
  if (!Number.isInteger(set.set_number) || set.set_number < 1) throw new Error("组号必须是正整数");
  if (type === "strength") { validateFinite(set.weight, "重量", 0, WORKOUT_LIMITS.maxWeight); validateInteger(set.reps, "次数", 1, WORKOUT_LIMITS.maxReps); }
  if (type === "reps_only") validateInteger(set.reps, "次数", 1, WORKOUT_LIMITS.maxReps);
  if (type === "cardio") { validateInteger(set.duration_sec, "时长（秒）", 1, WORKOUT_LIMITS.maxDurationSeconds); validateFinite(set.distance_m, "距离（米）", 0, WORKOUT_LIMITS.maxDistanceMeters); }
  if (type === "static_hold") validateInteger(set.duration_sec, "保持时长（秒）", 1, WORKOUT_LIMITS.maxDurationSeconds);
  validateInteger(set.rpe, "RPE", WORKOUT_LIMITS.minRpe, WORKOUT_LIMITS.maxRpe);
  validateInteger(set.rest_seconds, "休息秒数", 0, WORKOUT_LIMITS.maxRestSeconds);
}

/** Exported for unit tests and for future non-page training entry points. */
export function validateWorkoutSet(set: WorkoutSetPayload, type: ExerciseType): void {
  validateSet(set, type);
}

function validateIsoTime(value: string | null | undefined, label: string): void { if (value != null && Number.isNaN(Date.parse(value))) throw new Error(`${label}格式无效`); }
function validateFinite(value: number | null | undefined, label: string, min: number, max: number): void { if (value != null && (!Number.isFinite(value) || value < min || value > max)) throw new Error(`${label}必须是 ${min} 到 ${max} 的有效数值`); }
function validateInteger(value: number | null | undefined, label: string, min: number, max: number): void { if (value != null && (!Number.isInteger(value) || value < min || value > max)) throw new Error(`${label}必须是 ${min} 到 ${max} 的整数`); }
function inferLegacyType(sets: WorkoutSetPayload[]): ExerciseType { return sets.some((set) => set.duration_sec != null || set.distance_m != null) ? "cardio" : "strength"; }
function sum(values: number[]): number { return values.reduce((total, value) => total + value, 0); }

function toMetricExercise(exercise: { exercise_type: ExerciseType; sets: Array<{ weight: number | null; reps: number | null; unit: "kg" | "lb"; duration_sec: number | null; distance_m: number | null }> }) {
  return {
    exerciseType: exercise.exercise_type,
    sets: exercise.sets.map((set) => ({
      weight: set.weight,
      reps: set.reps,
      unit: set.unit,
      durationSec: set.duration_sec,
      distanceM: set.distance_m,
    })),
  };
}

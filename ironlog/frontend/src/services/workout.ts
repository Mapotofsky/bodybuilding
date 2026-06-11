import { localRepository } from "@/repositories/localJsonRepository";
import { toWorkout, toWorkoutSummary } from "@/services/localMappers";
import type { Workout, WorkoutSummary } from "@/types";

export async function getWorkouts(params?: {
  month?: string;
  from?: string;
  to?: string;
}): Promise<WorkoutSummary[]> {
  const docs = await localRepository.listWorkouts(params);
  return Promise.all(docs.map(toWorkoutSummary));
}

export async function getWorkout(id: string): Promise<Workout> {
  const doc = await localRepository.getWorkout(id);
  if (!doc) throw new Error("Workout not found");
  return toWorkout(doc);
}

export interface WorkoutSetPayload {
  set_number: number;
  weight?: number | null;
  reps?: number | null;
  unit?: string;
  duration_sec?: number | null;
  distance_m?: number | null;
  rpe?: number | null;
  is_warmup?: boolean;
  is_dropset?: boolean;
  is_failure?: boolean;
  rest_seconds?: number | null;
}

export interface WorkoutExercisePayload {
  exercise_id: string;
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

export async function createWorkout(body: WorkoutCreatePayload): Promise<Workout> {
  const doc = await localRepository.createWorkout({
    date: body.date,
    startTime: body.start_time || null,
    endTime: body.end_time || null,
    planTemplateId: body.plan_template_id || null,
    note: body.note || null,
    mood: body.mood ?? null,
    exercises: body.exercises.map((exercise) => ({
      id: "",
      exerciseId: exercise.exercise_id,
      sortOrder: exercise.sort_order,
      supersetGroup: exercise.superset_group ?? null,
      sets: exercise.sets.map((set) => ({
        id: "",
        setNumber: set.set_number,
        weight: set.weight ?? null,
        reps: set.reps ?? null,
        unit: set.unit === "lb" ? "lb" : "kg",
        durationSec: set.duration_sec ?? null,
        distanceM: set.distance_m ?? null,
        rpe: set.rpe ?? null,
        isWarmup: set.is_warmup ?? false,
        isDropset: set.is_dropset ?? false,
        isFailure: set.is_failure ?? false,
        restSeconds: set.rest_seconds ?? null,
      })),
    })),
  });
  return toWorkout(doc);
}

export async function updateWorkout(
  id: string,
  body: Partial<WorkoutCreatePayload>
): Promise<Workout> {
  const doc = await localRepository.updateWorkout(id, {
    date: body.date,
    startTime: body.start_time,
    endTime: body.end_time,
    planTemplateId: body.plan_template_id,
    note: body.note,
    mood: body.mood,
    exercises: body.exercises?.map((exercise) => ({
      id: "",
      exerciseId: exercise.exercise_id,
      sortOrder: exercise.sort_order,
      supersetGroup: exercise.superset_group ?? null,
      sets: exercise.sets.map((set) => ({
        id: "",
        setNumber: set.set_number,
        weight: set.weight ?? null,
        reps: set.reps ?? null,
        unit: set.unit === "lb" ? "lb" : "kg",
        durationSec: set.duration_sec ?? null,
        distanceM: set.distance_m ?? null,
        rpe: set.rpe ?? null,
        isWarmup: set.is_warmup ?? false,
        isDropset: set.is_dropset ?? false,
        isFailure: set.is_failure ?? false,
        restSeconds: set.rest_seconds ?? null,
      })),
    })),
  });
  return toWorkout(doc);
}

export async function deleteWorkout(id: string): Promise<void> {
  await localRepository.deleteWorkout(id);
}

export async function copyWorkout(
  id: string,
  targetDate: string
): Promise<Workout> {
  const source = await localRepository.getWorkout(id);
  if (!source) throw new Error("Workout not found");
  const doc = await localRepository.createWorkout({
    date: targetDate,
    startTime: null,
    endTime: null,
    planTemplateId: source.planTemplateId,
    note: source.note,
    mood: source.mood,
    exercises: source.exercises.map((exercise) => ({
      ...exercise,
      id: "",
      sets: exercise.sets.map((set) => ({ ...set, id: "" })),
    })),
  });
  return toWorkout(doc);
}

export interface WorkoutShareData {
  date: string;
  mood: number | null;
  duration_minutes: number | null;
  exercise_count: number;
  total_sets: number;
  total_volume: number;
  exercises: Array<{
    name: string;
    category: string | null;
    sets: number;
    volume: number;
  }>;
  note: string | null;
}

export async function shareWorkout(id: string): Promise<WorkoutShareData> {
  const workout = await getWorkout(id);
  const totalSets = workout.exercises.reduce((sum, exercise) => sum + exercise.sets.length, 0);
  const totalVolume = workout.exercises.reduce(
    (sum, exercise) => sum + exercise.sets.reduce((s, set) => s + (set.weight || 0) * (set.reps || 0), 0),
    0
  );
  const duration =
    workout.start_time && workout.end_time
      ? Math.round((new Date(workout.end_time).getTime() - new Date(workout.start_time).getTime()) / 60000)
      : null;
  return {
    date: workout.date,
    mood: workout.mood,
    duration_minutes: duration,
    exercise_count: workout.exercises.length,
    total_sets: totalSets,
    total_volume: totalVolume,
    exercises: workout.exercises.map((exercise) => ({
      name: exercise.exercise_name || `动作#${exercise.exercise_id}`,
      category: exercise.exercise_category || null,
      sets: exercise.sets.length,
      volume: exercise.sets.reduce((sum, set) => sum + (set.weight || 0) * (set.reps || 0), 0),
    })),
    note: workout.note,
  };
}

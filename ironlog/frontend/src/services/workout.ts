import api from "./api";
import type { Workout, WorkoutSummary } from "@/types";

export async function getWorkouts(params?: {
  month?: string;
  from?: string;
  to?: string;
}): Promise<WorkoutSummary[]> {
  const { data } = await api.get("/workouts", { params });
  return data;
}

export async function getWorkout(id: number): Promise<Workout> {
  const { data } = await api.get(`/workouts/${id}`);
  return data;
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
  exercise_id: number;
  sort_order: number;
  superset_group?: number | null;
  sets: WorkoutSetPayload[];
}

export interface WorkoutCreatePayload {
  date: string;
  start_time?: string;
  end_time?: string;
  plan_template_id?: number | null;
  note?: string;
  mood?: number;
  exercises: WorkoutExercisePayload[];
}

export async function createWorkout(body: WorkoutCreatePayload): Promise<Workout> {
  const { data } = await api.post("/workouts", body);
  return data;
}

export async function updateWorkout(
  id: number,
  body: Record<string, unknown>
): Promise<Workout> {
  const { data } = await api.put(`/workouts/${id}`, body);
  return data;
}

export async function deleteWorkout(id: number): Promise<void> {
  await api.delete(`/workouts/${id}`);
}

export async function copyWorkout(
  id: number,
  targetDate: string
): Promise<Workout> {
  const { data } = await api.post(`/workouts/${id}/copy`, {
    target_date: targetDate,
  });
  return data;
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

export async function shareWorkout(id: number): Promise<WorkoutShareData> {
  const { data } = await api.post(`/workouts/${id}/share`);
  return data;
}

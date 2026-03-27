import api from "./api";
import type { Exercise } from "@/types";

export async function getExercises(params?: {
  category?: string;
  q?: string;
}): Promise<Exercise[]> {
  const { data } = await api.get("/exercises", { params });
  return data;
}

export async function createExercise(body: {
  name: string;
  category: string;
  type?: string;
  description?: string;
}): Promise<Exercise> {
  const { data } = await api.post("/exercises", body);
  return data;
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
  exerciseId: number,
  limit = 30
): Promise<ExerciseHistoryRecord[]> {
  const { data } = await api.get(`/exercises/${exerciseId}/history`, {
    params: { limit },
  });
  return data;
}

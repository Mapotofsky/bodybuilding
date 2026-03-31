import api from "./api";
import type {
  CalendarDay,
  ExerciseDetail,
  PlanSummary,
  PlanTemplate,
  TrainingPlan,
} from "@/types";

export interface TemplateExerciseCreate {
  exercise_id: number;
  sort_order: number;
  note?: string | null;
}

export interface TemplateCreate {
  name: string;
  sort_order?: number;
  color?: string | null;
  schedule_rule?: Record<string, unknown> | null;
  exercises?: TemplateExerciseCreate[];
}

export interface PlanCreate {
  name: string;
  description?: string | null;
  color?: string;
  mode: string;
  cycle_length?: number | null;
  templates?: TemplateCreate[];
}

export async function getPlans(): Promise<PlanSummary[]> {
  const { data } = await api.get("/plans");
  return data;
}

export async function getPlan(id: number): Promise<TrainingPlan> {
  const { data } = await api.get(`/plans/${id}`);
  return data;
}

export async function createPlan(body: PlanCreate): Promise<TrainingPlan> {
  const { data } = await api.post("/plans", body);
  return data;
}

export async function updatePlan(
  id: number,
  body: Partial<PlanCreate> & { is_active?: boolean }
): Promise<TrainingPlan> {
  const { data } = await api.put(`/plans/${id}`, body);
  return data;
}

export async function deletePlan(id: number): Promise<void> {
  await api.delete(`/plans/${id}`);
}

export async function addTemplate(
  planId: number,
  body: TemplateCreate
): Promise<PlanTemplate> {
  const { data } = await api.post(`/plans/${planId}/templates`, body);
  return data;
}

export async function updateTemplate(
  planId: number,
  templateId: number,
  body: Partial<TemplateCreate>
): Promise<PlanTemplate> {
  const { data } = await api.put(`/plans/${planId}/templates/${templateId}`, body);
  return data;
}

export async function deleteTemplate(
  planId: number,
  templateId: number
): Promise<void> {
  await api.delete(`/plans/${planId}/templates/${templateId}`);
}

export async function getCalendar(from: string, to: string): Promise<CalendarDay[]> {
  const { data } = await api.get("/plans/calendar", {
    params: { from, to },
  });
  return data;
}

export async function getTemplate(templateId: number): Promise<PlanTemplate> {
  const { data } = await api.get(`/plans/templates/${templateId}`);
  return data;
}

export async function scheduleTemplate(
  templateId: number,
  date: string
): Promise<void> {
  await api.post(`/plans/templates/${templateId}/schedule`, { date });
}

export async function getExerciseDetail(id: number): Promise<ExerciseDetail> {
  const { data } = await api.get(`/exercises/${id}`);
  return data;
}

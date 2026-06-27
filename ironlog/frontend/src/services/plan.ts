import { addDays, format, isAfter, parseISO } from "date-fns";
import { localRepository } from "@/repositories/localJsonRepository";
import { toExerciseDetail, toPlan, toPlanSummary, toTemplate } from "@/services/localMappers";
import type {
  CalendarDay,
  CalendarEntry,
  ExerciseDetail,
  PlanSummary,
  PlanTemplate,
  TrainingPlan,
} from "@/types";

export interface TemplateExerciseCreate {
  id?: string;
  exercise_id: string;
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

export function validateTemplateScheduleRule(
  plan: { mode: string; cycleLength: number | null },
  scheduleRule: Record<string, unknown> | null | undefined
): Record<string, unknown> | null | undefined {
  if (plan.mode !== "cyclic" || scheduleRule == null) return scheduleRule;

  const cycleDay = scheduleRule.day_in_cycle;
  const maxCycleDay = plan.cycleLength ?? 14;
  if (
    typeof cycleDay !== "number" ||
    !Number.isInteger(cycleDay) ||
    cycleDay < 1 ||
    cycleDay > maxCycleDay
  ) {
    throw new Error(`周期天数必须是 1 到 ${maxCycleDay} 的整数`);
  }

  return scheduleRule;
}

export async function getPlans(): Promise<PlanSummary[]> {
  const plans = await localRepository.listPlans();
  return Promise.all(plans.map(toPlanSummary));
}

export async function getPlan(id: string): Promise<TrainingPlan> {
  const plan = await localRepository.getPlan(id);
  if (!plan) throw new Error("Plan not found");
  return toPlan(plan);
}

export async function createPlan(body: PlanCreate): Promise<TrainingPlan> {
  const plan = await localRepository.createPlan({
    name: body.name,
    description: body.description || null,
    color: body.color || "#10B981",
    mode: body.mode === "cyclic" || body.mode === "flexible" ? body.mode : "weekly",
    cycleLength: body.cycle_length ?? null,
    isActive: true,
  });
  for (const [idx, template] of (body.templates || []).entries()) {
    await localRepository.createTemplate({
      planId: plan.id,
      name: template.name,
      sortOrder: template.sort_order ?? idx,
      color: template.color || null,
      scheduleRule: validateTemplateScheduleRule(plan, template.schedule_rule) || null,
      exercises: (template.exercises || []).map((exercise, exerciseIdx) => ({
        id: exercise.id || "",
        exerciseId: exercise.exercise_id,
        sortOrder: exercise.sort_order ?? exerciseIdx,
        note: exercise.note || null,
      })),
    });
  }
  return getPlan(plan.id);
}

export async function updatePlan(
  id: string,
  body: Partial<PlanCreate> & { is_active?: boolean }
): Promise<TrainingPlan> {
  await localRepository.updatePlan(id, {
    name: body.name,
    description: body.description,
    color: body.color,
    mode: body.mode === "cyclic" || body.mode === "flexible" || body.mode === "weekly" ? body.mode : undefined,
    cycleLength: body.cycle_length,
    isActive: body.is_active,
  });
  return getPlan(id);
}

export async function deletePlan(id: string): Promise<void> {
  await localRepository.deletePlan(id);
}

export async function addTemplate(
  planId: string,
  body: TemplateCreate
): Promise<PlanTemplate> {
  const plan = await localRepository.getPlan(planId);
  if (!plan) throw new Error("Plan not found");

  const template = await localRepository.createTemplate({
    planId,
    name: body.name,
    sortOrder: body.sort_order ?? 0,
    color: body.color || null,
    scheduleRule: validateTemplateScheduleRule(plan, body.schedule_rule) || null,
    exercises: (body.exercises || []).map((exercise, idx) => ({
      id: exercise.id || "",
      exerciseId: exercise.exercise_id,
      sortOrder: exercise.sort_order ?? idx,
      note: exercise.note || null,
    })),
  });
  return toTemplate(template);
}

export async function updateTemplate(
  planId: string,
  templateId: string,
  body: Partial<TemplateCreate>
): Promise<PlanTemplate> {
  const plan = await localRepository.getPlan(planId);
  if (!plan) throw new Error("Plan not found");

  const template = await localRepository.updateTemplate(templateId, {
    planId,
    name: body.name,
    sortOrder: body.sort_order,
    color: body.color,
    scheduleRule: validateTemplateScheduleRule(plan, body.schedule_rule),
    exercises: body.exercises?.map((exercise, idx) => ({
      id: exercise.id || "",
      exerciseId: exercise.exercise_id,
      sortOrder: exercise.sort_order ?? idx,
      note: exercise.note || null,
    })),
  });
  return toTemplate(template);
}

export async function appendExerciseToTemplate(
  templateId: string,
  exerciseId: string
): Promise<PlanTemplate> {
  const template = await localRepository.getTemplate(templateId);
  if (!template) throw new Error("Template not found");
  if (template.exercises.some((exercise) => exercise.exerciseId === exerciseId)) {
    return toTemplate(template);
  }
  const next = await localRepository.updateTemplate(templateId, {
    exercises: [
      ...template.exercises,
      {
        id: "",
        exerciseId,
        sortOrder: template.exercises.length,
        note: null,
      },
    ],
  });
  return toTemplate(next);
}

export async function deleteTemplate(
  _planId: string,
  templateId: string
): Promise<void> {
  await localRepository.deleteTemplate(templateId);
}

export async function getCalendar(from: string, to: string): Promise<CalendarDay[]> {
  const [plans, templates, workouts] = await Promise.all([
    localRepository.listPlans(),
    localRepository.listTemplates(),
    localRepository.listWorkouts({ from, to }),
  ]);
  const activePlans = plans.filter((plan) => plan.isActive && !plan.deletedAt);
  const calendar: Record<string, CalendarEntry[]> = {};

  const templateMap = new Map(templates.map((template) => [template.id, template]));
  const planMap = new Map(activePlans.map((plan) => [plan.id, plan]));
  const completedByTemplateDate = new Map<string, string>();
  for (const workout of workouts) {
    if (workout.planTemplateId) completedByTemplateDate.set(`${workout.planTemplateId}:${workout.date}`, workout.id);
  }

  for (const plan of activePlans) {
    const planTemplates = templates.filter((template) => template.planId === plan.id && !template.deletedAt);
    const generated = generateEntries(plan, planTemplates, from, to);
    for (const entry of generated) {
      const template = templateMap.get(entry.templateId);
      if (!template) continue;
      const workoutId = completedByTemplateDate.get(`${template.id}:${entry.date}`) || null;
      pushEntry(calendar, entry.date, makeCalendarEntry(plan, template, entry.date, workoutId, "virtual"));
    }
  }

  for (const workout of workouts) {
    if (!workout.planTemplateId) continue;
    const template = templateMap.get(workout.planTemplateId);
    const plan = template ? planMap.get(template.planId) : null;
    if (!template || !plan) continue;
    const existing = calendar[workout.date] || [];
    if (!existing.some((entry) => entry.template_id === template.id && entry.workout_id === workout.id)) {
      pushEntry(calendar, workout.date, makeCalendarEntry(plan, template, workout.date, workout.id, "virtual"));
    }
  }

  const days: CalendarDay[] = [];
  let current = parseISO(from);
  const end = parseISO(to);
  while (!isAfter(current, end)) {
    const date = format(current, "yyyy-MM-dd");
    days.push({ date, entries: calendar[date] || [] });
    current = addDays(current, 1);
  }
  return days;
}

export async function getTemplate(templateId: string): Promise<PlanTemplate> {
  const template = await localRepository.getTemplate(templateId);
  if (!template) throw new Error("Template not found");
  return toTemplate(template);
}

export async function getExerciseDetail(id: string): Promise<ExerciseDetail> {
  const exercise = await localRepository.get(id);
  if (!exercise) throw new Error("Exercise not found");
  return toExerciseDetail(exercise);
}

function generateEntries(
  plan: { id: string; mode: string; createdAt: string; cycleLength: number | null },
  templates: Array<{ id: string; sortOrder: number; scheduleRule: Record<string, unknown> | null }>,
  from: string,
  to: string
): Array<{ templateId: string; date: string }> {
  if (plan.mode === "weekly") return weeklyEntries(templates, from, to, plan.createdAt.slice(0, 10));
  if (plan.mode === "cyclic") return cyclicEntries(plan, templates, from, to);
  return [];
}

function weeklyEntries(
  templates: Array<{ id: string; scheduleRule: Record<string, unknown> | null }>,
  from: string,
  to: string,
  planStart: string
) {
  const result: Array<{ templateId: string; date: string }> = [];
  let current = parseISO(from > planStart ? from : planStart);
  const end = parseISO(to);
  while (!isAfter(current, end)) {
    const date = format(current, "yyyy-MM-dd");
    const weekday = current.getDay() === 0 ? 7 : current.getDay();
    for (const template of templates) {
      const days = (template.scheduleRule?.day_of_week as number[] | undefined) || [];
      if (days.includes(weekday)) result.push({ templateId: template.id, date });
    }
    current = addDays(current, 1);
  }
  return result;
}

async function latestCompletedTemplate(planId: string, templateIds: Set<string>) {
  const workouts = await localRepository.listWorkouts();
  return workouts
    .filter((workout) => workout.planTemplateId && templateIds.has(workout.planTemplateId))
    .sort((a, b) => b.date.localeCompare(a.date))[0] || null;
}

function cyclicEntries(
  plan: { id: string; createdAt: string; cycleLength: number | null },
  templates: Array<{ id: string; sortOrder: number; scheduleRule: Record<string, unknown> | null }>,
  from: string,
  to: string
) {
  const sorted = templates.slice().sort((a, b) => a.sortOrder - b.sortOrder);
  if (sorted.length === 0) return [];
  const today = format(new Date(), "yyyy-MM-dd");
  const start = from > plan.createdAt.slice(0, 10) ? from : plan.createdAt.slice(0, 10);
  const cycleLength = plan.cycleLength || sorted.length;
  const result: Array<{ templateId: string; date: string }> = [];
  const firstDate = start > today ? start : today;
  let current = parseISO(firstDate);
  let idx = 0;

  // Boundary walk-through:
  // normal path starts at plan creation/today; completed today is injected by workout scan;
  // in-range/out-of-range completion is preserved by workout injection; no history starts at first template.
  while (!isAfter(current, parseISO(to))) {
    const template = sorted[idx];
    if (format(current, "yyyy-MM-dd") >= from) result.push({ templateId: template.id, date: format(current, "yyyy-MM-dd") });
    const nextIdx = (idx + 1) % sorted.length;
    current = addDays(current, cyclicGap(dayInCycle(template, idx + 1), dayInCycle(sorted[nextIdx], nextIdx + 1), cycleLength));
    idx = nextIdx;
  }
  return result;
}

function dayInCycle(template: { scheduleRule: Record<string, unknown> | null }, fallback: number): number {
  const value = template.scheduleRule?.day_in_cycle;
  return typeof value === "number" ? value : fallback;
}

function cyclicGap(from: number, to: number, cycleLength: number): number {
  return to > from ? to - from : cycleLength - from + to;
}

function pushEntry(target: Record<string, CalendarEntry[]>, date: string, entry: CalendarEntry): void {
  if (!target[date]) target[date] = [];
  target[date].push(entry);
}

function makeCalendarEntry(
  plan: { id: string; name: string; color: string; mode: string },
  template: { id: string; name: string; color: string | null; exercises: Array<{ exerciseId: string }> },
  date: string,
  workoutId: string | null,
  id: string
): CalendarEntry {
  return {
    id,
    plan_id: plan.id,
    plan_name: plan.name,
    plan_color: plan.color,
    plan_mode: plan.mode,
    template_id: template.id,
    template_name: template.name,
    template_color: template.color,
    template_exercise_ids: template.exercises.map((exercise) => exercise.exerciseId),
    scheduled_date: date,
    is_completed: workoutId != null,
    workout_id: workoutId,
  };
}

import type {
  ExerciseDoc,
  ProfileDoc,
  SettingsDoc,
  TemplateDoc,
  TrainingPlanDoc,
  WorkoutDoc,
} from "./models";

export interface ExerciseRepository {
  list(params?: { category?: string; q?: string; includeDeleted?: boolean }): Promise<ExerciseDoc[]>;
  get(id: string): Promise<ExerciseDoc | null>;
  create(body: Pick<ExerciseDoc, "name" | "category" | "type" | "description"> & { metValue?: number | null }): Promise<ExerciseDoc>;
}

export interface PlanRepository {
  listPlans(includeDeleted?: boolean): Promise<TrainingPlanDoc[]>;
  getPlan(id: string): Promise<TrainingPlanDoc | null>;
  createPlan(body: Omit<TrainingPlanDoc, "id" | "createdAt" | "updatedAt" | "deletedAt" | "schemaVersion">): Promise<TrainingPlanDoc>;
  updatePlan(id: string, body: Partial<Omit<TrainingPlanDoc, "id" | "createdAt" | "updatedAt" | "deletedAt" | "schemaVersion">>): Promise<TrainingPlanDoc>;
  deletePlan(id: string): Promise<void>;
  listTemplates(planId?: string, includeDeleted?: boolean): Promise<TemplateDoc[]>;
  getTemplate(id: string): Promise<TemplateDoc | null>;
  createTemplate(body: Omit<TemplateDoc, "id" | "createdAt" | "updatedAt" | "deletedAt" | "schemaVersion">): Promise<TemplateDoc>;
  updateTemplate(id: string, body: Partial<Omit<TemplateDoc, "id" | "createdAt" | "updatedAt" | "deletedAt" | "schemaVersion">>): Promise<TemplateDoc>;
  deleteTemplate(id: string): Promise<void>;
}

export interface WorkoutRepository {
  list(params?: { month?: string; from?: string; to?: string; includeDeleted?: boolean }): Promise<WorkoutDoc[]>;
  get(id: string): Promise<WorkoutDoc | null>;
  create(body: Omit<WorkoutDoc, "id" | "createdAt" | "updatedAt" | "deletedAt" | "schemaVersion">): Promise<WorkoutDoc>;
  update(id: string, body: Partial<Omit<WorkoutDoc, "id" | "createdAt" | "updatedAt" | "deletedAt" | "schemaVersion">>): Promise<WorkoutDoc>;
  delete(id: string): Promise<void>;
}

export interface ProfileRepository {
  get(): Promise<ProfileDoc>;
  update(body: Partial<Omit<ProfileDoc, "id" | "createdAt" | "updatedAt" | "deletedAt" | "schemaVersion">>): Promise<ProfileDoc>;
}

export interface SettingsRepository {
  get(): Promise<SettingsDoc>;
  update(body: Partial<Omit<SettingsDoc, "id" | "createdAt" | "updatedAt" | "deletedAt" | "schemaVersion">>): Promise<SettingsDoc>;
}

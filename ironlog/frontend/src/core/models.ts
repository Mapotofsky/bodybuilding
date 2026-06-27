export const CURRENT_SCHEMA_VERSION = 1;

export type DocId = string;
export type ISODate = string;
export type ISODateTime = string;
export type WeightUnit = "kg" | "lb";
export type PlanMode = "weekly" | "cyclic" | "flexible";
export type ExerciseType = "strength" | "cardio" | "reps_only" | "static_hold";
export type MuscleGroupId =
  | "chest" | "back" | "shoulders" | "biceps" | "triceps" | "forearms"
  | "core" | "glutes" | "quadriceps" | "hamstrings" | "calves"
  | "adductors" | "abductors" | "full_body" | "other";

export interface BaseDoc {
  id: DocId;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
  deletedAt: ISODateTime | null;
  schemaVersion: number;
}

export interface ProfileDoc extends BaseDoc {
  nickname: string | null;
  avatarUrl: string | null;
  gender: string | null;
  height: number | null;
  weight: number | null;
  birthDate: ISODate | null;
}

export interface SettingsDoc extends BaseDoc {
  weightUnit: WeightUnit;
  webdav: WebDavSettings;
  lastSyncAt: ISODateTime | null;
}

export interface WebDavSettings {
  url: string;
  username: string;
  passwordRef: string | null;
}

export interface ExerciseDoc extends BaseDoc {
  name: string;
  category: string;
  type: ExerciseType;
  description: string | null;
  primaryMuscleGroupIds: MuscleGroupId[];
  secondaryMuscleGroupIds: MuscleGroupId[];
  metValue: number | null;
  isCustom: boolean;
  /** Directed replacement used to resolve historical references after a custom exercise is deleted. */
  replacedByExerciseId: DocId | null;
}

export interface TemplateExerciseDoc {
  id: DocId;
  exerciseId: DocId;
  sortOrder: number;
  note: string | null;
}

export interface TemplateDoc extends BaseDoc {
  planId: DocId;
  name: string;
  sortOrder: number;
  color: string | null;
  scheduleRule: Record<string, unknown> | null;
  exercises: TemplateExerciseDoc[];
}

export interface TrainingPlanDoc extends BaseDoc {
  name: string;
  description: string | null;
  color: string;
  mode: PlanMode;
  cycleLength: number | null;
  isActive: boolean;
}

export interface WorkoutSetDoc {
  id: DocId;
  setNumber: number;
  weight: number | null;
  reps: number | null;
  unit: WeightUnit;
  durationSec: number | null;
  distanceM: number | null;
  rpe: number | null;
  isWarmup: boolean;
  isFailure: boolean;
  restSeconds: number | null;
}

export interface WorkoutExerciseDoc {
  id: DocId;
  exerciseId: DocId;
  /** Immutable interpretation of the exercise at the time this workout was recorded. */
  exerciseType: ExerciseType;
  sortOrder: number;
  supersetGroup: number | null;
  sets: WorkoutSetDoc[];
}

export interface WorkoutDoc extends BaseDoc {
  date: ISODate;
  startTime: ISODateTime | null;
  endTime: ISODateTime | null;
  planTemplateId: DocId | null;
  note: string | null;
  mood: number | null;
  exercises: WorkoutExerciseDoc[];
}

export interface ManifestShard {
  path: string;
  updatedAt: ISODateTime;
  etag?: string | null;
}

export interface IronLogManifest {
  app: "ironlog";
  schemaVersion: number;
  deviceId: string;
  updatedAt: ISODateTime;
  shards: ManifestShard[];
}

export interface DataSnapshot {
  manifest: IronLogManifest;
  profile: ProfileDoc;
  settings: SettingsDoc;
  exercises: ExerciseDoc[];
  plans: TrainingPlanDoc[];
  templates: TemplateDoc[];
  workouts: WorkoutDoc[];
}

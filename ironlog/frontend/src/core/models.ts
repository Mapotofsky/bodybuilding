export const CURRENT_SCHEMA_VERSION = 3;

export type DocId = string;
export type ISODate = string;
export type ISODateTime = string;
export type WeightUnit = "kg" | "lb";
export const DEFAULT_THEME_ID = "emerald-slate";
export type PlanMode = "weekly" | "cyclic" | "flexible";
export type ExerciseType = "strength" | "cardio" | "reps_only" | "static_hold";
export type ExerciseCategory =
  | "chest" | "back" | "legs" | "shoulders" | "arms"
  | "core" | "cardio" | "stretch" | "other";
export type EquipmentId =
  | "body_weight" | "barbell" | "dumbbell" | "cable" | "machine"
  | "band" | "kettlebell" | "ab_wheel" | "stationary_bike"
  | "jump_rope" | "elliptical" | "stepmill" | "external_weight" | "other";
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
  birthDate: ISODate | null;
}

export interface SettingsDoc extends BaseDoc {
  weightUnit: WeightUnit;
  themeId: string;
  lastSyncAt: ISODateTime | null;
}

export interface SyncEndpointConfig {
  url: string;
  username: string;
  passwordRef: string | null;
}

export interface ExerciseDoc extends BaseDoc {
  name: string;
  category: ExerciseCategory;
  type: ExerciseType;
  equipment: EquipmentId | null;
  description: string | null;
  primaryMuscleGroupIds: MuscleGroupId[];
  secondaryMuscleGroupIds: MuscleGroupId[];
  isCustom: boolean;
  /** Directed replacement used to resolve historical references after a custom exercise is deleted. */
  replacedByExerciseId: DocId | null;
  provenance?: ExerciseProvenance;
}

export interface ExerciseProvenance {
  source: string;
  sourceId: string;
  sourceRevision: string;
}

export interface DefaultExerciseSeed {
  id: string;
  name: string;
  category: ExerciseCategory;
  type: ExerciseType;
  equipment: EquipmentId | null;
  description: string | null;
  primaryMuscleGroupIds: MuscleGroupId[];
  secondaryMuscleGroupIds: MuscleGroupId[];
  provenance: ExerciseProvenance;
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

export type BodyMeasurementKey =
  | "neck" | "shoulder" | "chest" | "waist" | "hip"
  | "upperArmLeft" | "upperArmRight"
  | "forearmLeft" | "forearmRight"
  | "thighLeft" | "thighRight"
  | "calfLeft" | "calfRight";

export type BodyMeasurementsCm = Record<BodyMeasurementKey, number | null>;

export interface BodyMetricDoc extends BaseDoc {
  recordedAt: ISODateTime;
  heightCm: number | null;
  weightKg: number | null;
  bodyFatPercent: number | null;
  measurementsCm: BodyMeasurementsCm;
  note: string | null;
}

export type TimelineNoteRangeType = "single_day" | "date_range" | "open_ended";

export interface TimelineNoteDoc extends BaseDoc {
  content: string;
  rangeType: TimelineNoteRangeType;
  startDate: ISODate;
  endDate: ISODate | null;
  workoutId: DocId | null;
}

export type PerformanceRecordKind = "true_pr" | "rpe_adjusted_rm";

export type PerformanceMetricType =
  | "strength.max_weight"
  | "strength.max_reps"
  | "strength.max_set_volume"
  | "strength.max_workout_volume"
  | "strength.rpe_adjusted_rm_mean"
  | "cardio.max_distance"
  | "cardio.max_duration"
  | "cardio.best_average_speed"
  | "reps_only.max_set_reps"
  | "reps_only.max_workout_reps"
  | "static_hold.max_set_duration"
  | "static_hold.max_workout_duration";

export type PerformanceUnit = "kg" | "kg_reps" | "m" | "sec" | "m_per_sec" | "reps";

export interface RmFormulaResults {
  epleyKg: number;
  brzyckiKg: number;
  lombardiKg: number;
  wathenKg: number;
  meanKg: number;
  standardDeviationKg: number;
  minKg: number;
  maxKg: number;
}

export interface PerformanceInputSummary {
  weightKg: number | null;
  reps: number | null;
  rpe: number | null;
  effectiveReps: number | null;
  distanceM: number | null;
  durationSec: number | null;
  workoutVolumeKgReps: number | null;
}

export interface ExercisePerformanceRecordDoc extends BaseDoc {
  exerciseId: DocId;
  kind: PerformanceRecordKind;
  metricType: PerformanceMetricType;
  value: number;
  unit: PerformanceUnit;
  achievedAt: ISODateTime;
  sourceWorkoutId: DocId;
  sourceWorkoutExerciseId: DocId;
  sourceSetId: DocId | null;
  input: PerformanceInputSummary;
  rm: RmFormulaResults | null;
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
  bodyMetrics: BodyMetricDoc[];
  timelineNotes: TimelineNoteDoc[];
  exercisePerformanceRecords: ExercisePerformanceRecordDoc[];
  resources: Record<string, string>;
}

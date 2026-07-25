export const CURRENT_SCHEMA_VERSION = 8;

export type DocId = string;
export type ISODate = string;
export type ISODateTime = string;
export type WeightUnit = "kg" | "lb";
export const DEFAULT_THEME_ID = "emerald-slate";
export type PlanMode = "weekly" | "cyclic" | "flexible";
export type RecordingMode =
  | "weight_reps"
  | "reps"
  | "reps_duration"
  | "duration"
  | "distance_duration"
  | "weight_duration"
  | "weight_distance_duration";
export type LoadBasis = "total" | "per_hand";
export type CountBasis = "whole_set" | "per_side";
export type LoadDirection = "higher_better" | "lower_better";
export type RateMetric = "none" | "reps_per_time" | "distance_per_time" | "load_distance_per_time";
export type ContextKind = "none" | "resistance_level" | "incline_percent";
export type ExerciseCategory =
  | "chest" | "back" | "legs" | "shoulders" | "arms"
  | "core" | "cardio" | "stretch" | "other";
export type EquipmentId =
  | "body_weight" | "barbell" | "trap_bar" | "dumbbell" | "cable" | "machine"
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
  recordingMode: RecordingMode;
  loadBasis: LoadBasis | null;
  countBasis: CountBasis;
  loadDirection: LoadDirection | null;
  rateMetric: RateMetric;
  contextKind?: ContextKind;
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
  recordingMode: RecordingMode;
  loadBasis: LoadBasis | null;
  countBasis: CountBasis;
  loadDirection: LoadDirection | null;
  rateMetric: RateMetric;
  contextKind?: ContextKind;
  equipment: EquipmentId | null;
  description: string | null;
  primaryMuscleGroupIds: MuscleGroupId[];
  secondaryMuscleGroupIds: MuscleGroupId[];
  provenance?: ExerciseProvenance;
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
  contextValue?: number | null;
}

export interface WorkoutExerciseDoc {
  id: DocId;
  exerciseId: DocId;
  /** Immutable interpretation of the exercise at the time this workout was recorded. */
  recordingMode: RecordingMode;
  loadBasis: LoadBasis | null;
  countBasis: CountBasis;
  loadDirection: LoadDirection | null;
  rateMetric: RateMetric;
  contextKind?: ContextKind;
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
  | "weight.max"
  | "reps.max_set"
  | "reps.max_workout"
  | "volume.max_set"
  | "volume.max_workout"
  | "rm.rpe_adjusted_mean"
  | "assistance.best_reps"
  | "assistance.min_weight"
  | "distance.max_set"
  | "distance.max_workout"
  | "duration.max_set"
  | "duration.max_workout"
  | "frequency.max"
  | "speed.max"
  | "load_duration.max"
  | "load_distance.max"
  | "load_distance_rate.max";

export type PerformanceUnit =
  | "kg"
  | "kg_reps"
  | "kg_seconds"
  | "kg_meters"
  | "kg_meters_per_second"
  | "m"
  | "sec"
  | "m_per_sec"
  | "reps_per_minute"
  | "reps";

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
  recordingMode: RecordingMode;
  enteredLoad: number | null;
  enteredLoadUnit: WeightUnit | null;
  loadBasis: LoadBasis | null;
  countBasis: CountBasis;
  loadDirection: LoadDirection | null;
  rateMetric: RateMetric;
  contextKind?: ContextKind;
  contextValue?: number | null;
  reps: number | null;
  rpe: number | null;
  distanceM: number | null;
  durationSec: number | null;
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

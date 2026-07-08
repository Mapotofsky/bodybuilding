import {
  CURRENT_SCHEMA_VERSION,
  DEFAULT_THEME_ID,
  type BodyMetricDoc,
  type BodyMeasurementsCm,
  type DataSnapshot,
  type ExercisePerformanceRecordDoc,
  type ExerciseDoc,
  type ExerciseType,
  type IronLogManifest,
  type MuscleGroupId,
  type ProfileDoc,
  type SettingsDoc,
  type TemplateDoc,
  type TimelineNoteDoc,
  type TrainingPlanDoc,
  type WorkoutDoc,
  type WorkoutSetDoc,
} from "./models";
import { makeId, nowIso } from "./id";
import { DEFAULT_EXERCISES } from "./defaultData";

export const STATIC_SHARD_PATHS = [
  "profile.json",
  "settings.json",
  "exercises.json",
  "templates.json",
  "body-metrics.json",
  "timeline-notes.json",
] as const;
export const AVATAR_RESOURCE_PREFIX = "assets/avatar/";

export function workoutShardPath(date: string): string {
  return `workouts/${date.slice(0, 7)}.json`;
}

export function isWorkoutShardPath(path: string): boolean {
  return /^workouts\/\d{4}-\d{2}\.json$/.test(path);
}

export function exercisePerformanceShardPath(achievedAt: string): string {
  return `exercise-performance/${achievedAt.slice(0, 7)}.json`;
}

export function isExercisePerformanceShardPath(path: string): boolean {
  return /^exercise-performance\/\d{4}-\d{2}\.json$/.test(path);
}

export function workoutShardPathsFromManifest(manifest: Pick<IronLogManifest, "shards"> | null | undefined): string[] {
  return [...new Set((manifest?.shards || []).map((shard) => shard.path).filter(isWorkoutShardPath))].sort();
}

export function exercisePerformanceShardPathsFromManifest(manifest: Pick<IronLogManifest, "shards"> | null | undefined): string[] {
  return [...new Set((manifest?.shards || []).map((shard) => shard.path).filter(isExercisePerformanceShardPath))].sort();
}

function doc<T extends { id?: string; createdAt?: string; updatedAt?: string; deletedAt?: string | null; schemaVersion?: number }>(
  value: T
): T & { id: string; createdAt: string; updatedAt: string; deletedAt: string | null; schemaVersion: number } {
  const t = nowIso();
  return {
    ...value,
    id: value.id || makeId(),
    createdAt: value.createdAt || t,
    updatedAt: value.updatedAt || value.createdAt || t,
    deletedAt: value.deletedAt ?? null,
    schemaVersion: value.schemaVersion || CURRENT_SCHEMA_VERSION,
  };
}

export function makeEmptySnapshot(deviceId: string): DataSnapshot {
  const t = nowIso();
  const profile: ProfileDoc = doc({
    id: "profile-local",
    nickname: "训练者",
    avatarUrl: null,
    gender: null,
    birthDate: null,
  });
  const settings: SettingsDoc = doc({
    id: "settings-local",
    weightUnit: "kg",
    themeId: DEFAULT_THEME_ID,
    lastSyncAt: null,
  });
  return {
    manifest: {
      app: "ironlog",
      schemaVersion: CURRENT_SCHEMA_VERSION,
      deviceId,
      updatedAt: t,
      shards: [
        { path: "profile.json", updatedAt: profile.updatedAt },
        { path: "settings.json", updatedAt: settings.updatedAt },
        { path: "exercises.json", updatedAt: t },
        { path: "templates.json", updatedAt: t },
        { path: "body-metrics.json", updatedAt: t },
        { path: "timeline-notes.json", updatedAt: t },
      ],
    },
    profile,
    settings,
    exercises: DEFAULT_EXERCISES,
    plans: [],
    templates: [],
    workouts: [],
    bodyMetrics: [],
    timelineNotes: [],
    exercisePerformanceRecords: [],
    resources: {},
  };
}

export function migrateSnapshot(raw: Partial<DataSnapshot>, deviceId: string): DataSnapshot {
  const base = makeEmptySnapshot(deviceId);
  const snapshot: DataSnapshot = {
    manifest: {
      ...base.manifest,
      ...raw.manifest,
      schemaVersion: CURRENT_SCHEMA_VERSION,
      updatedAt: raw.manifest?.updatedAt || nowIso(),
    },
    profile: normalizeProfile(raw.profile, base.profile),
    settings: normalizeSettings(raw.settings, base.settings),
    exercises: normalizeExercises(raw.exercises, base.exercises),
    plans: normalizeArray<TrainingPlanDoc>(raw.plans, []),
    templates: normalizeArray<TemplateDoc>(raw.templates, []),
    workouts: normalizeWorkouts(raw.workouts, []),
    bodyMetrics: normalizeBodyMetrics(raw.bodyMetrics),
    timelineNotes: normalizeTimelineNotes(raw.timelineNotes),
    exercisePerformanceRecords: normalizePerformanceRecords(raw.exercisePerformanceRecords),
    resources: normalizeResources(raw.resources),
  };
  snapshot.workouts = snapshot.workouts.map((workout) => migrateWorkoutExerciseTypes(workout, snapshot.exercises));
  snapshot.manifest.shards = buildShardList(snapshot);
  return snapshot;
}

function normalizeProfile(value: ProfileDoc | undefined, fallback: ProfileDoc): ProfileDoc {
  const { height: _legacyHeight, weight: _legacyWeight, ...profile } = {
    ...fallback,
    ...(value as ProfileDoc & { height?: unknown; weight?: unknown } | undefined),
  };
  return doc({
    ...profile,
    nickname: profile.nickname ?? null,
    avatarUrl: profile.avatarUrl ?? null,
    gender: profile.gender ?? null,
    birthDate: profile.birthDate ?? null,
  });
}

function normalizeExercises(value: ExerciseDoc[] | undefined, fallback: ExerciseDoc[]): ExerciseDoc[] {
  const stored = normalizeArray<ExerciseDoc>(value, []);
  const defaultsById = new Map(fallback.map((exercise) => [exercise.id, exercise]));
  const merged = new Map<string, ExerciseDoc>();

  for (const exercise of stored) {
    const builtIn = defaultsById.get(exercise.id);
    const legacyMetKey = "met" + "Value";
    const cleanExercise = { ...(exercise as ExerciseDoc & Record<string, unknown>) };
    delete cleanExercise[legacyMetKey];
    // Built-in definitions are app contract. Preserve user data only for custom records.
    merged.set(exercise.id, builtIn ? { ...cleanExercise, ...builtIn, createdAt: exercise.createdAt, deletedAt: exercise.deletedAt, updatedAt: exercise.updatedAt } : {
      ...cleanExercise,
      type: normalizeExerciseType(exercise.type),
      primaryMuscleGroupIds: normalizeMuscleGroups(exercise.primaryMuscleGroupIds),
      secondaryMuscleGroupIds: normalizeMuscleGroups(exercise.secondaryMuscleGroupIds),
      isCustom: exercise.isCustom === true,
      replacedByExerciseId: exercise.replacedByExerciseId ?? null,
    });
  }
  for (const exercise of fallback) {
    if (!merged.has(exercise.id)) merged.set(exercise.id, { ...exercise });
  }
  return [...merged.values()];
}

function normalizeWorkouts(value: WorkoutDoc[] | undefined, fallback: WorkoutDoc[]): WorkoutDoc[] {
  return normalizeArray<WorkoutDoc>(value, fallback).map((workout) => ({
    ...workout,
    exercises: workout.exercises.map((exercise) => ({
      ...exercise,
      sets: exercise.sets.map(normalizeWorkoutSet),
    })),
  }));
}

export const BODY_MEASUREMENT_KEYS = [
  "neck", "shoulder", "chest", "waist", "hip",
  "upperArmLeft", "upperArmRight",
  "forearmLeft", "forearmRight",
  "thighLeft", "thighRight",
  "calfLeft", "calfRight",
] as const;

export function emptyBodyMeasurements(): BodyMeasurementsCm {
  return Object.fromEntries(BODY_MEASUREMENT_KEYS.map((key) => [key, null])) as BodyMeasurementsCm;
}

function normalizeBodyMetrics(value: BodyMetricDoc[] | undefined): BodyMetricDoc[] {
  return normalizeArray<BodyMetricDoc>(value, []).map((metric) => ({
    ...metric,
    recordedAt: typeof metric.recordedAt === "string" ? metric.recordedAt : metric.createdAt,
    heightCm: normalizeNullableNumber(metric.heightCm),
    weightKg: normalizeNullableNumber(metric.weightKg),
    bodyFatPercent: normalizeNullableNumber(metric.bodyFatPercent),
    measurementsCm: normalizeMeasurements(metric.measurementsCm),
    note: metric.note ?? null,
  }));
}

function normalizeMeasurements(value: unknown): BodyMeasurementsCm {
  const raw = value && typeof value === "object" && !Array.isArray(value)
    ? value as Partial<Record<keyof BodyMeasurementsCm, unknown>>
    : {};
  return Object.fromEntries(BODY_MEASUREMENT_KEYS.map((key) => [key, normalizeNullableNumber(raw[key])])) as BodyMeasurementsCm;
}

function normalizeTimelineNotes(value: TimelineNoteDoc[] | undefined): TimelineNoteDoc[] {
  return normalizeArray<TimelineNoteDoc>(value, []).map((note) => ({
    ...note,
    content: typeof note.content === "string" ? note.content : "",
    rangeType: note.rangeType === "date_range" || note.rangeType === "open_ended" || note.rangeType === "single_day" ? note.rangeType : "single_day",
    startDate: typeof note.startDate === "string" ? note.startDate : note.createdAt.slice(0, 10),
    endDate: typeof note.endDate === "string" ? note.endDate : null,
    workoutId: note.workoutId ?? null,
  }));
}

function normalizePerformanceRecords(value: ExercisePerformanceRecordDoc[] | undefined): ExercisePerformanceRecordDoc[] {
  return normalizeArray<ExercisePerformanceRecordDoc>(value, []).map((record) => ({
    ...record,
    sourceSetId: record.sourceSetId ?? null,
    rm: record.rm ?? null,
  }));
}

function normalizeSettings(value: SettingsDoc | undefined, fallback: SettingsDoc): SettingsDoc {
  const { webdav: _legacyWebdav, passwordRef: _legacyPasswordRef, password: _legacyPassword, username: _legacyUsername, url: _legacyUrl, ...settings } = {
    ...fallback,
    ...(value as SettingsDoc & {
      webdav?: unknown;
      passwordRef?: unknown;
      password?: unknown;
      username?: unknown;
      url?: unknown;
    } | undefined),
  };
  return doc({
    ...settings,
    weightUnit: settings.weightUnit === "lb" ? "lb" : "kg",
    themeId: normalizeThemeId(settings.themeId),
    lastSyncAt: settings.lastSyncAt ?? null,
  });
}

function normalizeThemeId(value: unknown): string {
  return typeof value === "string" && value.length > 0 ? value : DEFAULT_THEME_ID;
}

function normalizeResources(value: unknown): Record<string, string> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(Object.entries(value)
    .filter(([path, body]) => isResourceShardPath(path) && typeof body === "string"));
}

function normalizeWorkoutSet(set: WorkoutSetDoc): WorkoutSetDoc {
  const legacyFlagKey = "is" + "Drop" + "set";
  const raw = { ...(set as WorkoutSetDoc & Record<string, unknown>) };
  delete raw[legacyFlagKey];
  return {
    id: raw.id as string,
    setNumber: raw.setNumber as number,
    weight: (raw.weight as number | null | undefined) ?? null,
    reps: (raw.reps as number | null | undefined) ?? null,
    unit: raw.unit === "lb" ? "lb" : "kg",
    durationSec: (raw.durationSec as number | null | undefined) ?? null,
    distanceM: (raw.distanceM as number | null | undefined) ?? null,
    rpe: (raw.rpe as number | null | undefined) ?? null,
    isWarmup: raw.isWarmup === true,
    isFailure: raw.isFailure === true,
    restSeconds: (raw.restSeconds as number | null | undefined) ?? null,
  };
}

function normalizeNullableNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function normalizeExerciseType(value: unknown): ExerciseType {
  return value === "cardio" || value === "reps_only" || value === "static_hold" || value === "strength" ? value : "strength";
}

const MUSCLE_GROUP_IDS = new Set<MuscleGroupId>([
  "chest", "back", "shoulders", "biceps", "triceps", "forearms",
  "core", "glutes", "quadriceps", "hamstrings", "calves",
  "adductors", "abductors", "full_body", "other",
]);

function normalizeMuscleGroups(value: unknown): MuscleGroupId[] {
  return Array.isArray(value)
    ? value.filter((item): item is MuscleGroupId => MUSCLE_GROUP_IDS.has(item as MuscleGroupId))
    : [];
}

/**
 * v1 files predate WorkoutExerciseDoc.exerciseType.  Preserve their recorded
 * data and infer a durable snapshot at the load boundary so later writes and
 * WebDAV sync no longer need a page-level guess.
 */
function migrateWorkoutExerciseTypes(workout: WorkoutDoc, exercises: ExerciseDoc[]): WorkoutDoc {
  const types = new Map(exercises.map((exercise) => [exercise.id, exercise.type]));
  return {
    ...workout,
    exercises: workout.exercises.map((exercise) => ({
      ...exercise,
      exerciseType: normalizeWorkoutExerciseType(exercise, types.get(exercise.exerciseId)),
    })),
  };
}

function normalizeWorkoutExerciseType(
  exercise: WorkoutDoc["exercises"][number],
  linkedType: ExerciseType | undefined
): ExerciseType {
  if (exercise.exerciseType === "strength" || exercise.exerciseType === "cardio" || exercise.exerciseType === "reps_only" || exercise.exerciseType === "static_hold") {
    return exercise.exerciseType;
  }
  if (linkedType) return linkedType;
  return exercise.sets.some((set) => set.durationSec != null || set.distanceM != null) ? "cardio" : "strength";
}

function normalizeArray<T extends { id?: string; createdAt?: string; updatedAt?: string; deletedAt?: string | null; schemaVersion?: number }>(
  value: T[] | undefined,
  fallback: T[]
): T[] {
  return (value && value.length > 0 ? value : fallback).map((item) => doc(item) as T);
}

export function buildShardList(snapshot: DataSnapshot) {
  const workoutShards = new Map<string, string>();
  for (const workout of snapshot.workouts) {
    const path = workoutShardPath(workout.date);
    const latestUpdate = workoutShards.get(path);
    if (!latestUpdate || workout.updatedAt > latestUpdate) {
      workoutShards.set(path, workout.updatedAt);
    }
  }
  const performanceShards = new Map<string, string>();
  for (const record of snapshot.exercisePerformanceRecords) {
    const path = exercisePerformanceShardPath(record.achievedAt);
    const latestUpdate = performanceShards.get(path);
    if (!latestUpdate || record.updatedAt > latestUpdate) {
      performanceShards.set(path, record.updatedAt);
    }
  }

  const staticShards = [
    { path: "profile.json", updatedAt: snapshot.profile.updatedAt },
    { path: "settings.json", updatedAt: snapshot.settings.updatedAt },
    { path: "exercises.json", updatedAt: maxUpdated(snapshot.exercises, snapshot.manifest.updatedAt) },
    { path: "templates.json", updatedAt: maxUpdated([...snapshot.plans, ...snapshot.templates], snapshot.manifest.updatedAt) },
    { path: "body-metrics.json", updatedAt: maxUpdated(snapshot.bodyMetrics, snapshot.manifest.updatedAt) },
    { path: "timeline-notes.json", updatedAt: maxUpdated(snapshot.timelineNotes, snapshot.manifest.updatedAt) },
  ];

  return [
    ...staticShards,
    ...Object.keys(snapshot.resources)
      .filter(isResourceShardPath)
      .sort()
      .map((path) => ({ path, updatedAt: snapshot.profile.updatedAt })),
    ...[...workoutShards.entries()]
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([path, updatedAt]) => ({ path, updatedAt })),
    ...[...performanceShards.entries()]
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([path, updatedAt]) => ({ path, updatedAt })),
  ];
}

export function isResourceShardPath(path: string): boolean {
  return path.startsWith(AVATAR_RESOURCE_PREFIX) && path.endsWith(".txt") && !path.includes("..");
}

function maxUpdated(items: Array<{ updatedAt: string }>, fallback: string): string {
  return items.reduce((max, item) => (item.updatedAt > max ? item.updatedAt : max), fallback);
}

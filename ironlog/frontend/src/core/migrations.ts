import {
  CURRENT_SCHEMA_VERSION,
  DEFAULT_THEME_ID,
  type BodyMetricDoc,
  type BodyMeasurementsCm,
  type DataSnapshot,
  type ExercisePerformanceRecordDoc,
  type ExerciseDoc,
  type IronLogManifest,
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
import { recordingConfigOf, validateRecordingConfig, validateWorkoutSetForMode } from "./recordingModes";
import { getPerformanceMetricSpec } from "./performanceMetrics";

export const STATIC_SHARD_PATHS = [
  "profile.json",
  "settings.json",
  "exercises.json",
  "templates.json",
  "body-metrics.json",
  "timeline-notes.json",
] as const;
export const AVATAR_RESOURCE_PREFIX = "assets/avatar/";
const COMPATIBLE_SCHEMA_VERSIONS = new Set([5, 6, CURRENT_SCHEMA_VERSION]);
const RESISTANCE_EXERCISE_IDS = new Set(["ex-elliptical-trainer", "ex-stationary-bike"]);

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
  if (value.schemaVersion != null && !COMPATIBLE_SCHEMA_VERSIONS.has(value.schemaVersion)) {
    throw new Error(`不兼容快照（schemaVersion=${value.schemaVersion}）；请升级应用或从备份恢复`);
  }
  const t = nowIso();
  return {
    ...value,
    id: value.id || makeId(),
    createdAt: value.createdAt || t,
    updatedAt: value.updatedAt || value.createdAt || t,
    deletedAt: value.deletedAt ?? null,
    schemaVersion: CURRENT_SCHEMA_VERSION,
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
    exercises: DEFAULT_EXERCISES.map((exercise) => ({
      ...exercise,
      primaryMuscleGroupIds: [...exercise.primaryMuscleGroupIds],
      secondaryMuscleGroupIds: [...exercise.secondaryMuscleGroupIds],
      provenance: exercise.provenance ? { ...exercise.provenance } : undefined,
    })),
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
  const sourceSchemaVersion = raw.manifest?.schemaVersion;
  if (sourceSchemaVersion == null || !COMPATIBLE_SCHEMA_VERSIONS.has(sourceSchemaVersion)) {
    throw new Error(`不兼容快照（schemaVersion=${sourceSchemaVersion ?? "未知"}）；请升级应用或从备份恢复`);
  }
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
    exercises: normalizeExercises(raw.exercises, sourceSchemaVersion),
    plans: normalizeArray<TrainingPlanDoc>(raw.plans, []),
    templates: normalizeArray<TemplateDoc>(raw.templates, []),
    workouts: normalizeWorkouts(raw.workouts, [], sourceSchemaVersion),
    bodyMetrics: normalizeBodyMetrics(raw.bodyMetrics),
    timelineNotes: normalizeTimelineNotes(raw.timelineNotes),
    exercisePerformanceRecords: normalizePerformanceRecords(raw.exercisePerformanceRecords, sourceSchemaVersion),
    resources: normalizeResources(raw.resources),
  };
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

function normalizeWorkouts(value: WorkoutDoc[] | undefined, fallback: WorkoutDoc[], sourceSchemaVersion: number): WorkoutDoc[] {
  return normalizeArray<WorkoutDoc>(value, fallback).map((workout) => ({
    ...workout,
    exercises: workout.exercises.map((exercise) => {
      const config = normalizeRecordingConfig(exercise, sourceSchemaVersion);
      return {
        ...exercise,
        ...config,
        sets: exercise.sets.map((rawSet) => {
          const set = normalizeWorkoutSet(rawSet, sourceSchemaVersion);
          validateWorkoutSetForMode(set, config, workout.endTime == null ? "draft" : "complete");
          return set;
        }),
      };
    }),
  }));
}

function normalizeExercises(value: ExerciseDoc[] | undefined, sourceSchemaVersion: number): ExerciseDoc[] {
  const existing = normalizeArray<ExerciseDoc>(value, []);
  const byId = new Map(existing.map((exercise) => [exercise.id, exercise]));
  const mergedDefaults = DEFAULT_EXERCISES.map((current) => {
    const previous = byId.get(current.id);
    byId.delete(current.id);
    if (!previous) return current;
    const merged = sourceSchemaVersion < CURRENT_SCHEMA_VERSION
      ? {
          ...previous,
          ...current,
          createdAt: previous.createdAt,
          deletedAt: previous.deletedAt,
          replacedByExerciseId: previous.replacedByExerciseId,
        }
      : previous;
    return {
      ...merged,
      ...normalizeRecordingConfig(merged, CURRENT_SCHEMA_VERSION),
      schemaVersion: CURRENT_SCHEMA_VERSION,
    };
  });
  const preserved = [...byId.values()].map((exercise) => {
    return {
      ...exercise,
      ...normalizeRecordingConfig(exercise, sourceSchemaVersion),
      schemaVersion: CURRENT_SCHEMA_VERSION,
    };
  });
  return [...mergedDefaults, ...preserved];
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

function normalizePerformanceRecords(value: ExercisePerformanceRecordDoc[] | undefined, sourceSchemaVersion: number): ExercisePerformanceRecordDoc[] {
  return normalizeArray<ExercisePerformanceRecordDoc>(value, []).map((record) => {
    const spec = getPerformanceMetricSpec(record.metricType);
    if (!spec || record.unit !== spec.unit) throw new Error("成绩指标或单位与当前 schema 不兼容");
    if (!record.input || typeof record.input !== "object") throw new Error("成绩输入上下文无效");
    const input = sourceSchemaVersion < CURRENT_SCHEMA_VERSION
      ? {
          ...record.input,
          ...normalizeRecordingConfig(record.input, sourceSchemaVersion),
          contextValue: sourceSchemaVersion === 5 ? null : record.input.contextValue ?? null,
        }
      : record.input;
    validatePerformanceInput(input);
    const migrated = { ...record, input, sourceSetId: record.sourceSetId ?? null, rm: record.rm ?? null };
    if (sourceSchemaVersion < CURRENT_SCHEMA_VERSION && RESISTANCE_EXERCISE_IDS.has(record.exerciseId) && migrated.deletedAt == null) {
      const deletedAt = nowIso();
      return { ...migrated, deletedAt, updatedAt: deletedAt };
    }
    return migrated;
  });
}

function validatePerformanceInput(input: ExercisePerformanceRecordDoc["input"]): void {
  if (!input || typeof input !== "object") throw new Error("成绩输入上下文无效");
  const requiredKeys: Array<keyof ExercisePerformanceRecordDoc["input"]> = [
    "recordingMode", "enteredLoad", "enteredLoadUnit", "loadBasis", "countBasis", "loadDirection", "rateMetric",
    "contextKind", "contextValue", "reps", "rpe", "distanceM", "durationSec",
  ];
  if (requiredKeys.some((key) => !(key in input))) throw new Error("成绩输入上下文与当前 schema 不兼容");
  validateRecordingConfig(recordingConfigOf(input));
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

function normalizeWorkoutSet(set: WorkoutSetDoc, sourceSchemaVersion: number): WorkoutSetDoc {
  const legacyFlagKey = "is" + "Drop" + "set";
  const raw = { ...(set as WorkoutSetDoc & Record<string, unknown>) };
  delete raw[legacyFlagKey];
  return {
    ...raw,
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
    contextValue: sourceSchemaVersion === 5 ? null : (raw.contextValue as number | null | undefined) ?? null,
  };
}

function normalizeRecordingConfig(
  value: Parameters<typeof recordingConfigOf>[0],
  sourceSchemaVersion: number
) {
  const config = recordingConfigOf(value);
  const raw = value as unknown as { recordingMode?: unknown; rateMetric?: unknown };
  return validateRecordingConfig({
    ...config,
    recordingMode: sourceSchemaVersion <= 6 && raw.recordingMode === "step_count_duration"
      ? "reps_duration"
      : config.recordingMode,
    rateMetric: sourceSchemaVersion <= 6 && raw.rateMetric === "steps_per_time"
      ? "reps_per_time"
      : config.rateMetric,
    contextKind: config.contextKind ?? "none",
  });
}

function normalizeNullableNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function normalizeArray<T extends { id?: string; createdAt?: string; updatedAt?: string; deletedAt?: string | null; schemaVersion?: number }>(
  value: T[] | undefined,
  fallback: T[]
): T[] {
  return (value ?? fallback).map((item) => doc(item) as T);
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

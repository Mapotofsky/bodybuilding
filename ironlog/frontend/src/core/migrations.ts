import {
  CURRENT_SCHEMA_VERSION,
  type DataSnapshot,
  type ExerciseDoc,
  type ExerciseType,
  type IronLogManifest,
  type ProfileDoc,
  type SettingsDoc,
  type TemplateDoc,
  type TrainingPlanDoc,
  type WorkoutDoc,
} from "./models";
import { makeId, nowIso } from "./id";
import { DEFAULT_EXERCISES } from "./defaultData";

export const STATIC_SHARD_PATHS = ["profile.json", "settings.json", "exercises.json", "templates.json"] as const;

export function workoutShardPath(date: string): string {
  return `workouts/${date.slice(0, 7)}.json`;
}

export function isWorkoutShardPath(path: string): boolean {
  return /^workouts\/\d{4}-\d{2}\.json$/.test(path);
}

export function workoutShardPathsFromManifest(manifest: Pick<IronLogManifest, "shards"> | null | undefined): string[] {
  return [...new Set((manifest?.shards || []).map((shard) => shard.path).filter(isWorkoutShardPath))].sort();
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
    height: null,
    weight: null,
    birthDate: null,
  });
  const settings: SettingsDoc = doc({
    id: "settings-local",
    weightUnit: "kg",
    webdav: { url: "", username: "", passwordRef: null },
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
      ],
    },
    profile,
    settings,
    exercises: DEFAULT_EXERCISES,
    plans: [],
    templates: [],
    workouts: [],
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
    profile: doc({ ...base.profile, ...raw.profile }),
    settings: doc({ ...base.settings, ...raw.settings }),
    exercises: normalizeExercises(raw.exercises, base.exercises),
    plans: normalizeArray<TrainingPlanDoc>(raw.plans, []),
    templates: normalizeArray<TemplateDoc>(raw.templates, []),
    workouts: normalizeWorkouts(raw.workouts, []),
  };
  snapshot.workouts = snapshot.workouts.map((workout) => migrateWorkoutExerciseTypes(workout, snapshot.exercises));
  snapshot.manifest.shards = buildShardList(snapshot);
  return snapshot;
}

function normalizeExercises(value: ExerciseDoc[] | undefined, fallback: ExerciseDoc[]): ExerciseDoc[] {
  const stored = normalizeArray<ExerciseDoc>(value, []);
  const defaultsById = new Map(fallback.map((exercise) => [exercise.id, exercise]));
  const merged = new Map<string, ExerciseDoc>();

  for (const exercise of stored) {
    const builtIn = defaultsById.get(exercise.id);
    // Built-in definitions are app contract. Preserve user data only for custom records.
    merged.set(exercise.id, builtIn ? { ...exercise, ...builtIn, createdAt: exercise.createdAt, deletedAt: exercise.deletedAt, updatedAt: exercise.updatedAt } : {
      ...exercise,
      type: normalizeExerciseType(exercise.type),
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
  return normalizeArray<WorkoutDoc>(value, fallback);
}

function normalizeExerciseType(value: unknown): ExerciseType {
  return value === "cardio" || value === "reps_only" || value === "static_hold" || value === "strength" ? value : "strength";
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

  const staticShards = [
    { path: "profile.json", updatedAt: snapshot.profile.updatedAt },
    { path: "settings.json", updatedAt: snapshot.settings.updatedAt },
    { path: "exercises.json", updatedAt: maxUpdated(snapshot.exercises, snapshot.manifest.updatedAt) },
    { path: "templates.json", updatedAt: maxUpdated([...snapshot.plans, ...snapshot.templates], snapshot.manifest.updatedAt) },
  ];

  return [
    ...staticShards,
    ...[...workoutShards.entries()]
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([path, updatedAt]) => ({ path, updatedAt })),
  ];
}

function maxUpdated(items: Array<{ updatedAt: string }>, fallback: string): string {
  return items.reduce((max, item) => (item.updatedAt > max ? item.updatedAt : max), fallback);
}

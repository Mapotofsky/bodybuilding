import {
  CURRENT_SCHEMA_VERSION,
  type DataSnapshot,
  type ExerciseDoc,
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
    exercises: normalizeArray<ExerciseDoc>(raw.exercises, base.exercises),
    plans: normalizeArray<TrainingPlanDoc>(raw.plans, []),
    templates: normalizeArray<TemplateDoc>(raw.templates, []),
    workouts: normalizeArray<WorkoutDoc>(raw.workouts, []),
  };
  snapshot.manifest.shards = buildShardList(snapshot);
  return snapshot;
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

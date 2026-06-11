import {
  CURRENT_SCHEMA_VERSION,
  type DataSnapshot,
  type ExerciseDoc,
  type ManualScheduleEntryDoc,
  type ProfileDoc,
  type SettingsDoc,
  type TemplateDoc,
  type TrainingPlanDoc,
  type WorkoutDoc,
} from "./models";
import { makeId, nowIso } from "./id";
import { DEFAULT_EXERCISES } from "./defaultData";

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
        { path: "workouts/index.json", updatedAt: t },
      ],
    },
    profile,
    settings,
    exercises: DEFAULT_EXERCISES,
    plans: [],
    templates: [],
    scheduleEntries: [],
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
    scheduleEntries: normalizeArray<ManualScheduleEntryDoc>(raw.scheduleEntries, []),
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
  const latestWorkoutUpdate = snapshot.workouts.reduce(
    (max, w) => (w.updatedAt > max ? w.updatedAt : max),
    snapshot.manifest.updatedAt
  );
  return [
    { path: "profile.json", updatedAt: snapshot.profile.updatedAt },
    { path: "settings.json", updatedAt: snapshot.settings.updatedAt },
    { path: "exercises.json", updatedAt: maxUpdated(snapshot.exercises, snapshot.manifest.updatedAt) },
    { path: "templates.json", updatedAt: maxUpdated([...snapshot.plans, ...snapshot.templates, ...snapshot.scheduleEntries], snapshot.manifest.updatedAt) },
    { path: "workouts/index.json", updatedAt: latestWorkoutUpdate },
  ];
}

function maxUpdated(items: Array<{ updatedAt: string }>, fallback: string): string {
  return items.reduce((max, item) => (item.updatedAt > max ? item.updatedAt : max), fallback);
}

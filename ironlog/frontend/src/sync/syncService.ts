import { localRepository } from "@/repositories/localJsonRepository";
import { rebuildAllPerformanceRecords } from "@/services/performance";
import {
  buildShardList,
  exercisePerformanceShardPath,
  exercisePerformanceShardPathsFromManifest,
  isExercisePerformanceShardPath,
  isResourceShardPath,
  isWorkoutShardPath,
  migrateSnapshot,
  STATIC_SHARD_PATHS,
  workoutShardPath,
  workoutShardPathsFromManifest,
} from "@/core/migrations";
import type { DataSnapshot, ExercisePerformanceRecordDoc, IronLogManifest, SettingsDoc, WorkoutDoc } from "@/core/models";
import { WebDavClient } from "./webdavClient";

export type SyncStatus = "unconfigured" | "syncing" | "success" | "failed" | "conflict";

export interface SyncResult {
  status: SyncStatus;
  message: string;
  conflicts: string[];
}

const MANIFEST_PATH = "manifest.json";
const REMOTE_DATA_DIRECTORY = "ironlog-data";

export async function testWebDavConnection(): Promise<void> {
  const client = await configuredClient();
  await client.mkcol("");
  const response = await client.propfind();
  if (response.status < 200 || response.status >= 300) {
    throw new Error(`PROPFIND failed: ${response.status}`);
  }
}

export async function syncNow(): Promise<SyncResult> {
  const client = await configuredClient();
  const local = await localRepository.getSnapshot();
  const conflicts: string[] = [];

  let remoteFiles: Record<string, unknown> = {};
  try {
    remoteFiles = await pullRemoteFiles(client);
  } catch {
    remoteFiles = {};
  }

  const remote = Object.keys(remoteFiles).length > 0
    ? migrateSnapshot(filesToSnapshot(remoteFiles), local.manifest.deviceId)
    : null;
  const merged = remote ? mergeSnapshots(local, remote, conflicts) : local;
  const shouldRebuildPerformance = remote ? hasPerformanceSourceChanges(local, merged) : false;
  merged.manifest.updatedAt = new Date().toISOString();
  merged.manifest.shards = buildShardList(merged);

  await localRepository.replaceSnapshot(merged);
  await pushSnapshot(client, merged);
  await localRepository.updateLastSyncAt(merged.manifest.updatedAt);
  if (shouldRebuildPerformance) await rebuildAllPerformanceRecords();

  return {
    status: conflicts.length > 0 ? "conflict" : "success",
    message: conflicts.length > 0 ? "同步完成，存在已记录冲突" : "同步完成",
    conflicts,
  };
}

async function configuredClient(): Promise<WebDavClient> {
  const endpoint = await localRepository.getSyncEndpoint();
  if (!endpoint.url || !endpoint.username || !endpoint.passwordRef) {
    throw new Error("WebDAV 未配置");
  }
  const password = await localRepository.readSecret(endpoint.passwordRef);
  if (!password) throw new Error("WebDAV 密码不存在");
  return new WebDavClient({
    url: remoteDataUrl(endpoint.url),
    username: endpoint.username,
    password,
  });
}

async function pullRemoteFiles(client: WebDavClient): Promise<Record<string, unknown>> {
  const manifestResponse = await client.get(MANIFEST_PATH);
  if (manifestResponse.status === 404) return {};
  if (manifestResponse.status < 200 || manifestResponse.status >= 300) {
    throw new Error(`GET ${MANIFEST_PATH} failed: ${manifestResponse.status}`);
  }

  const manifest = JSON.parse(manifestResponse.body) as IronLogManifest;
  const files: Record<string, unknown> = { [MANIFEST_PATH]: manifest };
  for (const path of shardPathsFromManifest(manifest)) {
    const res = await client.get(path);
    if (res.status === 404) continue;
    if (res.status < 200 || res.status >= 300) throw new Error(`GET ${path} failed: ${res.status}`);
    files[path] = JSON.parse(res.body);
  }
  return files;
}

export async function pushSnapshot(client: WebDavClient, snapshot: DataSnapshot): Promise<void> {
  const files = snapshotToFiles(snapshot);
  await ensureRemoteDirs(client, Object.keys(files));
  const remotePaths = await backupRemote(client);
  for (const [path, value] of Object.entries(files)) {
    const tmp = `${path}.tmp-${Date.now()}`;
    const written = await client.put(tmp, JSON.stringify(value, null, 2));
    if (written.status < 200 || written.status >= 300) throw new Error(`PUT ${tmp} failed: ${written.status}`);
    let moved = await client.move(tmp, path, true);
    if (moved.status === 409) {
      const deleted = await client.delete(path);
      if (deleted.status !== 404 && (deleted.status < 200 || deleted.status >= 300)) {
        throw new Error(`DELETE ${path} failed: ${deleted.status}`);
      }
      moved = await client.move(tmp, path, false);
    }
    if (moved.status < 200 || moved.status >= 300) throw new Error(`MOVE ${path} failed: ${moved.status}`);
  }

  const nextPaths = new Set(Object.keys(files));
  for (const path of remotePaths.filter((path) => (isWorkoutShardPath(path) || isExercisePerformanceShardPath(path) || isResourceShardPath(path)) && !nextPaths.has(path))) {
    const deleted = await client.delete(path);
    if (deleted.status !== 404 && (deleted.status < 200 || deleted.status >= 300)) {
      throw new Error(`DELETE ${path} failed: ${deleted.status}`);
    }
  }
}

async function ensureRemoteDirs(client: WebDavClient, paths: string[] = []): Promise<void> {
  await client.mkcol("");
  const dirs = new Set(["workouts", "backups"]);
  for (const path of paths) {
    for (const dir of remoteParentDirsForPath(path)) {
      dirs.add(dir);
    }
  }
  for (const dir of dirs) {
    await client.mkcol(dir);
  }
}

async function backupRemote(client: WebDavClient): Promise<string[]> {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const paths = await remoteShardPaths(client);
  for (const path of paths) {
    const res = await client.get(path);
    if (res.status === 404) continue;
    if (res.status >= 200 && res.status < 300) {
      await client.put(backupPathFor(stamp, path), sanitizeBackupBody(path, res.body));
    }
  }
  return paths;
}

export function remoteParentDirsForPath(path: string): string[] {
  const parts = path.split("/").filter(Boolean);
  return parts.slice(0, -1).map((_, index) => parts.slice(0, index + 1).join("/"));
}

export function backupPathFor(stamp: string, path: string): string {
  return `backups/${stamp}-${path.replace(/\//g, "-")}`;
}

function sanitizeBackupBody(path: string, body: string): string {
  if (path !== "settings.json") return body;
  try {
    const parsed = JSON.parse(body) as Record<string, unknown>;
    return JSON.stringify(stripLocalSecretFields(parsed), null, 2);
  } catch {
    return "{}";
  }
}

export function mergeSnapshots(local: DataSnapshot, remote: DataSnapshot, conflicts: string[]): DataSnapshot {
  return {
    ...local,
    profile: newer(local.profile, remote.profile, "profile", conflicts),
    settings: mergeSettings(local.settings, remote.settings, conflicts),
    exercises: mergeDocs(local.exercises, remote.exercises, "exercise", conflicts),
    plans: mergeDocs(local.plans, remote.plans, "plan", conflicts),
    templates: mergeDocs(local.templates, remote.templates, "template", conflicts),
    workouts: mergeDocs(local.workouts, remote.workouts, "workout", conflicts),
    bodyMetrics: mergeDocs(local.bodyMetrics, remote.bodyMetrics, "bodyMetric", conflicts),
    timelineNotes: mergeDocs(local.timelineNotes, remote.timelineNotes, "timelineNote", conflicts),
    exercisePerformanceRecords: mergeDocs(local.exercisePerformanceRecords, remote.exercisePerformanceRecords, "performance", conflicts),
  };
}

export function hasPerformanceSourceChanges(local: DataSnapshot, merged: DataSnapshot): boolean {
  return revisionSignature(local.workouts) !== revisionSignature(merged.workouts)
    || revisionSignature(local.exercises) !== revisionSignature(merged.exercises);
}

function mergeSettings(local: SettingsDoc, remote: SettingsDoc, conflicts: string[]): SettingsDoc {
  const winner = newer(local, remote, "settings", conflicts);
  return {
    ...winner,
    lastSyncAt: local.lastSyncAt,
  };
}

function mergeDocs<T extends { id: string; updatedAt: string }>(local: T[], remote: T[], label: string, conflicts: string[]): T[] {
  const map = new Map<string, T>();
  for (const doc of local) map.set(doc.id, doc);
  for (const doc of remote) {
    const existing = map.get(doc.id);
    map.set(doc.id, existing ? newer(existing, doc, `${label}:${doc.id}`, conflicts) : doc);
  }
  return [...map.values()];
}

function newer<T extends { updatedAt: string }>(local: T, remote: T, label: string, conflicts: string[]): T {
  if (local.updatedAt === remote.updatedAt) return local;
  conflicts.push(`${label} 使用 last-write-wins 合并`);
  return local.updatedAt > remote.updatedAt ? local : remote;
}

export function snapshotToFiles(snapshot: DataSnapshot): Record<string, unknown> {
  return {
    [MANIFEST_PATH]: snapshot.manifest,
    "profile.json": snapshot.profile,
    "settings.json": remoteSettingsFile(snapshot.settings),
    "exercises.json": snapshot.exercises,
    "templates.json": {
      plans: snapshot.plans,
      templates: snapshot.templates,
    },
    "body-metrics.json": snapshot.bodyMetrics,
    "timeline-notes.json": snapshot.timelineNotes,
    ...snapshot.resources,
    ...workoutMonthFiles(snapshot),
    ...exercisePerformanceMonthFiles(snapshot),
  };
}

function remoteSettingsFile(settings: SettingsDoc): SettingsDoc {
  const rest = stripLocalSecretFields(settings as SettingsDoc & Record<string, unknown>);
  return { ...rest, lastSyncAt: null } as SettingsDoc;
}

function stripLocalSecretFields(value: Record<string, unknown>): Record<string, unknown> {
  const {
    webdav: _webdav,
    passwordRef: _passwordRef,
    password_ref: _password_ref,
    password: _password,
    username: _username,
    url: _url,
    ciphertext: _ciphertext,
    iv: _iv,
    keystoreAlias: _keystoreAlias,
    secretFormatVersion: _secretFormatVersion,
    ...rest
  } = value;
  return rest;
}

function filesToSnapshot(files: Record<string, unknown>): Partial<DataSnapshot> {
  const templateFile = files["templates.json"] as { plans?: unknown; templates?: unknown } | undefined;
  const manifest = files[MANIFEST_PATH] as IronLogManifest | undefined;
  const workouts = workoutShardPathsFromManifest(manifest)
    .flatMap((path) => (Array.isArray(files[path]) ? files[path] : []));
  const performanceRecords = exercisePerformanceShardPathsFromManifest(manifest)
    .flatMap((path) => (Array.isArray(files[path]) ? files[path] : []));
  return {
    manifest: manifest as Partial<DataSnapshot>["manifest"],
    profile: files["profile.json"] as Partial<DataSnapshot>["profile"],
    settings: files["settings.json"] as Partial<DataSnapshot>["settings"],
    exercises: files["exercises.json"] as Partial<DataSnapshot>["exercises"],
    plans: templateFile?.plans as Partial<DataSnapshot>["plans"],
    templates: templateFile?.templates as Partial<DataSnapshot>["templates"],
    workouts: workouts as Partial<DataSnapshot>["workouts"],
    bodyMetrics: files["body-metrics.json"] as Partial<DataSnapshot>["bodyMetrics"],
    timelineNotes: files["timeline-notes.json"] as Partial<DataSnapshot>["timelineNotes"],
    exercisePerformanceRecords: performanceRecords as Partial<DataSnapshot>["exercisePerformanceRecords"],
    resources: Object.fromEntries(Object.entries(files)
      .filter(([path, value]) => isResourceShardPath(path) && typeof value === "string")) as Partial<DataSnapshot>["resources"],
  };
}

function workoutMonthFiles(snapshot: DataSnapshot): Record<string, WorkoutDoc[]> {
  const grouped: Record<string, WorkoutDoc[]> = {};
  for (const workout of snapshot.workouts) {
    const path = workoutShardPath(workout.date);
    if (!grouped[path]) grouped[path] = [];
    grouped[path].push(workout);
  }
  return grouped;
}

function exercisePerformanceMonthFiles(snapshot: DataSnapshot): Record<string, ExercisePerformanceRecordDoc[]> {
  const grouped: Record<string, ExercisePerformanceRecordDoc[]> = {};
  for (const record of snapshot.exercisePerformanceRecords) {
    const path = exercisePerformanceShardPath(record.achievedAt);
    if (!grouped[path]) grouped[path] = [];
    grouped[path].push(record);
  }
  return grouped;
}

function shardPathsFromManifest(manifest: Pick<IronLogManifest, "shards">): string[] {
  const staticPaths = new Set<string>(STATIC_SHARD_PATHS);
  const paths = manifest.shards
    .map((shard) => shard.path)
    .filter((path) => staticPaths.has(path) || isWorkoutShardPath(path) || isExercisePerformanceShardPath(path) || isResourceShardPath(path));
  return [...new Set(paths)].sort();
}

async function remoteShardPaths(client: WebDavClient): Promise<string[]> {
  const response = await client.get(MANIFEST_PATH);
  if (response.status < 200 || response.status >= 300) return [];
  const manifest = JSON.parse(response.body) as IronLogManifest;
  return [MANIFEST_PATH, ...shardPathsFromManifest(manifest)];
}

function remoteDataUrl(url: string): string {
  const base = url.replace(/\/+$/, "");
  return base.endsWith(`/${REMOTE_DATA_DIRECTORY}`) ? base : `${base}/${REMOTE_DATA_DIRECTORY}`;
}

function revisionSignature<T extends { id: string }>(docs: T[]): string {
  return JSON.stringify(docs.slice().sort((left, right) => left.id.localeCompare(right.id)));
}

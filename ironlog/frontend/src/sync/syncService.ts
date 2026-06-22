import { localRepository } from "@/repositories/localJsonRepository";
import { buildShardList, isWorkoutShardPath, migrateSnapshot, STATIC_SHARD_PATHS, workoutShardPath, workoutShardPathsFromManifest } from "@/core/migrations";
import type { DataSnapshot, IronLogManifest, SettingsDoc, WorkoutDoc } from "@/core/models";
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
  merged.manifest.updatedAt = new Date().toISOString();
  merged.manifest.shards = buildShardList(merged);

  await localRepository.replaceSnapshot(merged);
  await pushSnapshot(client, merged);
  await localRepository.updateLastSyncAt(merged.manifest.updatedAt);

  return {
    status: conflicts.length > 0 ? "conflict" : "success",
    message: conflicts.length > 0 ? "同步完成，存在已记录冲突" : "同步完成",
    conflicts,
  };
}

async function configuredClient(): Promise<WebDavClient> {
  const settings = await localRepository.getSettings();
  if (!settings.webdav.url || !settings.webdav.username || !settings.webdav.passwordRef) {
    throw new Error("WebDAV 未配置");
  }
  const password = await localRepository.readSecret(settings.webdav.passwordRef);
  if (!password) throw new Error("WebDAV 密码不存在");
  return new WebDavClient({
    url: remoteDataUrl(settings.webdav.url),
    username: settings.webdav.username,
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

async function pushSnapshot(client: WebDavClient, snapshot: DataSnapshot): Promise<void> {
  await ensureRemoteDirs(client);
  const remotePaths = await backupRemote(client);
  const files = snapshotToFiles(snapshot);
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
  for (const path of remotePaths.filter((path) => isWorkoutShardPath(path) && !nextPaths.has(path))) {
    const deleted = await client.delete(path);
    if (deleted.status !== 404 && (deleted.status < 200 || deleted.status >= 300)) {
      throw new Error(`DELETE ${path} failed: ${deleted.status}`);
    }
  }
}

async function ensureRemoteDirs(client: WebDavClient): Promise<void> {
  await client.mkcol("");
  await client.mkcol("workouts");
  await client.mkcol("backups");
}

async function backupRemote(client: WebDavClient): Promise<string[]> {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const paths = await remoteShardPaths(client);
  for (const path of paths) {
    const res = await client.get(path);
    if (res.status === 404) continue;
    if (res.status >= 200 && res.status < 300) {
      await client.put(`backups/${stamp}-${path.replace("/", "-")}`, res.body);
    }
  }
  return paths;
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
  };
}

function mergeSettings(local: SettingsDoc, remote: SettingsDoc, conflicts: string[]): SettingsDoc {
  const winner = newer(local, remote, "settings", conflicts);
  return {
    ...winner,
    webdav: { ...winner.webdav, passwordRef: local.webdav.passwordRef },
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
    "settings.json": {
      ...snapshot.settings,
      lastSyncAt: null,
      webdav: { ...snapshot.settings.webdav, passwordRef: null },
    },
    "exercises.json": snapshot.exercises,
    "templates.json": {
      plans: snapshot.plans,
      templates: snapshot.templates,
    },
    ...workoutMonthFiles(snapshot),
  };
}

function filesToSnapshot(files: Record<string, unknown>): Partial<DataSnapshot> {
  const templateFile = files["templates.json"] as { plans?: unknown; templates?: unknown } | undefined;
  const manifest = files[MANIFEST_PATH] as IronLogManifest | undefined;
  const workouts = workoutShardPathsFromManifest(manifest)
    .flatMap((path) => (Array.isArray(files[path]) ? files[path] : []));
  return {
    manifest: manifest as Partial<DataSnapshot>["manifest"],
    profile: files["profile.json"] as Partial<DataSnapshot>["profile"],
    settings: files["settings.json"] as Partial<DataSnapshot>["settings"],
    exercises: files["exercises.json"] as Partial<DataSnapshot>["exercises"],
    plans: templateFile?.plans as Partial<DataSnapshot>["plans"],
    templates: templateFile?.templates as Partial<DataSnapshot>["templates"],
    workouts: workouts as Partial<DataSnapshot>["workouts"],
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

function shardPathsFromManifest(manifest: Pick<IronLogManifest, "shards">): string[] {
  const staticPaths = new Set<string>(STATIC_SHARD_PATHS);
  const paths = manifest.shards
    .map((shard) => shard.path)
    .filter((path) => staticPaths.has(path) || isWorkoutShardPath(path));
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

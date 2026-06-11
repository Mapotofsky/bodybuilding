import { localRepository } from "@/repositories/localJsonRepository";
import { buildShardList, migrateSnapshot } from "@/core/migrations";
import type { DataSnapshot } from "@/core/models";
import { WebDavClient } from "./webdavClient";

export type SyncStatus = "unconfigured" | "syncing" | "success" | "failed" | "conflict";

export interface SyncResult {
  status: SyncStatus;
  message: string;
  conflicts: string[];
}

const SHARDS = ["manifest.json", "profile.json", "settings.json", "exercises.json", "templates.json", "workouts/index.json"];

export async function testWebDavConnection(): Promise<void> {
  const client = await configuredClient();
  await client.propfind();
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
  await localRepository.updateSettings({ lastSyncAt: merged.manifest.updatedAt });

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
    url: settings.webdav.url,
    username: settings.webdav.username,
    password,
  });
}

async function pullRemoteFiles(client: WebDavClient): Promise<Record<string, unknown>> {
  const files: Record<string, unknown> = {};
  for (const path of SHARDS) {
    const res = await client.get(path);
    if (res.status === 404) continue;
    if (res.status < 200 || res.status >= 300) throw new Error(`GET ${path} failed: ${res.status}`);
    files[path] = JSON.parse(res.body);
  }
  return files;
}

async function pushSnapshot(client: WebDavClient, snapshot: DataSnapshot): Promise<void> {
  await ensureRemoteDirs(client);
  await backupRemote(client);
  const files = snapshotToFiles(snapshot);
  for (const [path, value] of Object.entries(files)) {
    const tmp = `${path}.tmp-${Date.now()}`;
    await client.put(tmp, JSON.stringify(value, null, 2));
    const moved = await client.move(tmp, path, true);
    if (moved.status < 200 || moved.status >= 300) throw new Error(`MOVE ${path} failed: ${moved.status}`);
  }
}

async function ensureRemoteDirs(client: WebDavClient): Promise<void> {
  await client.mkcol("workouts");
  await client.mkcol("backups");
}

async function backupRemote(client: WebDavClient): Promise<void> {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  for (const path of SHARDS) {
    const res = await client.get(path);
    if (res.status === 404) continue;
    if (res.status >= 200 && res.status < 300) {
      await client.put(`backups/${stamp}-${path.replace("/", "-")}`, res.body);
    }
  }
}

function mergeSnapshots(local: DataSnapshot, remote: DataSnapshot, conflicts: string[]): DataSnapshot {
  return {
    ...local,
    profile: newer(local.profile, remote.profile, "profile", conflicts),
    settings: { ...newer(local.settings, remote.settings, "settings", conflicts), webdav: local.settings.webdav },
    exercises: mergeDocs(local.exercises, remote.exercises, "exercise", conflicts),
    plans: mergeDocs(local.plans, remote.plans, "plan", conflicts),
    templates: mergeDocs(local.templates, remote.templates, "template", conflicts),
    scheduleEntries: mergeDocs(local.scheduleEntries, remote.scheduleEntries, "schedule", conflicts),
    workouts: mergeDocs(local.workouts, remote.workouts, "workout", conflicts),
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

function snapshotToFiles(snapshot: DataSnapshot): Record<string, unknown> {
  return {
    "manifest.json": snapshot.manifest,
    "profile.json": snapshot.profile,
    "settings.json": { ...snapshot.settings, webdav: { ...snapshot.settings.webdav, passwordRef: null } },
    "exercises.json": snapshot.exercises,
    "templates.json": {
      plans: snapshot.plans,
      templates: snapshot.templates,
      scheduleEntries: snapshot.scheduleEntries,
    },
    "workouts/index.json": snapshot.workouts,
  };
}

function filesToSnapshot(files: Record<string, unknown>): Partial<DataSnapshot> {
  const templateFile = files["templates.json"] as { plans?: unknown; templates?: unknown; scheduleEntries?: unknown } | undefined;
  return {
    manifest: files["manifest.json"] as Partial<DataSnapshot>["manifest"],
    profile: files["profile.json"] as Partial<DataSnapshot>["profile"],
    settings: files["settings.json"] as Partial<DataSnapshot>["settings"],
    exercises: files["exercises.json"] as Partial<DataSnapshot>["exercises"],
    plans: templateFile?.plans as Partial<DataSnapshot>["plans"],
    templates: templateFile?.templates as Partial<DataSnapshot>["templates"],
    scheduleEntries: templateFile?.scheduleEntries as Partial<DataSnapshot>["scheduleEntries"],
    workouts: files["workouts/index.json"] as Partial<DataSnapshot>["workouts"],
  };
}

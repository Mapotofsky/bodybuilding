import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { buildShardList, makeEmptySnapshot } from "@/core/migrations";
import type { DataSnapshot, SyncEndpointConfig } from "@/core/models";
import type { DocumentStore } from "@/platform/documentStore";
import { LocalJsonRepository } from "@/repositories/localJsonRepository";
import { backupPathFor, mergeSnapshots, pushSnapshot, remoteParentDirsForPath, snapshotToFiles } from "./syncService";
import type { WebDavClient, WebDavResponse } from "./webdavClient";

const FIRST_SYNC_AT = "2026-06-20T10:00:00.000Z";
const SECOND_SYNC_AT = "2026-06-20T10:05:00.000Z";

describe("settings WebDAV sync", () => {
  beforeEach(() => {
    vi.stubGlobal("localStorage", {
      getItem: () => "device-test",
      setItem: () => undefined,
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("does not record a settings conflict after only local lastSyncAt updates between two syncs", async () => {
    const initial = makeEmptySnapshot("device-test");
    initial.settings = {
      ...initial.settings,
      updatedAt: FIRST_SYNC_AT,
    };
    const repository = new LocalJsonRepository(Promise.resolve(memoryStore(initial)));
    const firstUploaded = clone(await repository.getSnapshot());

    await repository.updateLastSyncAt(SECOND_SYNC_AT);
    await repository.updateSettings({
      weightUnit: firstUploaded.settings.weightUnit,
    });
    const localForSecondSync = await repository.getSnapshot();
    const conflicts: string[] = [];

    const merged = mergeSnapshots(localForSecondSync, firstUploaded, conflicts);
    const settingsFile = snapshotToFiles(merged)["settings.json"] as DataSnapshot["settings"];

    expect(localForSecondSync.settings.updatedAt).toBe(FIRST_SYNC_AT);
    expect(merged.settings.lastSyncAt).toBe(SECOND_SYNC_AT);
    expect(merged.settings.weightUnit).toBe(firstUploaded.settings.weightUnit);
    expect(conflicts).not.toContain("settings 使用 last-write-wins 合并");
    expect(settingsFile.lastSyncAt).toBeNull();
    expect(settingsFile).not.toHaveProperty("webdav");
    expect(settingsFile).not.toHaveProperty("passwordRef");
  });

  it("keeps last-write-wins and records a conflict for real user settings changes", () => {
    const local = makeEmptySnapshot("device-local");
    local.settings = {
      ...local.settings,
      weightUnit: "kg",
      lastSyncAt: FIRST_SYNC_AT,
      updatedAt: FIRST_SYNC_AT,
    };
    const remote = clone(local);
    remote.settings = {
      ...remote.settings,
      weightUnit: "lb",
      lastSyncAt: null,
      updatedAt: SECOND_SYNC_AT,
    };
    const conflicts: string[] = [];

    const merged = mergeSnapshots(local, remote, conflicts);

    expect(conflicts).toContain("settings 使用 last-write-wins 合并");
    expect(merged.settings.weightUnit).toBe("lb");
    expect(merged.settings).not.toHaveProperty("webdav");
    expect(merged.settings.lastSyncAt).toBe(FIRST_SYNC_AT);
  });

  it("serializes workout exercise type snapshots into the WebDAV month shard", () => {
    const snapshot = makeEmptySnapshot("device-test");
    snapshot.workouts = [{
      id: "run-1", date: "2026-06-22", startTime: null, endTime: null, planTemplateId: null, note: null, mood: null,
      exercises: [{ id: "run-exercise", exerciseId: "ex-running", exerciseType: "cardio", sortOrder: 0, supersetGroup: null, sets: [{ id: "run-set", setNumber: 1, weight: null, reps: null, unit: "kg", durationSec: 600, distanceM: 1500, rpe: null, isWarmup: false, isFailure: false, restSeconds: null }] }],
      createdAt: FIRST_SYNC_AT, updatedAt: FIRST_SYNC_AT, deletedAt: null, schemaVersion: 1,
    }];

    const files = snapshotToFiles(snapshot);
    expect((files["workouts/2026-06.json"] as DataSnapshot["workouts"])[0].exercises[0]).toMatchObject({ exerciseType: "cardio" });
  });

  it("does not serialize local-only endpoint config into remote files", () => {
    const snapshot = makeEmptySnapshot("device-test") as DataSnapshot & { settings: DataSnapshot["settings"] & { webdav?: unknown; passwordRef?: string; username?: string; url?: string } };
    snapshot.settings.webdav = { url: "https://dav.example.test", username: "athlete", passwordRef: "secret-1" };
    snapshot.settings.passwordRef = "secret-1";
    snapshot.settings.username = "athlete";
    snapshot.settings.url = "https://dav.example.test";
    snapshot.resources["assets/avatar/profile-local.txt"] = "data:image/png;base64,AAA";
    snapshot.profile.avatarUrl = "assets/avatar/profile-local.txt";
    snapshot.manifest.shards = buildShardList(snapshot);

    const files = snapshotToFiles(snapshot);
    const settingsFile = files["settings.json"] as Record<string, unknown>;

    expect(settingsFile).not.toHaveProperty("webdav");
    expect(settingsFile).not.toHaveProperty("passwordRef");
    expect(settingsFile).not.toHaveProperty("username");
    expect(settingsFile).not.toHaveProperty("url");
    expect(settingsFile.themeId).toBe("emerald-slate");
    expect(files["assets/avatar/profile-local.txt"]).toBe("data:image/png;base64,AAA");
    expect(snapshot.manifest.shards.map((shard) => shard.path)).toContain("assets/avatar/profile-local.txt");
  });

  it("creates nested remote parent directories before uploading avatar resources", async () => {
    const snapshot = makeEmptySnapshot("device-test");
    snapshot.profile.avatarUrl = "assets/avatar/profile-local.txt";
    snapshot.resources["assets/avatar/profile-local.txt"] = "data:image/png;base64,AAA";
    snapshot.manifest.shards = buildShardList(snapshot);
    const client = new DirectoryCheckingWebDavClient();

    await pushSnapshot(client as unknown as WebDavClient, snapshot);

    expect(client.mkcols).toEqual(expect.arrayContaining(["", "workouts", "backups", "assets", "assets/avatar"]));
    expect(client.puts.some((path) => path.startsWith("assets/avatar/profile-local.txt.tmp-"))).toBe(true);
    expect(client.moves).toContain("assets/avatar/profile-local.txt");
  });

  it("calculates nested remote parent directories for resource paths", () => {
    expect(remoteParentDirsForPath("assets/avatar/profile-local.txt")).toEqual(["assets", "assets/avatar"]);
    expect(remoteParentDirsForPath("workouts/2026-06.json")).toEqual(["workouts"]);
    expect(remoteParentDirsForPath("settings.json")).toEqual([]);
  });

  it("flattens backup paths so shard names do not create backup subdirectories", () => {
    const path = backupPathFor("2026-06-28T00-00-00-000Z", "assets/avatar/profile-local.txt");

    expect(path).toBe("backups/2026-06-28T00-00-00-000Z-assets-avatar-profile-local.txt");
    expect(path.split("/")).toHaveLength(2);
  });

  it("sanitizes settings backups while preserving normal shard upload", async () => {
    const snapshot = makeEmptySnapshot("device-test");
    const client = new DirectoryCheckingWebDavClient({
      "manifest.json": {
        app: "ironlog",
        schemaVersion: 1,
        deviceId: "remote-device",
        updatedAt: FIRST_SYNC_AT,
        shards: [{ path: "settings.json", updatedAt: FIRST_SYNC_AT }],
      },
      "settings.json": {
        ...snapshot.settings,
        webdav: { url: "https://dav.example.test", username: "athlete", passwordRef: "secret-1" },
        url: "https://dav.example.test",
        username: "athlete",
        passwordRef: "secret-1",
        password: "plain",
      },
    });

    await pushSnapshot(client as unknown as WebDavClient, snapshot);

    const backupPath = client.puts.find((path) => path.startsWith("backups/") && path.endsWith("-settings.json"));
    expect(backupPath).toBeTruthy();
    const backupBody = client.putBodies[String(backupPath)];
    expect(backupBody).toContain("\"themeId\"");
    expect(backupBody).not.toContain("webdav");
    expect(backupBody).not.toContain("passwordRef");
    expect(backupBody).not.toContain("plain");
    expect(client.putBodies["settings.json.tmp-"]).toBeUndefined();
  });

  it("serializes deleted exercise redirects without changing workout historical IDs or type snapshots", () => {
    const snapshot = makeEmptySnapshot("device-test");
    snapshot.exercises.push({ id: "custom-ex-old", name: "旧动作", category: "core", type: "reps_only", description: null, primaryMuscleGroupIds: ["core"], secondaryMuscleGroupIds: [], isCustom: true, replacedByExerciseId: "ex-plank", createdAt: FIRST_SYNC_AT, updatedAt: SECOND_SYNC_AT, deletedAt: SECOND_SYNC_AT, schemaVersion: 1 });
    snapshot.workouts = [{ id: "history-1", date: "2026-06-22", startTime: null, endTime: null, planTemplateId: null, note: null, mood: null, exercises: [{ id: "history-exercise", exerciseId: "custom-ex-old", exerciseType: "reps_only", sortOrder: 0, supersetGroup: null, sets: [] }], createdAt: FIRST_SYNC_AT, updatedAt: SECOND_SYNC_AT, deletedAt: null, schemaVersion: 1 }];
    const files = snapshotToFiles(snapshot);
    expect((files["exercises.json"] as DataSnapshot["exercises"]).find((exercise) => exercise.id === "custom-ex-old")).toMatchObject({ deletedAt: SECOND_SYNC_AT, replacedByExerciseId: "ex-plank", primaryMuscleGroupIds: ["core"], secondaryMuscleGroupIds: [] });
    expect((files["workouts/2026-06.json"] as DataSnapshot["workouts"])[0].exercises[0]).toMatchObject({ exerciseId: "custom-ex-old", exerciseType: "reps_only" });
  });
});

function memoryStore(initial: DataSnapshot): DocumentStore {
  let snapshot = clone(initial);
  let endpoint: SyncEndpointConfig = { url: "", username: "", passwordRef: null };
  return {
    load: async () => clone(snapshot),
    save: async (next) => {
      snapshot = clone(next);
    },
    readSecret: async () => null,
    writeSecret: async () => undefined,
    removeSecret: async () => undefined,
    readSyncEndpoint: async () => endpoint,
    writeSyncEndpoint: async (config) => {
      endpoint = config;
    },
    clearSyncEndpoint: async () => {
      endpoint = { url: "", username: "", passwordRef: null };
    },
    exportFiles: () => ({}),
    importFiles: () => ({}),
  };
}

class DirectoryCheckingWebDavClient {
  readonly mkcols: string[] = [];
  readonly puts: string[] = [];
  readonly moves: string[] = [];
  readonly putBodies: Record<string, string> = {};
  private readonly dirs = new Set<string>();

  constructor(private readonly remoteFiles: Record<string, unknown> = {}) {}

  async mkcol(path: string): Promise<void> {
    this.mkcols.push(path);
    this.dirs.add(path);
  }

  async get(path: string): Promise<WebDavResponse> {
    if (!(path in this.remoteFiles)) return response(404);
    const value = this.remoteFiles[path];
    return response(200, typeof value === "string" ? value : JSON.stringify(value));
  }

  async put(path: string, body = ""): Promise<WebDavResponse> {
    const parent = lastParentDir(path);
    if (!this.dirs.has(parent)) return response(409);
    this.puts.push(path);
    this.putBodies[path] = body;
    return response(201);
  }

  async move(_from: string, to: string): Promise<WebDavResponse> {
    const parent = lastParentDir(to);
    if (!this.dirs.has(parent)) return response(409);
    this.moves.push(to);
    return response(201);
  }

  async delete(): Promise<WebDavResponse> {
    return response(404);
  }
}

function response(status: number, body = ""): WebDavResponse {
  return { status, body, headers: {} };
}

function lastParentDir(path: string): string {
  const dirs = remoteParentDirsForPath(path);
  return dirs[dirs.length - 1] || "";
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

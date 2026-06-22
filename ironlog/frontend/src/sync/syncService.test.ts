import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { makeEmptySnapshot } from "@/core/migrations";
import type { DataSnapshot } from "@/core/models";
import type { DocumentStore } from "@/platform/documentStore";
import { LocalJsonRepository } from "@/repositories/localJsonRepository";
import { mergeSnapshots, snapshotToFiles } from "./syncService";

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
      webdav: { url: "https://dav.example.test", username: "athlete", passwordRef: "local-secret" },
      updatedAt: FIRST_SYNC_AT,
    };
    const repository = new LocalJsonRepository(Promise.resolve(memoryStore(initial)));
    const firstUploaded = clone(await repository.getSnapshot());

    await repository.updateLastSyncAt(SECOND_SYNC_AT);
    await repository.updateSettings({
      weightUnit: firstUploaded.settings.weightUnit,
      webdav: firstUploaded.settings.webdav,
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
    expect(settingsFile.webdav.passwordRef).toBeNull();
  });

  it("keeps last-write-wins and records a conflict for real user settings changes", () => {
    const local = makeEmptySnapshot("device-local");
    local.settings = {
      ...local.settings,
      weightUnit: "kg",
      webdav: { url: "https://local.example.test", username: "local-user", passwordRef: "local-secret" },
      lastSyncAt: FIRST_SYNC_AT,
      updatedAt: FIRST_SYNC_AT,
    };
    const remote = clone(local);
    remote.settings = {
      ...remote.settings,
      weightUnit: "lb",
      webdav: { url: "https://remote.example.test", username: "remote-user", passwordRef: null },
      lastSyncAt: null,
      updatedAt: SECOND_SYNC_AT,
    };
    const conflicts: string[] = [];

    const merged = mergeSnapshots(local, remote, conflicts);

    expect(conflicts).toContain("settings 使用 last-write-wins 合并");
    expect(merged.settings.weightUnit).toBe("lb");
    expect(merged.settings.webdav).toEqual({
      url: "https://remote.example.test",
      username: "remote-user",
      passwordRef: "local-secret",
    });
    expect(merged.settings.lastSyncAt).toBe(FIRST_SYNC_AT);
  });

  it("serializes workout exercise type snapshots into the WebDAV month shard", () => {
    const snapshot = makeEmptySnapshot("device-test");
    snapshot.workouts = [{
      id: "run-1", date: "2026-06-22", startTime: null, endTime: null, planTemplateId: null, note: null, mood: null,
      exercises: [{ id: "run-exercise", exerciseId: "ex-running", exerciseType: "cardio", sortOrder: 0, supersetGroup: null, sets: [{ id: "run-set", setNumber: 1, weight: null, reps: null, unit: "kg", durationSec: 600, distanceM: 1500, rpe: null, isWarmup: false, isDropset: false, isFailure: false, restSeconds: null }] }],
      createdAt: FIRST_SYNC_AT, updatedAt: FIRST_SYNC_AT, deletedAt: null, schemaVersion: 1,
    }];

    const files = snapshotToFiles(snapshot);
    expect((files["workouts/2026-06.json"] as DataSnapshot["workouts"])[0].exercises[0]).toMatchObject({ exerciseType: "cardio" });
  });

  it("serializes deleted exercise redirects without changing workout historical IDs or type snapshots", () => {
    const snapshot = makeEmptySnapshot("device-test");
    snapshot.exercises.push({ id: "custom-ex-old", name: "旧动作", category: "core", type: "reps_only", description: null, metValue: null, isCustom: true, replacedByExerciseId: "ex-plank", createdAt: FIRST_SYNC_AT, updatedAt: SECOND_SYNC_AT, deletedAt: SECOND_SYNC_AT, schemaVersion: 1 });
    snapshot.workouts = [{ id: "history-1", date: "2026-06-22", startTime: null, endTime: null, planTemplateId: null, note: null, mood: null, exercises: [{ id: "history-exercise", exerciseId: "custom-ex-old", exerciseType: "reps_only", sortOrder: 0, supersetGroup: null, sets: [] }], createdAt: FIRST_SYNC_AT, updatedAt: SECOND_SYNC_AT, deletedAt: null, schemaVersion: 1 }];
    const files = snapshotToFiles(snapshot);
    expect((files["exercises.json"] as DataSnapshot["exercises"]).find((exercise) => exercise.id === "custom-ex-old")).toMatchObject({ deletedAt: SECOND_SYNC_AT, replacedByExerciseId: "ex-plank" });
    expect((files["workouts/2026-06.json"] as DataSnapshot["workouts"])[0].exercises[0]).toMatchObject({ exerciseId: "custom-ex-old", exerciseType: "reps_only" });
  });
});

function memoryStore(initial: DataSnapshot): DocumentStore {
  let snapshot = clone(initial);
  return {
    load: async () => clone(snapshot),
    save: async (next) => {
      snapshot = clone(next);
    },
    readSecret: async () => null,
    writeSecret: async () => undefined,
    removeSecret: async () => undefined,
    exportFiles: () => ({}),
    importFiles: () => ({}),
  };
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

import { beforeEach, describe, expect, it, vi } from "vitest";
import { makeEmptySnapshot } from "@/core/migrations";
import type { DataSnapshot } from "@/core/models";
import type { DocumentStore } from "@/platform/documentStore";
import { LocalJsonRepository } from "./localJsonRepository";

describe("workout aggregate persistence", () => {
  beforeEach(() => {
    vi.stubGlobal("localStorage", { getItem: () => "device-test", setItem: () => undefined });
  });

  it("keeps nested IDs on an unchanged update and gives only additions new IDs", async () => {
    const repository = new LocalJsonRepository(Promise.resolve(memoryStore(makeEmptySnapshot("device-test"))));
    const created = await repository.createWorkout({
      date: "2026-06-22", startTime: null, endTime: null, planTemplateId: null, note: null, mood: null,
      exercises: [{ id: "", exerciseId: "ex-bench-press", exerciseType: "strength", sortOrder: 0, supersetGroup: null, sets: [set(1)] }],
    });
    const stable = await repository.updateWorkout(created.id, { exercises: created.exercises });
    expect(stable.exercises[0].id).toBe(created.exercises[0].id);
    expect(stable.exercises[0].sets[0].id).toBe(created.exercises[0].sets[0].id);

    const expanded = await repository.updateWorkout(created.id, {
      exercises: [{ ...stable.exercises[0], sets: [...stable.exercises[0].sets, set(2)] }],
    });
    expect(expanded.exercises[0].id).toBe(created.exercises[0].id);
    expect(expanded.exercises[0].sets[0].id).toBe(created.exercises[0].sets[0].id);
    expect(expanded.exercises[0].sets[1].id).not.toBe(created.exercises[0].sets[0].id);
  });

  it("keeps template exercise IDs when saving an unchanged template exercise list", async () => {
    const repository = new LocalJsonRepository(Promise.resolve(memoryStore(makeEmptySnapshot("device-test"))));
    const plan = await repository.createPlan({ name: "计划", description: null, color: "#10B981", mode: "weekly", cycleLength: null, isActive: true });
    const created = await repository.createTemplate({
      planId: plan.id,
      name: "模板",
      sortOrder: 0,
      color: null,
      scheduleRule: null,
      exercises: [{ id: "", exerciseId: "ex-bench-press", sortOrder: 0, note: "4x8" }],
    });

    const renamed = await repository.updateTemplate(created.id, {
      name: "模板改名",
      exercises: created.exercises,
    });

    expect(renamed.exercises[0].id).toBe(created.exercises[0].id);
  });

  it("finds the most recently updated unfinished workout as the draft", async () => {
    const repository = new LocalJsonRepository(Promise.resolve(memoryStore(makeEmptySnapshot("device-test"))));
    const first = await repository.createWorkout({ date: "2026-06-20", startTime: null, endTime: null, planTemplateId: null, note: null, mood: null, exercises: [] });
    const second = await repository.createWorkout({ date: "2026-06-21", startTime: null, endTime: null, planTemplateId: null, note: null, mood: null, exercises: [] });
    await repository.updateWorkout(first.id, { note: "newer" });
    expect((await repository.getLatestWorkoutDraft())?.id).toBe(first.id);
    await repository.updateWorkout(first.id, { endTime: "2026-06-22T01:00:00.000Z" });
    expect((await repository.getLatestWorkoutDraft())?.id).toBe(second.id);
  });

  it("creates custom IDs, keeps them stable on edit, and atomically migrates active template references", async () => {
    const initial = makeEmptySnapshot("device-test");
    initial.templates.push({ id: "template-1", planId: "plan-1", name: "模板", sortOrder: 0, color: null, scheduleRule: null, exercises: [{ id: "te-1", exerciseId: "custom-ex-source", sortOrder: 0, note: null }], createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z", deletedAt: null, schemaVersion: 1 });
    initial.exercises.push({ id: "custom-ex-source", name: "源动作", category: "core", type: "reps_only", description: null, primaryMuscleGroupIds: [], secondaryMuscleGroupIds: [], isCustom: true, replacedByExerciseId: null, createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z", deletedAt: null, schemaVersion: 1 });
    const repository = new LocalJsonRepository(Promise.resolve(memoryStore(initial)));
    const created = await repository.create({ name: "新动作", category: "core", type: "strength", description: null });
    expect(created.id).toMatch(/^custom-ex-/);
    expect(created).toMatchObject({ primaryMuscleGroupIds: [], secondaryMuscleGroupIds: [] });
    const edited = await repository.updateExercise(created.id, { name: "已编辑" });
    expect(edited.id).toBe(created.id);
    await repository.deleteExercise("custom-ex-source", "ex-cat-cow-stretch");
    const snapshot = await repository.getSnapshot();
    expect(snapshot.exercises.find((exercise) => exercise.id === "custom-ex-source")).toMatchObject({ deletedAt: expect.any(String), replacedByExerciseId: "ex-cat-cow-stretch" });
    expect(snapshot.templates[0].exercises[0].exerciseId).toBe("ex-cat-cow-stretch");
  });

  it("tombstones a custom exercise without rewriting template references when no replacement is selected", async () => {
    const repository = new LocalJsonRepository(Promise.resolve(memoryStore(makeEmptySnapshot("device-test"))));
    const created = await repository.create({ name: "临时动作", category: "core", type: "reps_only", description: null });
    await repository.deleteExercise(created.id, null);
    expect((await repository.getSnapshot()).exercises.find((exercise) => exercise.id === created.id)).toMatchObject({ deletedAt: expect.any(String), replacedByExerciseId: null });
  });

  it("rejects replacement exercises with a different record type", async () => {
    const repository = new LocalJsonRepository(Promise.resolve(memoryStore(makeEmptySnapshot("device-test"))));
    const created = await repository.create({ name: "临时力量动作", category: "core", type: "strength", description: null });

    await expect(repository.deleteExercise(created.id, "ex-running")).rejects.toThrow("替代动作必须与原动作记录类型一致");
  });

  it("does not clear custom exercise description when an edit omits description", async () => {
    const repository = new LocalJsonRepository(Promise.resolve(memoryStore(makeEmptySnapshot("device-test"))));
    const created = await repository.create({ name: "说明动作", category: "core", type: "strength", description: "保留这段说明" });

    const edited = await repository.updateExercise(created.id, { name: "改名动作", category: "core", type: "strength" });

    expect(edited.description).toBe("保留这段说明");
  });

  it("stores and clears WebDAV endpoint config outside the snapshot", async () => {
    const store = memoryStore(makeEmptySnapshot("device-test"));
    const repository = new LocalJsonRepository(Promise.resolve(store));

    await repository.writeSecret("secret-1", "pass");
    await repository.updateSyncEndpoint({ url: " https://dav.example.test ", username: " athlete ", passwordRef: "secret-1" });

    expect(await repository.getSyncEndpoint()).toEqual({ url: "https://dav.example.test", username: "athlete", passwordRef: "secret-1" });
    expect(await repository.readSecret("secret-1")).toBe("pass");
    expect((await repository.getSnapshot()).settings).not.toHaveProperty("webdav");

    await repository.removeSecret("secret-1");
    await repository.clearSyncEndpoint();

    expect(await repository.getSyncEndpoint()).toEqual({ url: "", username: "", passwordRef: null });
    expect(await repository.readSecret("secret-1")).toBeNull();
  });

  it("saves and removes avatar resources without clearing profile fields", async () => {
    const repository = new LocalJsonRepository(Promise.resolve(memoryStore(makeEmptySnapshot("device-test"))));
    await repository.updateProfile({ nickname: "保留昵称" });
    await repository.writeResource("assets/avatar/profile-local.txt", "data:image/png;base64,AAA");
    await repository.updateProfile({ avatarUrl: "assets/avatar/profile-local.txt" });

    expect(await repository.readResource("assets/avatar/profile-local.txt")).toBe("data:image/png;base64,AAA");
    expect((await repository.getProfile()).nickname).toBe("保留昵称");
    expect((await repository.getSnapshot()).manifest.shards.map((shard) => shard.path)).toContain("assets/avatar/profile-local.txt");

    await repository.removeResource("assets/avatar/profile-local.txt");
    await repository.updateProfile({ avatarUrl: null });

    expect(await repository.readResource("assets/avatar/profile-local.txt")).toBeNull();
    expect((await repository.getProfile()).nickname).toBe("保留昵称");
  });

  it("persists body metrics, timeline notes, and performance records through snapshot shards", async () => {
    const repository = new LocalJsonRepository(Promise.resolve(memoryStore(makeEmptySnapshot("device-test"))));
    const metric = await repository.createBodyMetric({
      recordedAt: "2026-06-20T08:00:00.000Z",
      heightCm: 180,
      weightKg: null,
      bodyFatPercent: null,
      measurementsCm: {
        neck: null, shoulder: null, chest: null, waist: null, hip: null,
        upperArmLeft: null, upperArmRight: null, forearmLeft: null, forearmRight: null,
        thighLeft: null, thighRight: null, calfLeft: null, calfRight: null,
      },
      note: null,
    });
    const note = await repository.createTimelineNote({
      content: "换了训练环境",
      rangeType: "single_day",
      startDate: "2026-06-20",
      endDate: "2026-06-20",
      workoutId: null,
    });
    await repository.replaceExercisePerformanceRecords({ all: true }, [{
      id: "performance:strength.max_weight:workout-1:workout-exercise-1:set-1:true_pr",
      exerciseId: "ex-bench-press",
      kind: "true_pr",
      metricType: "strength.max_weight",
      value: 100,
      unit: "kg",
      achievedAt: "2026-06-20T10:00:00.000Z",
      sourceWorkoutId: "workout-1",
      sourceWorkoutExerciseId: "workout-exercise-1",
      sourceSetId: "set-1",
      input: { weightKg: 100, reps: 5, rpe: null, effectiveReps: null, distanceM: null, durationSec: null, workoutVolumeKgReps: null },
      rm: null,
      createdAt: "2026-06-20T10:00:00.000Z",
      updatedAt: "2026-06-20T10:00:00.000Z",
      deletedAt: null,
      schemaVersion: 2,
    }]);

    const snapshot = await repository.getSnapshot();

    expect(snapshot.bodyMetrics).toContainEqual(metric);
    expect(snapshot.timelineNotes).toContainEqual(note);
    expect(snapshot.exercisePerformanceRecords).toHaveLength(1);
    expect(snapshot.manifest.shards.map((shard) => shard.path)).toEqual(expect.arrayContaining([
      "body-metrics.json",
      "timeline-notes.json",
      "exercise-performance/2026-06.json",
    ]));
  });

  it("tombstones stale performance records when a scoped replacement no longer emits them", async () => {
    const repository = new LocalJsonRepository(Promise.resolve(memoryStore(makeEmptySnapshot("device-test"))));
    await repository.replaceExercisePerformanceRecords({ all: true }, [{
      id: "performance-1",
      exerciseId: "ex-bench-press",
      kind: "true_pr",
      metricType: "strength.max_weight",
      value: 100,
      unit: "kg",
      achievedAt: "2026-06-20T10:00:00.000Z",
      sourceWorkoutId: "workout-1",
      sourceWorkoutExerciseId: "workout-exercise-1",
      sourceSetId: "set-1",
      input: { weightKg: 100, reps: 5, rpe: null, effectiveReps: null, distanceM: null, durationSec: null, workoutVolumeKgReps: null },
      rm: null,
      createdAt: "2026-06-20T10:00:00.000Z",
      updatedAt: "2026-06-20T10:00:00.000Z",
      deletedAt: null,
      schemaVersion: 2,
    }]);

    await repository.replaceExercisePerformanceRecords({ sourceWorkoutIds: ["workout-1"] }, []);

    const records = await repository.listExercisePerformanceRecords({ includeDeleted: true });
    expect(records[0]).toMatchObject({ id: "performance-1", deletedAt: expect.any(String) });
  });
});

function set(setNumber: number) {
  return { id: "", setNumber, weight: 50, reps: 8, unit: "kg" as const, durationSec: null, distanceM: null, rpe: null, isWarmup: false, isFailure: false, restSeconds: null };
}

function memoryStore(initial: DataSnapshot): DocumentStore {
  let snapshot = JSON.parse(JSON.stringify(initial)) as DataSnapshot;
  let endpoint = { url: "", username: "", passwordRef: null as string | null };
  const secrets = new Map<string, string>();
  return {
    load: async () => JSON.parse(JSON.stringify(snapshot)) as DataSnapshot,
    save: async (next) => { snapshot = JSON.parse(JSON.stringify(next)) as DataSnapshot; },
    readSecret: async (key) => secrets.get(key) ?? null,
    writeSecret: async (key, value) => { secrets.set(key, value); },
    removeSecret: async (key) => { secrets.delete(key); },
    readSyncEndpoint: async () => endpoint,
    writeSyncEndpoint: async (config) => { endpoint = config; },
    clearSyncEndpoint: async () => { endpoint = { url: "", username: "", passwordRef: null }; },
    exportFiles: () => ({}), importFiles: () => ({}),
  };
}

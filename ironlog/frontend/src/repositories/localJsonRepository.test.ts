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
    initial.exercises.push({ id: "custom-ex-source", name: "源动作", category: "core", type: "reps_only", description: null, metValue: null, isCustom: true, replacedByExerciseId: null, createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z", deletedAt: null, schemaVersion: 1 });
    const repository = new LocalJsonRepository(Promise.resolve(memoryStore(initial)));
    const created = await repository.create({ name: "新动作", category: "core", type: "strength", description: null });
    expect(created.id).toMatch(/^custom-ex-/);
    const edited = await repository.updateExercise(created.id, { name: "已编辑" });
    expect(edited.id).toBe(created.id);
    await repository.deleteExercise("custom-ex-source", "ex-plank");
    const snapshot = await repository.getSnapshot();
    expect(snapshot.exercises.find((exercise) => exercise.id === "custom-ex-source")).toMatchObject({ deletedAt: expect.any(String), replacedByExerciseId: "ex-plank" });
    expect(snapshot.templates[0].exercises[0].exerciseId).toBe("ex-plank");
  });

  it("tombstones a custom exercise without rewriting template references when no replacement is selected", async () => {
    const repository = new LocalJsonRepository(Promise.resolve(memoryStore(makeEmptySnapshot("device-test"))));
    const created = await repository.create({ name: "临时动作", category: "core", type: "reps_only", description: null });
    await repository.deleteExercise(created.id, null);
    expect((await repository.getSnapshot()).exercises.find((exercise) => exercise.id === created.id)).toMatchObject({ deletedAt: expect.any(String), replacedByExerciseId: null });
  });
});

function set(setNumber: number) {
  return { id: "", setNumber, weight: 50, reps: 8, unit: "kg" as const, durationSec: null, distanceM: null, rpe: null, isWarmup: false, isDropset: false, isFailure: false, restSeconds: null };
}

function memoryStore(initial: DataSnapshot): DocumentStore {
  let snapshot = JSON.parse(JSON.stringify(initial)) as DataSnapshot;
  return {
    load: async () => JSON.parse(JSON.stringify(snapshot)) as DataSnapshot,
    save: async (next) => { snapshot = JSON.parse(JSON.stringify(next)) as DataSnapshot; },
    readSecret: async () => null, writeSecret: async () => undefined, removeSecret: async () => undefined,
    exportFiles: () => ({}), importFiles: () => ({}),
  };
}

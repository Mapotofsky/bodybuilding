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

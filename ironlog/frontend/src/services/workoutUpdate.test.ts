import { beforeEach, describe, expect, it, vi } from "vitest";
import { makeEmptySnapshot } from "@/core/migrations";
import type { WorkoutDoc } from "@/core/models";

const repository = vi.hoisted(() => ({
  getWorkout: vi.fn(),
  updateWorkout: vi.fn(),
  get: vi.fn(),
  getTemplate: vi.fn(),
  getPlan: vi.fn(),
  getSnapshot: vi.fn(),
}));

vi.mock("@/repositories/localJsonRepository", () => ({
  localRepository: repository,
}));

import { updateWorkout } from "./workout";

describe("updateWorkout merge semantics", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const snapshot = makeEmptySnapshot("device-test");
    repository.getSnapshot.mockResolvedValue(snapshot);
    repository.get.mockImplementation(async (id: string) => snapshot.exercises.find((exercise) => exercise.id === id) ?? null);
    repository.getTemplate.mockResolvedValue(null);
    repository.getPlan.mockResolvedValue(null);
  });

  it("keeps untouched header fields and reserved supersetGroup when updating other fields", async () => {
    const existing = workoutDoc({ planTemplateId: "template-old", note: "保留备注", mood: 4, supersetGroup: 7 });
    repository.getWorkout.mockResolvedValue(existing);
    repository.updateWorkout.mockImplementation(async (_id: string, update: Partial<WorkoutDoc>) => ({
      ...existing,
      ...update,
      updatedAt: "2026-06-22T11:00:00.000Z",
    }));

    await updateWorkout(existing.id, { date: "2026-06-23" });

    expect(repository.updateWorkout).toHaveBeenCalledWith(existing.id, expect.objectContaining({
      date: "2026-06-23",
      planTemplateId: "template-old",
      note: "保留备注",
      mood: 4,
    }));
    const saved = repository.updateWorkout.mock.calls[0][1] as Partial<WorkoutDoc>;
    expect(saved.exercises?.[0].supersetGroup).toBe(7);
  });

  it("uses null as an explicit clear signal for nullable workout fields", async () => {
    const existing = workoutDoc({ planTemplateId: "template-old", note: "保留备注", mood: 4, supersetGroup: 7 });
    repository.getWorkout.mockResolvedValue(existing);
    repository.updateWorkout.mockImplementation(async (_id: string, update: Partial<WorkoutDoc>) => ({
      ...existing,
      ...update,
      updatedAt: "2026-06-22T11:00:00.000Z",
    }));

    await updateWorkout(existing.id, { plan_template_id: null, note: null, mood: null });

    expect(repository.updateWorkout).toHaveBeenCalledWith(existing.id, expect.objectContaining({
      planTemplateId: null,
      note: null,
      mood: null,
    }));
    const saved = repository.updateWorkout.mock.calls[0][1] as Partial<WorkoutDoc>;
    expect(saved.exercises?.[0].supersetGroup).toBe(7);
  });
});

function workoutDoc(options: { planTemplateId: string | null; note: string | null; mood: number | null; supersetGroup: number | null }): WorkoutDoc {
  return {
    id: "workout-1",
    date: "2026-06-22",
    startTime: "2026-06-22T10:00:00.000Z",
    endTime: null,
    planTemplateId: options.planTemplateId,
    note: options.note,
    mood: options.mood,
    exercises: [{
      id: "workout-exercise-1",
      exerciseId: "ex-bench-press",
      exerciseType: "strength",
      sortOrder: 0,
      supersetGroup: options.supersetGroup,
      sets: [{
        id: "workout-set-1",
        setNumber: 1,
        weight: 80,
        reps: 5,
        unit: "kg",
        durationSec: null,
        distanceM: null,
        rpe: 8,
        isWarmup: false,
        isFailure: false,
        restSeconds: 120,
      }],
    }],
    createdAt: "2026-06-22T10:00:00.000Z",
    updatedAt: "2026-06-22T10:30:00.000Z",
    deletedAt: null,
    schemaVersion: 1,
  };
}

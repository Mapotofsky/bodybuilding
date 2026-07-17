import { beforeEach, describe, expect, it, vi } from "vitest";
import { makeEmptySnapshot } from "@/core/migrations";
import type { WorkoutDoc } from "@/core/models";

const repository = vi.hoisted(() => ({
  getWorkout: vi.fn(),
  createWorkout: vi.fn(),
  updateWorkout: vi.fn(),
  get: vi.fn(),
  getTemplate: vi.fn(),
  getPlan: vi.fn(),
  getSnapshot: vi.fn(),
}));

vi.mock("@/repositories/localJsonRepository", () => ({
  localRepository: repository,
}));

import { copyWorkout, updateWorkout } from "./workout";

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

  it("merges partial aggregate edits by nested IDs and preserves snapshots and unseen fields", async () => {
    const existing = workoutDoc({ planTemplateId: null, note: null, mood: null, supersetGroup: 7 });
    Object.assign(existing.exercises[0], { importedMarker: "keep-exercise" });
    Object.assign(existing.exercises[0].sets[0], { reservedValue: "keep-set" });
    repository.getWorkout.mockResolvedValue(existing);
    repository.updateWorkout.mockImplementation(async (_id: string, update: Partial<WorkoutDoc>) => ({
      ...existing,
      ...update,
      updatedAt: "2026-06-22T11:00:00.000Z",
    }));

    await updateWorkout(existing.id, {
      exercises: [{
        id: "workout-exercise-1",
        exercise_id: "ex-bench-press",
        sort_order: 0,
        sets: [{ id: "workout-set-1", set_number: 1, weight: 90 }],
      }],
    });

    const saved = repository.updateWorkout.mock.calls[0][1] as Partial<WorkoutDoc>;
    expect(saved.exercises?.[0]).toMatchObject({
      id: "workout-exercise-1",
      recordingMode: "weight_reps",
      loadBasis: "total",
      countBasis: "whole_set",
      loadDirection: "higher_better",
      rateMetric: "none",
      supersetGroup: 7,
      importedMarker: "keep-exercise",
    });
    expect(saved.exercises?.[0].sets[0]).toMatchObject({
      id: "workout-set-1",
      weight: 90,
      reps: 5,
      rpe: 8,
      restSeconds: 120,
      reservedValue: "keep-set",
    });
  });

  it("rejects attempts to reinterpret an existing nested exercise snapshot", async () => {
    const existing = workoutDoc({ planTemplateId: null, note: null, mood: null, supersetGroup: null });
    repository.getWorkout.mockResolvedValue(existing);

    await expect(updateWorkout(existing.id, {
      exercises: [{
        id: "workout-exercise-1",
        exercise_id: "ex-bench-press",
        recording_mode: "weight_reps",
        load_basis: "per_hand",
        count_basis: "per_side",
        load_direction: "higher_better",
        rate_metric: "none",
        sort_order: 0,
        sets: [{ id: "workout-set-1", set_number: 1, weight: 80, reps: 5 }],
      }],
    })).rejects.toThrow("记录方式快照不可修改");
    expect(repository.updateWorkout).not.toHaveBeenCalled();
  });

  it("copies recording snapshots and set metadata while assigning new nested IDs", async () => {
    const existing = workoutDoc({ planTemplateId: "template-farmer", note: "保留备注", mood: 5, supersetGroup: 3 });
    existing.exercises[0] = {
      ...existing.exercises[0],
      exerciseId: "ex-farmer-walk",
      recordingMode: "weight_distance_duration",
      loadBasis: "per_hand",
      countBasis: "whole_set",
      loadDirection: "higher_better",
      rateMetric: "load_distance_per_time",
      sets: [{
        ...existing.exercises[0].sets[0],
        weight: 32,
        reps: null,
        distanceM: 40,
        durationSec: 28,
        restSeconds: 90,
      }],
    };
    repository.getWorkout.mockResolvedValue(existing);
    repository.createWorkout.mockImplementation(async (input: Omit<WorkoutDoc, "id" | "createdAt" | "updatedAt" | "deletedAt" | "schemaVersion">) => ({
      ...input,
      id: "workout-copy",
      exercises: input.exercises.map((exercise) => ({
        ...exercise,
        id: "workout-exercise-copy",
        sets: exercise.sets.map((set) => ({ ...set, id: "workout-set-copy" })),
      })),
      createdAt: "2026-06-24T10:00:00.000Z",
      updatedAt: "2026-06-24T10:00:00.000Z",
      deletedAt: null,
      schemaVersion: 5,
    }));

    const copied = await copyWorkout(existing.id, "2026-06-24");

    expect(repository.createWorkout).toHaveBeenCalledWith(expect.objectContaining({
      date: "2026-06-24",
      startTime: null,
      endTime: null,
      planTemplateId: "template-farmer",
      exercises: [expect.objectContaining({
        id: "",
        exerciseId: "ex-farmer-walk",
        recordingMode: "weight_distance_duration",
        loadBasis: "per_hand",
        countBasis: "whole_set",
        loadDirection: "higher_better",
        rateMetric: "load_distance_per_time",
        supersetGroup: 3,
        sets: [expect.objectContaining({ id: "", weight: 32, distanceM: 40, durationSec: 28, restSeconds: 90 })],
      })],
    }));
    expect(copied.exercises[0]).toMatchObject({
      id: "workout-exercise-copy",
      recording_mode: "weight_distance_duration",
      load_basis: "per_hand",
      count_basis: "whole_set",
      load_direction: "higher_better",
      rate_metric: "load_distance_per_time",
      superset_group: 3,
    });
    expect(copied.exercises[0].sets[0]).toMatchObject({ id: "workout-set-copy", rest_seconds: 90 });
    expect(existing.exercises[0].id).toBe("workout-exercise-1");
    expect(existing.exercises[0].sets[0].id).toBe("workout-set-1");
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
      recordingMode: "weight_reps",
      loadBasis: "total",
      countBasis: "whole_set",
      loadDirection: "higher_better",
      rateMetric: "none",
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
    schemaVersion: 5,
  };
}

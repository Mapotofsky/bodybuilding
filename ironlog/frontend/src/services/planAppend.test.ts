import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TemplateDoc } from "@/core/models";

const template: TemplateDoc = {
  id: "template-1",
  planId: "plan-1",
  name: "模板",
  sortOrder: 0,
  color: null,
  scheduleRule: null,
  exercises: [{ id: "te-1", exerciseId: "ex-bench-press", sortOrder: 0, note: null }],
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  deletedAt: null,
  schemaVersion: 3,
};

const localRepository = vi.hoisted(() => ({
  getTemplate: vi.fn(),
  updateTemplate: vi.fn(),
  getSnapshot: vi.fn(),
}));

vi.mock("@/repositories/localJsonRepository", () => ({ localRepository }));

describe("appendExerciseToTemplate", () => {
  beforeEach(() => {
    localRepository.getTemplate.mockReset();
    localRepository.updateTemplate.mockReset();
    localRepository.getSnapshot.mockReset();
    localRepository.getSnapshot.mockResolvedValue({
      exercises: [
        { id: "ex-bench-press", name: "卧推", category: "chest", deletedAt: null },
        { id: "custom-ex-row", name: "划船", category: "back", deletedAt: null },
      ],
    });
  });

  it("appends a new exercise while preserving existing template exercise ids", async () => {
    localRepository.getTemplate.mockResolvedValue(template);
    localRepository.updateTemplate.mockImplementation(async (_id, body) => ({ ...template, ...body }));
    const { appendExerciseToTemplate } = await import("./plan");

    const updated = await appendExerciseToTemplate("template-1", "custom-ex-row");

    expect(localRepository.updateTemplate).toHaveBeenCalledWith("template-1", {
      exercises: [
        { id: "te-1", exerciseId: "ex-bench-press", sortOrder: 0, note: null },
        { id: "", exerciseId: "custom-ex-row", sortOrder: 1, note: null },
      ],
    });
    expect(updated.exercises[0].id).toBe("te-1");
  });

  it("is idempotent when the exercise already exists", async () => {
    localRepository.getTemplate.mockResolvedValue(template);
    const { appendExerciseToTemplate } = await import("./plan");

    await appendExerciseToTemplate("template-1", "ex-bench-press");

    expect(localRepository.updateTemplate).not.toHaveBeenCalled();
  });
});

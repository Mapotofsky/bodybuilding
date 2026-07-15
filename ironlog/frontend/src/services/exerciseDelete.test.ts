import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  deleteExercise: vi.fn(async () => undefined),
  rebuild: vi.fn(async () => undefined),
}));

vi.mock("@/repositories/localJsonRepository", () => ({
  localRepository: { deleteExercise: mocks.deleteExercise },
}));

vi.mock("@/services/performance", () => ({
  rebuildAllPerformanceRecords: mocks.rebuild,
}));

import { deleteExercise } from "./exercise";

describe("exercise deletion performance refresh", () => {
  it.each(["ex-target", null])("rebuilds performance immediately after deletion with replacement=%s", async (replacement) => {
    mocks.deleteExercise.mockClear();
    mocks.rebuild.mockClear();

    await deleteExercise("custom-ex-source", replacement);

    expect(mocks.deleteExercise).toHaveBeenCalledWith("custom-ex-source", replacement);
    expect(mocks.rebuild).toHaveBeenCalledOnce();
    expect(mocks.deleteExercise.mock.invocationCallOrder[0]).toBeLessThan(mocks.rebuild.mock.invocationCallOrder[0]);
  });
});

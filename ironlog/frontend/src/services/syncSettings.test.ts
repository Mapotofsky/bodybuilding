import { beforeEach, describe, expect, it, vi } from "vitest";

const repository = vi.hoisted(() => ({
  endpoint: { url: "https://dav.example.test", username: "athlete", passwordRef: "secret-ref" as string | null },
  snapshot: { workouts: [{ id: "workout-1" }], exercises: [{ id: "exercise-1" }] },
  readSecret: vi.fn(),
  writeSecret: vi.fn(),
  removeSecret: vi.fn(),
  getSyncEndpoint: vi.fn(),
  updateSyncEndpoint: vi.fn(),
  clearSyncEndpoint: vi.fn(),
}));

vi.mock("@/repositories/localJsonRepository", () => ({ localRepository: repository }));
vi.mock("@/platform/documentStore", () => ({ makePasswordKey: () => "new-secret-ref" }));

import { clearSyncEndpoint, saveSyncEndpoint } from "./syncSettings";

describe("sync endpoint credential ordering", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    repository.endpoint = { url: "https://dav.example.test", username: "athlete", passwordRef: "secret-ref" };
    repository.getSyncEndpoint.mockImplementation(async () => ({ ...repository.endpoint }));
    repository.updateSyncEndpoint.mockImplementation(async (next) => {
      repository.endpoint = { ...next };
      return { ...next };
    });
  });

  it("writes a new secret before updating passwordRef", async () => {
    const order: string[] = [];
    repository.writeSecret.mockImplementation(async () => { order.push("secret"); });
    repository.updateSyncEndpoint.mockImplementation(async (next) => {
      order.push("endpoint");
      repository.endpoint = { ...next };
      return { ...next };
    });

    await saveSyncEndpoint({ url: "https://dav.example.test", username: "athlete", password: "new-password", password_ref: null });

    expect(order).toEqual(["secret", "endpoint"]);
    expect(repository.endpoint.passwordRef).toBe("new-secret-ref");
  });

  it("keeps the existing secret when password is left empty", async () => {
    await saveSyncEndpoint({ url: "https://dav.example.test", username: "athlete", password: "", password_ref: "secret-ref" });

    expect(repository.writeSecret).not.toHaveBeenCalled();
    expect(repository.endpoint.passwordRef).toBe("secret-ref");
  });

  it("does not clear endpoint or business data when credential removal fails", async () => {
    repository.removeSecret.mockRejectedValueOnce(new Error("凭据清除失败，请重试"));
    const before = JSON.parse(JSON.stringify(repository.snapshot));

    await expect(clearSyncEndpoint()).rejects.toThrow("凭据清除失败，请重试");

    expect(repository.clearSyncEndpoint).not.toHaveBeenCalled();
    expect(repository.endpoint.passwordRef).toBe("secret-ref");
    expect(repository.snapshot).toEqual(before);
  });

  it("clears credentials before local endpoint config without touching business data", async () => {
    const order: string[] = [];
    repository.removeSecret.mockImplementation(async () => { order.push("secret"); });
    repository.clearSyncEndpoint.mockImplementation(async () => {
      order.push("endpoint");
      repository.endpoint = { url: "", username: "", passwordRef: null };
    });
    const before = JSON.parse(JSON.stringify(repository.snapshot));

    await clearSyncEndpoint();

    expect(order).toEqual(["secret", "endpoint"]);
    expect(repository.endpoint).toEqual({ url: "", username: "", passwordRef: null });
    expect(repository.snapshot).toEqual(before);
  });
});

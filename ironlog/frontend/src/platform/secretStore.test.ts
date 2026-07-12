import { describe, expect, it } from "vitest";
import { MigratingSecretStore, SecretMigrationError, SecretReentryRequiredError, type SecretBackend, WebSecretStore } from "./secretStore";

describe("WebSecretStore", () => {
  it("keeps the web development read, overwrite, and idempotent delete behavior", async () => {
    const backend = memoryBackend();
    const store = new WebSecretStore(backend);

    expect(await store.readSecret("web-ref")).toBeNull();
    await store.writeSecret("web-ref", "first");
    expect(await store.readSecret("web-ref")).toBe("first");
    await store.writeSecret("web-ref", "second");
    expect(await store.readSecret("web-ref")).toBe("second");
    await store.removeSecret("web-ref");
    await store.removeSecret("web-ref");
    expect(await store.readSecret("web-ref")).toBeNull();
  });
});

describe("MigratingSecretStore", () => {
  it("migrates a legacy value only after secure write and read-back verification", async () => {
    const events: string[] = [];
    const secure = memoryBackend({}, events, "secure");
    const legacy = memoryBackend({ ref: "legacy-password" }, events, "legacy");
    const store = new MigratingSecretStore(secure, legacy);

    expect(await store.readSecret("ref")).toBe("legacy-password");
    expect(events).toEqual([
      "secure:read", "legacy:read", "secure:write", "secure:read", "legacy:remove",
    ]);
    expect(await legacy.read("ref")).toBeNull();
  });

  it("preserves the legacy value when secure write fails", async () => {
    const secure = memoryBackend();
    secure.write = async () => { throw new Error("write failed"); };
    const legacy = memoryBackend({ ref: "legacy-password" });
    const store = new MigratingSecretStore(secure, legacy);

    await expect(store.readSecret("ref")).rejects.toBeInstanceOf(SecretMigrationError);
    expect(await legacy.read("ref")).toBe("legacy-password");
  });

  it("preserves the legacy value when read-back verification fails", async () => {
    const secure = memoryBackend();
    secure.read = async () => null;
    const legacy = memoryBackend({ ref: "legacy-password" });
    const store = new MigratingSecretStore(secure, legacy);

    await expect(store.readSecret("ref")).rejects.toBeInstanceOf(SecretMigrationError);
    expect(await legacy.read("ref")).toBe("legacy-password");
  });

  it("uses the verified secure value and retries legacy cleanup after deletion fails", async () => {
    const secure = memoryBackend();
    let removeAttempts = 0;
    const legacy = memoryBackend({ ref: "legacy-password" });
    const remove = legacy.remove;
    legacy.remove = async (ref) => {
      removeAttempts += 1;
      if (removeAttempts === 1) throw new Error("remove failed");
      await remove(ref);
    };
    const store = new MigratingSecretStore(secure, legacy);

    expect(await store.readSecret("ref")).toBe("legacy-password");
    expect(await legacy.read("ref")).toBe("legacy-password");
    expect(await store.readSecret("ref")).toBe("legacy-password");
    expect(removeAttempts).toBe(2);
    expect(await legacy.read("ref")).toBeNull();
  });

  it("prefers a secure value when secure and legacy values coexist", async () => {
    const secure = memoryBackend({ ref: "secure-password" });
    const legacy = memoryBackend({ ref: "legacy-password" });
    const store = new MigratingSecretStore(secure, legacy);

    expect(await store.readSecret("ref")).toBe("secure-password");
  });

  it("does not disguise an unreadable secure value as an absent credential", async () => {
    const secure = memoryBackend();
    secure.read = async () => { throw new SecretReentryRequiredError(); };
    const legacy = memoryBackend({ ref: "legacy-password" });
    const store = new MigratingSecretStore(secure, legacy);

    await expect(store.readSecret("ref")).rejects.toMatchObject({ code: "SECRET_REENTRY_REQUIRED" });
    expect(await legacy.read("ref")).toBe("legacy-password");
  });

  it("attempts both secure and legacy removal and reports partial failure", async () => {
    const secure = memoryBackend({ ref: "secure-password" });
    const legacy = memoryBackend({ ref: "legacy-password" });
    secure.remove = async () => { throw new Error("secure remove failed"); };
    const store = new MigratingSecretStore(secure, legacy);

    await expect(store.removeSecret("ref")).rejects.toThrow("凭据清除失败，请重试");
    expect(await legacy.read("ref")).toBeNull();
  });
});

function memoryBackend(
  initial: Record<string, string> = {},
  events: string[] = [],
  label = "backend",
): SecretBackend {
  const values = new Map(Object.entries(initial));
  return {
    async read(ref) {
      events.push(`${label}:read`);
      return values.get(ref) ?? null;
    },
    async write(ref, value) {
      events.push(`${label}:write`);
      values.set(ref, value);
    },
    async remove(ref) {
      events.push(`${label}:remove`);
      values.delete(ref);
    },
  };
}

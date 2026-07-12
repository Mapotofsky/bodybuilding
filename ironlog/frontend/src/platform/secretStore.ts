import { registerPlugin } from "@capacitor/core";

export interface SecretStore {
  readSecret(ref: string): Promise<string | null>;
  writeSecret(ref: string, value: string): Promise<void>;
  removeSecret(ref: string): Promise<void>;
}

export interface SecretBackend {
  read(ref: string): Promise<string | null>;
  write(ref: string, value: string): Promise<void>;
  remove(ref: string): Promise<void>;
}

export class SecretReentryRequiredError extends Error {
  readonly code = "SECRET_REENTRY_REQUIRED";

  constructor() {
    super("安全凭据无法读取，请重新输入 WebDAV 密码");
    this.name = "SecretReentryRequiredError";
  }
}

export class SecretMigrationError extends Error {
  readonly code = "SECRET_MIGRATION_FAILED";

  constructor() {
    super("安全凭据迁移失败，旧密码已保留");
    this.name = "SecretMigrationError";
  }
}

export class WebSecretStore implements SecretStore {
  constructor(private readonly backend: SecretBackend) {}

  readSecret(ref: string): Promise<string | null> {
    return this.backend.read(ref);
  }

  writeSecret(ref: string, value: string): Promise<void> {
    return this.backend.write(ref, value);
  }

  removeSecret(ref: string): Promise<void> {
    return this.backend.remove(ref);
  }
}

export class MigratingSecretStore implements SecretStore {
  constructor(
    private readonly secure: SecretBackend,
    private readonly legacy: SecretBackend,
  ) {}

  async readSecret(ref: string): Promise<string | null> {
    const secureValue = await this.secure.read(ref);
    if (secureValue !== null) {
      await ignoreFailure(() => this.legacy.remove(ref));
      return secureValue;
    }

    const legacyValue = await this.legacy.read(ref);
    if (legacyValue === null) return null;

    try {
      await this.secure.write(ref, legacyValue);
      const verified = await this.secure.read(ref);
      if (verified !== legacyValue) throw new SecretMigrationError();
    } catch (error) {
      if (error instanceof SecretMigrationError || error instanceof SecretReentryRequiredError) throw error;
      throw new SecretMigrationError();
    }

    await ignoreFailure(() => this.legacy.remove(ref));
    return legacyValue;
  }

  async writeSecret(ref: string, value: string): Promise<void> {
    await this.secure.write(ref, value);
    const verified = await this.secure.read(ref);
    if (verified !== value) throw new SecretMigrationError();
    await ignoreFailure(() => this.legacy.remove(ref));
  }

  async removeSecret(ref: string): Promise<void> {
    const failures: unknown[] = [];
    await captureFailure(() => this.secure.remove(ref), failures);
    await captureFailure(() => this.legacy.remove(ref), failures);
    if (failures.length > 0) {
      throw new Error("凭据清除失败，请重试");
    }
  }
}

interface NativeSecretStorePlugin {
  readSecret(options: { ref: string }): Promise<{ value: string | null }>;
  writeSecret(options: { ref: string; value: string }): Promise<void>;
  removeSecret(options: { ref: string }): Promise<void>;
}

const nativeSecretStore = registerPlugin<NativeSecretStorePlugin>("SecretStore");

export function createAndroidSecretStore(): SecretStore {
  const secure: SecretBackend = {
    async read(ref) {
      try {
        return (await nativeSecretStore.readSecret({ ref })).value;
      } catch (error) {
        throw normalizeNativeError(error);
      }
    },
    async write(ref, value) {
      try {
        await nativeSecretStore.writeSecret({ ref, value });
      } catch (error) {
        throw normalizeNativeError(error);
      }
    },
    async remove(ref) {
      try {
        await nativeSecretStore.removeSecret({ ref });
      } catch (error) {
        throw normalizeNativeError(error);
      }
    },
  };
  const legacy: SecretBackend = {
    async read(ref) {
      const { Preferences } = await import("@capacitor/preferences");
      return (await Preferences.get({ key: legacyPreferenceKey(ref) })).value;
    },
    async write(ref, value) {
      const { Preferences } = await import("@capacitor/preferences");
      await Preferences.set({ key: legacyPreferenceKey(ref), value });
    },
    async remove(ref) {
      const { Preferences } = await import("@capacitor/preferences");
      await Preferences.remove({ key: legacyPreferenceKey(ref) });
    },
  };
  return new MigratingSecretStore(secure, legacy);
}

export function legacyPreferenceKey(ref: string): string {
  return `ironlog.secret.${ref}`;
}

function normalizeNativeError(error: unknown): Error {
  if (isErrorCode(error, "SECRET_REENTRY_REQUIRED")) return new SecretReentryRequiredError();
  return new Error("安全凭据操作失败，请重试");
}

function isErrorCode(error: unknown, code: string): boolean {
  return Boolean(error && typeof error === "object" && "code" in error && (error as { code?: unknown }).code === code);
}

async function ignoreFailure(action: () => Promise<void>): Promise<void> {
  try {
    await action();
  } catch {
    // A verified secure value remains the source of truth; a later read retries legacy cleanup.
  }
}

async function captureFailure(action: () => Promise<void>, failures: unknown[]): Promise<void> {
  try {
    await action();
  } catch (error) {
    failures.push(error);
  }
}

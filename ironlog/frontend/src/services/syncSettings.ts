import { makePasswordKey } from "@/platform/documentStore";
import { localRepository } from "@/repositories/localJsonRepository";

export interface SyncEndpoint {
  url: string;
  username: string;
  password_ref: string | null;
}

export async function getSyncEndpoint(): Promise<SyncEndpoint> {
  return toSyncEndpoint(await localRepository.getSyncEndpoint());
}

export async function saveSyncEndpoint(body: {
  url: string;
  username: string;
  password?: string;
  password_ref?: string | null;
}): Promise<SyncEndpoint> {
  const passwordRef = body.password ? (body.password_ref || makePasswordKey()) : (body.password_ref ?? null);
  if (body.password && passwordRef) {
    await localRepository.writeSecret(passwordRef, body.password);
  }
  return toSyncEndpoint(await localRepository.updateSyncEndpoint({
    url: body.url,
    username: body.username,
    passwordRef,
  }));
}

export async function clearSyncEndpoint(): Promise<void> {
  const current = await localRepository.getSyncEndpoint();
  if (current.passwordRef) {
    await localRepository.removeSecret(current.passwordRef);
  }
  await localRepository.clearSyncEndpoint();
}

function toSyncEndpoint(config: { url: string; username: string; passwordRef: string | null }): SyncEndpoint {
  return {
    url: config.url,
    username: config.username,
    password_ref: config.passwordRef,
  };
}

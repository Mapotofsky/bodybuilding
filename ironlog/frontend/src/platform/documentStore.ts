import { workoutShardPath, workoutShardPathsFromManifest } from "@/core/migrations";
import type { DataSnapshot, IronLogManifest, WorkoutDoc } from "@/core/models";
import { makeId } from "@/core/id";

export interface DocumentStore {
  load(): Promise<Partial<DataSnapshot> | null>;
  save(snapshot: DataSnapshot): Promise<void>;
  readSecret(key: string): Promise<string | null>;
  writeSecret(key: string, value: string): Promise<void>;
  removeSecret(key: string): Promise<void>;
  exportFiles(snapshot: DataSnapshot): Record<string, unknown>;
  importFiles(files: Record<string, unknown>): Partial<DataSnapshot>;
}

const DB_NAME = "ironlog-local";
const STORE_NAME = "documents";
const MANIFEST_PATH = "manifest.json";
const STATIC_FILE_PATHS = ["profile.json", "settings.json", "exercises.json", "templates.json"];

class IndexedDbDocumentStore implements DocumentStore {
  async load(): Promise<Partial<DataSnapshot> | null> {
    const manifest = await this.readDocument<IronLogManifest>(MANIFEST_PATH);
    if (!manifest) return null;

    const files = await this.readDocuments([
      MANIFEST_PATH,
      ...STATIC_FILE_PATHS,
      ...workoutShardPathsFromManifest(manifest),
    ]);
    return filesToSnapshot(files);
  }

  async save(snapshot: DataSnapshot): Promise<void> {
    const previousManifest = await this.readDocument<IronLogManifest>(MANIFEST_PATH);
    const files = snapshotToFiles(snapshot);
    const nextPaths = new Set(Object.keys(files));
    const staleWorkoutPaths = workoutShardPathsFromManifest(previousManifest).filter((path) => !nextPaths.has(path));

    await this.tx("readwrite", async (store) => {
      await Promise.all(Object.entries(files).map(([path, value]) => request(store.put(value, path))));
      await Promise.all(staleWorkoutPaths.map((path) => request(store.delete(path))));
    });
  }

  async readSecret(key: string): Promise<string | null> {
    return this.tx("readonly", (store) => request(store.get(`secret:${key}`)));
  }

  async writeSecret(key: string, value: string): Promise<void> {
    await this.tx("readwrite", (store) => request(store.put(value, `secret:${key}`)));
  }

  async removeSecret(key: string): Promise<void> {
    await this.tx("readwrite", (store) => request(store.delete(`secret:${key}`)));
  }

  exportFiles(snapshot: DataSnapshot): Record<string, unknown> {
    return snapshotToFiles(snapshot);
  }

  importFiles(files: Record<string, unknown>): Partial<DataSnapshot> {
    return filesToSnapshot(files);
  }

  private async db(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const open = indexedDB.open(DB_NAME, 1);
      open.onupgradeneeded = () => {
        open.result.createObjectStore(STORE_NAME);
      };
      open.onerror = () => reject(open.error);
      open.onsuccess = () => resolve(open.result);
    });
  }

  private async tx<T>(mode: IDBTransactionMode, fn: (store: IDBObjectStore) => Promise<T>): Promise<T> {
    const db = await this.db();
    try {
      const transaction = db.transaction(STORE_NAME, mode);
      return await fn(transaction.objectStore(STORE_NAME));
    } finally {
      db.close();
    }
  }

  private async readDocument<T>(path: string): Promise<T | null> {
    const value = await this.tx("readonly", (store) => request(store.get(path)));
    return (value as T | undefined) ?? null;
  }

  private async readDocuments(paths: string[]): Promise<Record<string, unknown>> {
    const entries = await Promise.all(paths.map(async (path) => [path, await this.readDocument(path)] as const));
    return Object.fromEntries(entries.filter(([, value]) => value != null));
  }
}

class CapacitorDocumentStore implements DocumentStore {
  private baseDir = "ironlog-data";

  async load(): Promise<Partial<DataSnapshot> | null> {
    const manifest = await this.readJson(MANIFEST_PATH) as IronLogManifest | null;
    if (!manifest) return null;

    const files: Record<string, unknown> = { [MANIFEST_PATH]: manifest };
    for (const path of [...STATIC_FILE_PATHS, ...workoutShardPathsFromManifest(manifest)]) {
      const value = await this.readJson(path);
      if (value != null) files[path] = value;
    }
    return filesToSnapshot(files);
  }

  async save(snapshot: DataSnapshot): Promise<void> {
    const previousManifest = await this.readJson(MANIFEST_PATH) as IronLogManifest | null;
    const files = snapshotToFiles(snapshot);
    const nextPaths = new Set(Object.keys(files));
    const staleWorkoutPaths = workoutShardPathsFromManifest(previousManifest).filter((path) => !nextPaths.has(path));
    await this.ensureDir(this.baseDir);
    await this.ensureDir(`${this.baseDir}/workouts`);
    for (const [path, value] of Object.entries(files).filter(([path]) => path !== MANIFEST_PATH)) {
      await this.writeJson(path, value);
    }
    await this.writeJson(MANIFEST_PATH, files[MANIFEST_PATH]);
    for (const path of staleWorkoutPaths) {
      await this.deleteJson(path);
    }
  }

  async readSecret(key: string): Promise<string | null> {
    const { Preferences } = await import("@capacitor/preferences");
    const result = await Preferences.get({ key: `ironlog.secret.${key}` });
    return result.value;
  }

  async writeSecret(key: string, value: string): Promise<void> {
    const { Preferences } = await import("@capacitor/preferences");
    await Preferences.set({ key: `ironlog.secret.${key}`, value });
  }

  async removeSecret(key: string): Promise<void> {
    const { Preferences } = await import("@capacitor/preferences");
    await Preferences.remove({ key: `ironlog.secret.${key}` });
  }

  exportFiles(snapshot: DataSnapshot): Record<string, unknown> {
    return snapshotToFiles(snapshot);
  }

  importFiles(files: Record<string, unknown>): Partial<DataSnapshot> {
    return filesToSnapshot(files);
  }

  private async readJson(path: string): Promise<unknown | null> {
    const { Filesystem, Directory, Encoding } = await import("@capacitor/filesystem");
    try {
      const result = await Filesystem.readFile({
        path: `${this.baseDir}/${path}`,
        directory: Directory.Data,
        encoding: Encoding.UTF8,
      });
      return JSON.parse(String(result.data));
    } catch {
      return null;
    }
  }

  private async writeJson(path: string, value: unknown): Promise<void> {
    const { Filesystem, Directory, Encoding } = await import("@capacitor/filesystem");
    await Filesystem.writeFile({
      path: `${this.baseDir}/${path}`,
      data: JSON.stringify(value, null, 2),
      directory: Directory.Data,
      encoding: Encoding.UTF8,
      recursive: true,
    });
  }

  private async deleteJson(path: string): Promise<void> {
    const { Filesystem, Directory } = await import("@capacitor/filesystem");
    try {
      await Filesystem.deleteFile({ path: `${this.baseDir}/${path}`, directory: Directory.Data });
    } catch {
      // The file may already have been removed.
    }
  }

  private async ensureDir(path: string): Promise<void> {
    const { Filesystem, Directory } = await import("@capacitor/filesystem");
    try {
      await Filesystem.mkdir({ path, directory: Directory.Data, recursive: true });
    } catch {
      // Directory already exists.
    }
  }
}

export async function createDocumentStore(): Promise<DocumentStore> {
  if (typeof window !== "undefined") {
    const cap = (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor;
    if (cap?.isNativePlatform?.()) {
      return new CapacitorDocumentStore();
    }
  }
  return new IndexedDbDocumentStore();
}

export function makePasswordKey(): string {
  return `webdav-${makeId()}`;
}

function request<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onerror = () => reject(req.error);
    req.onsuccess = () => resolve(req.result);
  });
}

export function snapshotToFiles(snapshot: DataSnapshot): Record<string, unknown> {
  return {
    [MANIFEST_PATH]: snapshot.manifest,
    "profile.json": snapshot.profile,
    "settings.json": snapshot.settings,
    "exercises.json": snapshot.exercises,
    "templates.json": {
      plans: snapshot.plans,
      templates: snapshot.templates,
    },
    ...workoutMonthFiles(snapshot),
  };
}

function workoutMonthFiles(snapshot: DataSnapshot): Record<string, WorkoutDoc[]> {
  const grouped: Record<string, WorkoutDoc[]> = {};
  for (const workout of snapshot.workouts) {
    const key = workoutShardPath(workout.date);
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(workout);
  }
  return grouped;
}

function filesToSnapshot(files: Record<string, unknown>): Partial<DataSnapshot> {
  const templateFile = files["templates.json"] as { plans?: unknown; templates?: unknown } | undefined;
  const manifest = files[MANIFEST_PATH] as IronLogManifest | undefined;
  const monthWorkouts = workoutShardPathsFromManifest(manifest)
    .flatMap((path) => (Array.isArray(files[path]) ? files[path] : []));
  return {
    manifest: manifest as Partial<DataSnapshot>["manifest"],
    profile: files["profile.json"] as Partial<DataSnapshot>["profile"],
    settings: files["settings.json"] as Partial<DataSnapshot>["settings"],
    exercises: files["exercises.json"] as Partial<DataSnapshot>["exercises"],
    plans: templateFile?.plans as Partial<DataSnapshot>["plans"],
    templates: templateFile?.templates as Partial<DataSnapshot>["templates"],
    workouts: monthWorkouts as Partial<DataSnapshot>["workouts"],
  };
}

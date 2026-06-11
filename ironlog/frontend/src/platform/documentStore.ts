import type { DataSnapshot } from "@/core/models";
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
const SNAPSHOT_KEY = "snapshot";

class IndexedDbDocumentStore implements DocumentStore {
  async load(): Promise<Partial<DataSnapshot> | null> {
    return this.tx("readonly", (store) => request(store.get(SNAPSHOT_KEY)));
  }

  async save(snapshot: DataSnapshot): Promise<void> {
    await this.tx("readwrite", (store) => request(store.put(snapshot, SNAPSHOT_KEY)));
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
}

class CapacitorDocumentStore implements DocumentStore {
  private baseDir = "ironlog-data";

  async load(): Promise<Partial<DataSnapshot> | null> {
    const files: Record<string, unknown> = {};
    for (const path of ["manifest.json", "profile.json", "settings.json", "exercises.json", "templates.json", "workouts/index.json"]) {
      const value = await this.readJson(path);
      if (value != null) files[path] = value;
    }
    return Object.keys(files).length > 0 ? filesToSnapshot(files) : null;
  }

  async save(snapshot: DataSnapshot): Promise<void> {
    const files = snapshotToFiles(snapshot);
    await this.ensureDir(this.baseDir);
    await this.ensureDir(`${this.baseDir}/workouts`);
    for (const [path, value] of Object.entries(files)) {
      await this.writeJson(path, value);
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

function snapshotToFiles(snapshot: DataSnapshot): Record<string, unknown> {
  return {
    "manifest.json": snapshot.manifest,
    "profile.json": snapshot.profile,
    "settings.json": snapshot.settings,
    "exercises.json": snapshot.exercises,
    "templates.json": {
      plans: snapshot.plans,
      templates: snapshot.templates,
      scheduleEntries: snapshot.scheduleEntries,
    },
    "workouts/index.json": snapshot.workouts,
    ...workoutMonthFiles(snapshot),
  };
}

function workoutMonthFiles(snapshot: DataSnapshot): Record<string, unknown> {
  const grouped: Record<string, unknown[]> = {};
  for (const workout of snapshot.workouts) {
    const key = `workouts/${workout.date.slice(0, 7)}.json`;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(workout);
  }
  return grouped;
}

function filesToSnapshot(files: Record<string, unknown>): Partial<DataSnapshot> {
  const templateFile = files["templates.json"] as { plans?: unknown; templates?: unknown; scheduleEntries?: unknown } | undefined;
  const workoutsIndex = files["workouts/index.json"];
  const monthWorkouts = Object.entries(files)
    .filter(([path]) => /^workouts\/\d{4}-\d{2}\.json$/.test(path))
    .flatMap(([, value]) => (Array.isArray(value) ? value : []));
  return {
    manifest: files["manifest.json"] as Partial<DataSnapshot>["manifest"],
    profile: files["profile.json"] as Partial<DataSnapshot>["profile"],
    settings: files["settings.json"] as Partial<DataSnapshot>["settings"],
    exercises: files["exercises.json"] as Partial<DataSnapshot>["exercises"],
    plans: templateFile?.plans as Partial<DataSnapshot>["plans"],
    templates: templateFile?.templates as Partial<DataSnapshot>["templates"],
    scheduleEntries: templateFile?.scheduleEntries as Partial<DataSnapshot>["scheduleEntries"],
    workouts: Array.isArray(workoutsIndex) ? workoutsIndex as Partial<DataSnapshot>["workouts"] : monthWorkouts as Partial<DataSnapshot>["workouts"],
  };
}

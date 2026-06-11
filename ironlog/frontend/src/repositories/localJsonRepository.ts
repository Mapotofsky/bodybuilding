import { buildShardList, makeEmptySnapshot, migrateSnapshot } from "@/core/migrations";
import type {
  DataSnapshot,
  ExerciseDoc,
  ManualScheduleEntryDoc,
  ProfileDoc,
  SettingsDoc,
  TemplateDoc,
  TrainingPlanDoc,
  WorkoutDoc,
} from "@/core/models";
import { makeId, nowIso } from "@/core/id";
import { createDocumentStore, type DocumentStore } from "@/platform/documentStore";

export class LocalJsonRepository {
  private snapshotPromise: Promise<DataSnapshot> | null = null;

  constructor(private storePromise: Promise<DocumentStore>) {}

  static create(): LocalJsonRepository {
    return new LocalJsonRepository(createDocumentStore());
  }

  async getSnapshot(): Promise<DataSnapshot> {
    if (!this.snapshotPromise) {
      this.snapshotPromise = this.loadSnapshot();
    }
    return this.snapshotPromise;
  }

  async replaceSnapshot(raw: Partial<DataSnapshot>): Promise<DataSnapshot> {
    const current = await this.getSnapshot();
    const next = migrateSnapshot(raw, current.manifest.deviceId);
    await this.persist(next);
    this.snapshotPromise = Promise.resolve(next);
    return next;
  }

  async list(params?: { category?: string; q?: string; includeDeleted?: boolean }): Promise<ExerciseDoc[]> {
    const snapshot = await this.getSnapshot();
    return snapshot.exercises
      .filter((e) => params?.includeDeleted || !e.deletedAt)
      .filter((e) => !params?.category || e.category === params.category)
      .filter((e) => !params?.q || e.name.toLowerCase().includes(params.q.toLowerCase()))
      .sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name));
  }

  async get(id: string): Promise<ExerciseDoc | null> {
    const snapshot = await this.getSnapshot();
    return snapshot.exercises.find((e) => e.id === id && !e.deletedAt) || null;
  }

  async create(body: Pick<ExerciseDoc, "name" | "category" | "type" | "description"> & { metValue?: number | null }): Promise<ExerciseDoc> {
    return this.mutate((snapshot) => {
      const exercise: ExerciseDoc = withDoc({
        name: body.name,
        category: body.category,
        type: body.type || "strength",
        description: body.description || null,
        metValue: body.metValue ?? null,
        isCustom: true,
      });
      snapshot.exercises.push(exercise);
      return exercise;
    });
  }

  async listPlans(includeDeleted = false): Promise<TrainingPlanDoc[]> {
    const snapshot = await this.getSnapshot();
    return snapshot.plans
      .filter((p) => includeDeleted || !p.deletedAt)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async getPlan(id: string): Promise<TrainingPlanDoc | null> {
    const snapshot = await this.getSnapshot();
    return snapshot.plans.find((p) => p.id === id && !p.deletedAt) || null;
  }

  async createPlan(body: Omit<TrainingPlanDoc, "id" | "createdAt" | "updatedAt" | "deletedAt" | "schemaVersion">): Promise<TrainingPlanDoc> {
    return this.mutate((snapshot) => {
      const plan: TrainingPlanDoc = withDoc(body);
      snapshot.plans.push(plan);
      return plan;
    });
  }

  async updatePlan(id: string, body: Partial<Omit<TrainingPlanDoc, "id" | "createdAt" | "updatedAt" | "deletedAt" | "schemaVersion">>): Promise<TrainingPlanDoc> {
    return this.updateDoc("plans", id, body);
  }

  async deletePlan(id: string): Promise<void> {
    await this.mutate((snapshot) => {
      tombstone(snapshot.plans, id);
      for (const template of snapshot.templates.filter((t) => t.planId === id)) tombstone(snapshot.templates, template.id);
      return undefined;
    });
  }

  async listTemplates(planId?: string, includeDeleted = false): Promise<TemplateDoc[]> {
    const snapshot = await this.getSnapshot();
    return snapshot.templates
      .filter((t) => includeDeleted || !t.deletedAt)
      .filter((t) => !planId || t.planId === planId)
      .sort((a, b) => a.sortOrder - b.sortOrder);
  }

  async getTemplate(id: string): Promise<TemplateDoc | null> {
    const snapshot = await this.getSnapshot();
    return snapshot.templates.find((t) => t.id === id && !t.deletedAt) || null;
  }

  async createTemplate(body: Omit<TemplateDoc, "id" | "createdAt" | "updatedAt" | "deletedAt" | "schemaVersion">): Promise<TemplateDoc> {
    return this.mutate((snapshot) => {
      const template: TemplateDoc = withDoc({
        ...body,
        exercises: body.exercises.map((e) => ({ ...e, id: e.id || makeId() })),
      });
      snapshot.templates.push(template);
      return template;
    });
  }

  async updateTemplate(id: string, body: Partial<Omit<TemplateDoc, "id" | "createdAt" | "updatedAt" | "deletedAt" | "schemaVersion">>): Promise<TemplateDoc> {
    return this.updateDoc("templates", id, {
      ...body,
      exercises: body.exercises?.map((e) => ({ ...e, id: e.id || makeId() })),
    });
  }

  async deleteTemplate(id: string): Promise<void> {
    await this.mutate((snapshot) => {
      tombstone(snapshot.templates, id);
      return undefined;
    });
  }

  async createScheduleEntry(body: Omit<ManualScheduleEntryDoc, "id" | "createdAt" | "updatedAt" | "deletedAt" | "schemaVersion">): Promise<ManualScheduleEntryDoc> {
    return this.mutate((snapshot) => {
      const entry: ManualScheduleEntryDoc = withDoc(body);
      snapshot.scheduleEntries.push(entry);
      return entry;
    });
  }

  async listScheduleEntries(from: string, to: string): Promise<ManualScheduleEntryDoc[]> {
    const snapshot = await this.getSnapshot();
    return snapshot.scheduleEntries.filter((e) => !e.deletedAt && e.scheduledDate >= from && e.scheduledDate <= to);
  }

  async listWorkouts(params?: { month?: string; from?: string; to?: string; includeDeleted?: boolean }): Promise<WorkoutDoc[]> {
    const snapshot = await this.getSnapshot();
    return snapshot.workouts
      .filter((w) => params?.includeDeleted || !w.deletedAt)
      .filter((w) => !params?.month || w.date.startsWith(params.month))
      .filter((w) => !params?.from || w.date >= params.from)
      .filter((w) => !params?.to || w.date <= params.to)
      .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));
  }

  async getWorkout(id: string): Promise<WorkoutDoc | null> {
    const snapshot = await this.getSnapshot();
    return snapshot.workouts.find((w) => w.id === id && !w.deletedAt) || null;
  }

  async createWorkout(body: Omit<WorkoutDoc, "id" | "createdAt" | "updatedAt" | "deletedAt" | "schemaVersion">): Promise<WorkoutDoc> {
    return this.mutate((snapshot) => {
      const workout: WorkoutDoc = withDoc({
        ...body,
        exercises: body.exercises.map((e) => ({
          ...e,
          id: e.id || makeId(),
          sets: e.sets.map((s) => ({ ...s, id: s.id || makeId() })),
        })),
      });
      snapshot.workouts.push(workout);
      return workout;
    });
  }

  async updateWorkout(id: string, body: Partial<Omit<WorkoutDoc, "id" | "createdAt" | "updatedAt" | "deletedAt" | "schemaVersion">>): Promise<WorkoutDoc> {
    return this.updateDoc("workouts", id, body.exercises ? {
      ...body,
      exercises: body.exercises.map((e) => ({
        ...e,
        id: e.id || makeId(),
        sets: e.sets.map((s) => ({ ...s, id: s.id || makeId() })),
      })),
    } : body);
  }

  async deleteWorkout(id: string): Promise<void> {
    await this.mutate((snapshot) => {
      tombstone(snapshot.workouts, id);
      return undefined;
    });
  }

  async getProfile(): Promise<ProfileDoc> {
    return (await this.getSnapshot()).profile;
  }

  async updateProfile(body: Partial<Omit<ProfileDoc, "id" | "createdAt" | "updatedAt" | "deletedAt" | "schemaVersion">>): Promise<ProfileDoc> {
    return this.mutate((snapshot) => {
      snapshot.profile = { ...snapshot.profile, ...body, updatedAt: nowIso() };
      return snapshot.profile;
    });
  }

  async getSettings(): Promise<SettingsDoc> {
    return (await this.getSnapshot()).settings;
  }

  async updateSettings(body: Partial<Omit<SettingsDoc, "id" | "createdAt" | "updatedAt" | "deletedAt" | "schemaVersion">>): Promise<SettingsDoc> {
    return this.mutate((snapshot) => {
      snapshot.settings = { ...snapshot.settings, ...body, updatedAt: nowIso() };
      return snapshot.settings;
    });
  }

  async readSecret(key: string): Promise<string | null> {
    return (await this.storePromise).readSecret(key);
  }

  async writeSecret(key: string, value: string): Promise<void> {
    await (await this.storePromise).writeSecret(key, value);
  }

  async removeSecret(key: string): Promise<void> {
    await (await this.storePromise).removeSecret(key);
  }

  async exportFiles(): Promise<Record<string, unknown>> {
    return (await this.storePromise).exportFiles(await this.getSnapshot());
  }

  private async loadSnapshot(): Promise<DataSnapshot> {
    const store = await this.storePromise;
    const raw = await store.load();
    const deviceId = localDeviceId();
    const snapshot = migrateSnapshot(raw || makeEmptySnapshot(deviceId), deviceId);
    await store.save(snapshot);
    return snapshot;
  }

  private async mutate<T>(fn: (snapshot: DataSnapshot) => T): Promise<T> {
    const snapshot = await this.getSnapshot();
    const result = fn(snapshot);
    snapshot.manifest.updatedAt = nowIso();
    snapshot.manifest.shards = buildShardList(snapshot);
    await this.persist(snapshot);
    return result;
  }

  private async persist(snapshot: DataSnapshot): Promise<void> {
    await (await this.storePromise).save(snapshot);
  }

  private async updateDoc<K extends "plans" | "templates" | "workouts">(
    key: K,
    id: string,
    body: Partial<DataSnapshot[K][number]>
  ): Promise<DataSnapshot[K][number]> {
    return this.mutate((snapshot) => {
      const item = snapshot[key].find((doc) => doc.id === id && !doc.deletedAt);
      if (!item) throw new Error("Document not found");
      Object.assign(item, withoutUndefined(body), { updatedAt: nowIso() });
      return item;
    });
  }
}

export const localRepository = LocalJsonRepository.create();

function withDoc<T>(value: T): T & { id: string; createdAt: string; updatedAt: string; deletedAt: null; schemaVersion: 1 } {
  const t = nowIso();
  return { ...value, id: makeId(), createdAt: t, updatedAt: t, deletedAt: null, schemaVersion: 1 };
}

function tombstone<T extends { id: string; deletedAt: string | null; updatedAt: string }>(items: T[], id: string): void {
  const item = items.find((doc) => doc.id === id && !doc.deletedAt);
  if (item) {
    const t = nowIso();
    item.deletedAt = t;
    item.updatedAt = t;
  }
}

function withoutUndefined<T extends Record<string, unknown>>(value: T): Partial<T> {
  return Object.fromEntries(Object.entries(value).filter(([, item]) => item !== undefined)) as Partial<T>;
}

function localDeviceId(): string {
  const key = "ironlog_device_id";
  const existing = localStorage.getItem(key);
  if (existing) return existing;
  const id = makeId();
  localStorage.setItem(key, id);
  return id;
}

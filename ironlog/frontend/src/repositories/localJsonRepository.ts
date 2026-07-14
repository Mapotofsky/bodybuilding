import { buildShardList, makeEmptySnapshot, migrateSnapshot } from "@/core/migrations";
import {
  CURRENT_SCHEMA_VERSION,
  type BodyMetricDoc,
  type DataSnapshot,
  type ExercisePerformanceRecordDoc,
  type ExerciseDoc,
  type EquipmentId,
  type ExerciseCategory,
  type ProfileDoc,
  type SettingsDoc,
  type SyncEndpointConfig,
  type TemplateDoc,
  type TimelineNoteDoc,
  type TrainingPlanDoc,
  type WorkoutDoc,
} from "@/core/models";
import { makeCustomExerciseId, makeId, nowIso } from "@/core/id";
import { resolveExerciseId } from "@/core/exerciseRedirects";
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

  async list(params?: { category?: ExerciseCategory; equipment?: EquipmentId | null; q?: string; includeDeleted?: boolean }): Promise<ExerciseDoc[]> {
    const snapshot = await this.getSnapshot();
    return snapshot.exercises
      .filter((e) => params?.includeDeleted || !e.deletedAt)
      .filter((e) => !params?.category || e.category === params.category)
      .filter((e) => params?.equipment === undefined || e.equipment === params.equipment)
      .filter((e) => !params?.q || e.name.toLowerCase().includes(params.q.toLowerCase()))
      .sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name));
  }

  async get(id: string): Promise<ExerciseDoc | null> {
    const snapshot = await this.getSnapshot();
    return snapshot.exercises.find((e) => e.id === id && !e.deletedAt) || null;
  }

  async create(body: Pick<ExerciseDoc, "name" | "category" | "type" | "equipment" | "description" | "primaryMuscleGroupIds" | "secondaryMuscleGroupIds">): Promise<ExerciseDoc> {
    return this.mutate((snapshot) => {
      const exercise: ExerciseDoc = withDoc({
        name: body.name,
        category: body.category,
        type: body.type,
        equipment: body.equipment,
        description: body.description,
        primaryMuscleGroupIds: body.primaryMuscleGroupIds,
        secondaryMuscleGroupIds: body.secondaryMuscleGroupIds,
        isCustom: true,
        replacedByExerciseId: null,
      }, makeCustomExerciseId());
      snapshot.exercises.push(exercise);
      return exercise;
    });
  }

  async updateExercise(id: string, body: Partial<Pick<ExerciseDoc, "name" | "category" | "type" | "equipment" | "description" | "primaryMuscleGroupIds" | "secondaryMuscleGroupIds">>): Promise<ExerciseDoc> {
    return this.mutate((snapshot) => {
      const exercise = snapshot.exercises.find((item) => item.id === id && !item.deletedAt);
      if (!exercise) throw new Error("动作不存在");
      if (!exercise.isCustom) throw new Error("内置动作不可编辑");
      Object.assign(exercise, withoutUndefined(body), { updatedAt: nextUpdatedAt(exercise.updatedAt, snapshot.manifest.updatedAt) });
      return exercise;
    });
  }

  async deleteExercise(id: string, replacedByExerciseId: string | null): Promise<void> {
    await this.mutate((snapshot) => {
      const source = snapshot.exercises.find((item) => item.id === id && !item.deletedAt);
      if (!source) throw new Error("动作不存在");
      if (!source.isCustom) throw new Error("内置动作不可删除");
      if (replacedByExerciseId !== null) {
        const target = snapshot.exercises.find((item) => item.id === replacedByExerciseId && !item.deletedAt);
        if (!target || target.id === source.id) throw new Error("替代动作不可用");
        if (target.type !== source.type) throw new Error("替代动作必须与原动作记录类型一致");
        const targetResolution = resolveExerciseId(target.id, snapshot.exercises);
        if (targetResolution.status !== "resolved" || targetResolution.resolvedId === source.id) throw new Error("替代动作会形成循环引用");
      }
      const timestamp = nowIso();
      source.deletedAt = timestamp;
      source.updatedAt = timestamp;
      source.replacedByExerciseId = replacedByExerciseId;
      if (replacedByExerciseId) {
        for (const template of snapshot.templates.filter((item) => !item.deletedAt)) {
          let changed = false;
          template.exercises = template.exercises.map((item) => {
            if (item.exerciseId !== source.id) return item;
            changed = true;
            return { ...item, exerciseId: replacedByExerciseId };
          });
          if (changed) template.updatedAt = timestamp;
        }
      }
      return undefined;
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

  async getLatestWorkoutDraft(): Promise<WorkoutDoc | null> {
    const snapshot = await this.getSnapshot();
    return snapshot.workouts
      .filter((workout) => !workout.deletedAt && workout.endTime === null)
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt) || right.createdAt.localeCompare(left.createdAt))[0] || null;
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

  async listBodyMetrics(params?: { from?: string; to?: string; includeDeleted?: boolean; includeFuture?: boolean }): Promise<BodyMetricDoc[]> {
    const now = nowIso();
    const snapshot = await this.getSnapshot();
    return snapshot.bodyMetrics
      .filter((item) => params?.includeDeleted || !item.deletedAt)
      .filter((item) => params?.includeFuture || item.recordedAt <= now)
      .filter((item) => !params?.from || item.recordedAt >= params.from)
      .filter((item) => !params?.to || item.recordedAt <= params.to)
      .sort((left, right) => right.recordedAt.localeCompare(left.recordedAt) || right.updatedAt.localeCompare(left.updatedAt));
  }

  async getBodyMetric(id: string): Promise<BodyMetricDoc | null> {
    const snapshot = await this.getSnapshot();
    return snapshot.bodyMetrics.find((item) => item.id === id && !item.deletedAt) || null;
  }

  async createBodyMetric(body: Omit<BodyMetricDoc, "id" | "createdAt" | "updatedAt" | "deletedAt" | "schemaVersion">): Promise<BodyMetricDoc> {
    return this.mutate((snapshot) => {
      const metric: BodyMetricDoc = withDoc(body);
      snapshot.bodyMetrics.push(metric);
      return metric;
    });
  }

  async updateBodyMetric(id: string, body: Partial<Omit<BodyMetricDoc, "id" | "createdAt" | "updatedAt" | "deletedAt" | "schemaVersion">>): Promise<BodyMetricDoc> {
    return this.updateDoc("bodyMetrics", id, body);
  }

  async deleteBodyMetric(id: string): Promise<void> {
    await this.mutate((snapshot) => {
      tombstone(snapshot.bodyMetrics, id);
      return undefined;
    });
  }

  async listTimelineNotes(params?: { includeDeleted?: boolean }): Promise<TimelineNoteDoc[]> {
    const snapshot = await this.getSnapshot();
    return snapshot.timelineNotes
      .filter((item) => params?.includeDeleted || !item.deletedAt)
      .sort((left, right) => right.startDate.localeCompare(left.startDate) || right.updatedAt.localeCompare(left.updatedAt));
  }

  async getTimelineNote(id: string): Promise<TimelineNoteDoc | null> {
    const snapshot = await this.getSnapshot();
    return snapshot.timelineNotes.find((item) => item.id === id && !item.deletedAt) || null;
  }

  async createTimelineNote(body: Omit<TimelineNoteDoc, "id" | "createdAt" | "updatedAt" | "deletedAt" | "schemaVersion">): Promise<TimelineNoteDoc> {
    return this.mutate((snapshot) => {
      const note: TimelineNoteDoc = withDoc(body);
      snapshot.timelineNotes.push(note);
      return note;
    });
  }

  async updateTimelineNote(id: string, body: Partial<Omit<TimelineNoteDoc, "id" | "createdAt" | "updatedAt" | "deletedAt" | "schemaVersion">>): Promise<TimelineNoteDoc> {
    return this.updateDoc("timelineNotes", id, body);
  }

  async deleteTimelineNote(id: string): Promise<void> {
    await this.mutate((snapshot) => {
      tombstone(snapshot.timelineNotes, id);
      return undefined;
    });
  }

  async listExercisePerformanceRecords(params?: {
    includeDeleted?: boolean;
    exerciseId?: string;
    sourceWorkoutId?: string;
    from?: string;
    to?: string;
    month?: string;
  }): Promise<ExercisePerformanceRecordDoc[]> {
    const snapshot = await this.getSnapshot();
    return snapshot.exercisePerformanceRecords
      .filter((item) => params?.includeDeleted || !item.deletedAt)
      .filter((item) => !params?.exerciseId || item.exerciseId === params.exerciseId)
      .filter((item) => !params?.sourceWorkoutId || item.sourceWorkoutId === params.sourceWorkoutId)
      .filter((item) => !params?.month || item.achievedAt.startsWith(params.month))
      .filter((item) => !params?.from || item.achievedAt.slice(0, 10) >= params.from)
      .filter((item) => !params?.to || item.achievedAt.slice(0, 10) <= params.to)
      .sort((left, right) => right.achievedAt.localeCompare(left.achievedAt) || right.updatedAt.localeCompare(left.updatedAt));
  }

  async replaceExercisePerformanceRecords(
    scope: { all?: boolean; exerciseIds?: string[]; sourceWorkoutIds?: string[] },
    records: ExercisePerformanceRecordDoc[]
  ): Promise<void> {
    await this.mutate((snapshot) => {
      const timestamp = nowIso();
      const nextIds = new Set(records.map((record) => record.id));
      for (const existing of snapshot.exercisePerformanceRecords) {
        if (!matchesPerformanceScope(existing, scope) || nextIds.has(existing.id) || existing.deletedAt) continue;
        existing.deletedAt = timestamp;
        existing.updatedAt = timestamp;
      }
      for (const record of records) {
        const existing = snapshot.exercisePerformanceRecords.find((item) => item.id === record.id);
        const next: ExercisePerformanceRecordDoc = {
          ...record,
          createdAt: existing?.createdAt || record.createdAt || timestamp,
          updatedAt: record.updatedAt || timestamp,
          deletedAt: record.deletedAt ?? null,
          schemaVersion: record.schemaVersion || CURRENT_SCHEMA_VERSION,
        };
        if (existing) Object.assign(existing, next);
        else snapshot.exercisePerformanceRecords.push(next);
      }
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

  async updateSettings(body: Partial<Omit<SettingsDoc, "id" | "createdAt" | "updatedAt" | "deletedAt" | "schemaVersion" | "lastSyncAt">>): Promise<SettingsDoc> {
    const current = await this.getSettings();
    const next = { ...current, ...withoutUndefined(body) };
    if (sameSettings(current, next)) return current;

    return this.mutate((snapshot) => {
      snapshot.settings = { ...snapshot.settings, ...withoutUndefined(body), updatedAt: nowIso() };
      return snapshot.settings;
    });
  }

  async updateLastSyncAt(lastSyncAt: SettingsDoc["lastSyncAt"]): Promise<SettingsDoc> {
    return this.mutate((snapshot) => {
      snapshot.settings = { ...snapshot.settings, lastSyncAt };
      return snapshot.settings;
    });
  }

  async getSyncEndpoint(): Promise<SyncEndpointConfig> {
    return (await this.storePromise).readSyncEndpoint();
  }

  async updateSyncEndpoint(config: SyncEndpointConfig): Promise<SyncEndpointConfig> {
    const next = {
      url: config.url.trim(),
      username: config.username.trim(),
      passwordRef: config.passwordRef,
    };
    await (await this.storePromise).writeSyncEndpoint(next);
    return next;
  }

  async clearSyncEndpoint(): Promise<void> {
    await (await this.storePromise).clearSyncEndpoint();
  }

  async readResource(path: string): Promise<string | null> {
    const snapshot = await this.getSnapshot();
    return snapshot.resources[path] ?? null;
  }

  async writeResource(path: string, value: string): Promise<void> {
    await this.mutate((snapshot) => {
      snapshot.resources[path] = value;
      return undefined;
    });
  }

  async removeResource(path: string): Promise<void> {
    await this.mutate((snapshot) => {
      delete snapshot.resources[path];
      return undefined;
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
    const snapshot = raw ? migrateSnapshot(raw, deviceId) : makeEmptySnapshot(deviceId);
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

  private async updateDoc<K extends "plans" | "templates" | "workouts" | "bodyMetrics" | "timelineNotes">(
    key: K,
    id: string,
    body: Partial<DataSnapshot[K][number]>
  ): Promise<DataSnapshot[K][number]> {
    return this.mutate((snapshot) => {
      const item = snapshot[key].find((doc) => doc.id === id && !doc.deletedAt);
      if (!item) throw new Error("Document not found");
      Object.assign(item, withoutUndefined(body), { updatedAt: nextUpdatedAt(item.updatedAt, snapshot.manifest.updatedAt) });
      return item;
    });
  }
}

export const localRepository = LocalJsonRepository.create();

function withDoc<T>(value: T, id = makeId()): T & { id: string; createdAt: string; updatedAt: string; deletedAt: null; schemaVersion: number } {
  const t = nowIso();
  return { ...value, id, createdAt: t, updatedAt: t, deletedAt: null, schemaVersion: CURRENT_SCHEMA_VERSION };
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

function sameSettings(left: SettingsDoc, right: SettingsDoc): boolean {
  return left.weightUnit === right.weightUnit
    && left.themeId === right.themeId
    && left.lastSyncAt === right.lastSyncAt;
}

function matchesPerformanceScope(record: ExercisePerformanceRecordDoc, scope: { all?: boolean; exerciseIds?: string[]; sourceWorkoutIds?: string[] }): boolean {
  if (scope.all) return true;
  if (scope.exerciseIds?.includes(record.exerciseId)) return true;
  if (scope.sourceWorkoutIds?.includes(record.sourceWorkoutId)) return true;
  return false;
}

function localDeviceId(): string {
  const key = "ironlog_device_id";
  const existing = localStorage.getItem(key);
  if (existing) return existing;
  const id = makeId();
  localStorage.setItem(key, id);
  return id;
}

function nextUpdatedAt(previous: string, floor: string): string {
  const current = nowIso();
  const latest = previous > floor ? previous : floor;
  if (current > latest) return current;
  return new Date(new Date(latest).getTime() + 1).toISOString();
}

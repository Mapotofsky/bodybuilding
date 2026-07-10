import { CURRENT_SCHEMA_VERSION, type ExerciseDoc, type ExercisePerformanceRecordDoc, type ExerciseType, type PerformanceMetricType, type PerformanceRecordKind, type PerformanceUnit, type WorkoutDoc, type WorkoutExerciseDoc, type WorkoutSetDoc } from "@/core/models";
import { resolveExerciseId } from "@/core/exerciseRedirects";
import { calculateRpeAdjustedRm } from "@/core/rm";
import { convertWeight } from "@/core/workoutMetrics";
import { localRepository } from "@/repositories/localJsonRepository";

export const PERFORMANCE_METRIC_LABELS: Record<PerformanceMetricType, string> = {
  "strength.max_weight": "最大重量",
  "strength.max_reps": "最大次数",
  "strength.max_set_volume": "最大单组容量",
  "strength.max_workout_volume": "最大训练容量",
  "strength.rpe_adjusted_rm_mean": "1RM 预测",
  "cardio.max_distance": "最大距离",
  "cardio.max_duration": "最长时长",
  "cardio.best_average_speed": "最佳平均速度",
  "reps_only.max_set_reps": "最大单组次数",
  "reps_only.max_workout_reps": "最大训练总次数",
  "static_hold.max_set_duration": "最长单组保持",
  "static_hold.max_workout_duration": "最长训练总保持",
};

export interface PerformanceRecord {
  id: string;
  exercise_id: string;
  exercise_name: string | null;
  kind: PerformanceRecordKind;
  metric_type: PerformanceMetricType;
  metric_label: string;
  value: number;
  unit: PerformanceUnit;
  achieved_at: string;
  source_workout_id: string;
  source_workout_exercise_id: string;
  source_set_id: string | null;
  input: ExercisePerformanceRecordDoc["input"];
  rm: ExercisePerformanceRecordDoc["rm"];
}

export interface PerformanceSummary {
  true_pr_count: number;
  rpe_adjusted_rm_count: number;
  top_improvements: Array<{
    record: PerformanceRecord;
    previous_value: number;
    improvement_ratio: number;
  }>;
  recent_records: PerformanceRecord[];
}

export interface ExercisePerformanceTrendPoint {
  date: string;
  value: number;
  unit: PerformanceUnit;
  source_workout_id: string;
}

export interface ExercisePerformanceTrend {
  metric_type: PerformanceMetricType;
  metric_label: string;
  points: ExercisePerformanceTrendPoint[];
}

interface PerformanceCandidate extends ExercisePerformanceRecordDoc {
  tieBreakers: number[];
}

export async function rebuildAllPerformanceRecords(): Promise<void> {
  const snapshot = await localRepository.getSnapshot();
  const records = buildPerformanceRecords(snapshot.workouts, snapshot.exercises);
  await localRepository.replaceExercisePerformanceRecords({ all: true }, records);
}

export async function recordPerformanceForCompletedWorkout(workoutId: string): Promise<void> {
  const snapshot = await localRepository.getSnapshot();
  const workout = snapshot.workouts.find((item) => item.id === workoutId);
  if (!workout || workout.deletedAt || workout.endTime == null) return;

  const records = buildPerformanceRefreshRecordsForWorkout(workout, snapshot.exercises, snapshot.exercisePerformanceRecords);
  const hasExistingRecordsForWorkout = snapshot.exercisePerformanceRecords.some((record) => !record.deletedAt && record.sourceWorkoutId === workout.id);
  if (records.length === 0 && !hasExistingRecordsForWorkout) return;

  await localRepository.replaceExercisePerformanceRecords({ sourceWorkoutIds: [workout.id] }, records);
}

export async function rebuildPerformanceForWorkout(_workoutId: string): Promise<void> {
  await rebuildAllPerformanceRecords();
}

export async function rebuildPerformanceForExercise(_exerciseId: string): Promise<void> {
  await rebuildAllPerformanceRecords();
}

export async function getExercisePerformanceRecords(exerciseId: string): Promise<PerformanceRecord[]> {
  const [records, exercises] = await Promise.all([
    localRepository.listExercisePerformanceRecords({ exerciseId }),
    localRepository.list({ includeDeleted: true }),
  ]);
  return records.map((record) => toPerformanceRecord(record, exercises));
}

export async function getWorkoutPerformanceRecords(workoutId: string): Promise<PerformanceRecord[]> {
  const [records, exercises] = await Promise.all([
    localRepository.listExercisePerformanceRecords({ sourceWorkoutId: workoutId }),
    localRepository.list({ includeDeleted: true }),
  ]);
  return records.map((record) => toPerformanceRecord(record, exercises));
}

export async function getExercisePerformanceTrend(exerciseId: string): Promise<ExercisePerformanceTrend> {
  const snapshot = await localRepository.getSnapshot();
  const exercise = snapshot.exercises.find((item) => item.id === exerciseId);
  const exerciseType = exercise?.type || "strength";
  return buildExercisePerformanceTrend(snapshot.workouts, snapshot.exercises, exerciseId, exerciseType);
}

export function buildExercisePerformanceTrend(
  workouts: WorkoutDoc[],
  exercises: ExerciseDoc[],
  exerciseId: string,
  exerciseType: ExerciseType
): ExercisePerformanceTrend {
  const metricType = trendMetricForType(exerciseType);
  const points = workouts
    .filter((workout) => !workout.deletedAt && workout.endTime != null)
    .slice()
    .sort((left, right) => achievedAt(left).localeCompare(achievedAt(right)) || left.id.localeCompare(right.id))
    .map((workout) => {
      const best = candidatesForWorkout(workout, exercises)
        .filter((candidate) => candidate.exerciseId === exerciseId && candidate.metricType === metricType)
        .sort((left, right) => compareCandidate(right, left))[0];
      if (!best) return null;
      return {
        date: workout.date,
        value: best.value,
        unit: best.unit,
        source_workout_id: workout.id,
      };
    })
    .filter((point): point is ExercisePerformanceTrendPoint => point != null);
  return {
    metric_type: metricType,
    metric_label: PERFORMANCE_METRIC_LABELS[metricType],
    points,
  };
}

export async function getPeriodPerformanceSummary(params: { from: string; to: string }): Promise<PerformanceSummary> {
  const [records, exercises] = await Promise.all([
    localRepository.listExercisePerformanceRecords({ includeDeleted: false }),
    localRepository.list({ includeDeleted: true }),
  ]);
  const sorted = records.slice().sort((left, right) => left.achievedAt.localeCompare(right.achievedAt));
  const periodRecords = sorted.filter((record) => record.achievedAt.slice(0, 10) >= params.from && record.achievedAt.slice(0, 10) <= params.to);
  const periodDtos = periodRecords
    .slice()
    .sort((left, right) => right.achievedAt.localeCompare(left.achievedAt))
    .map((record) => toPerformanceRecord(record, exercises));
  const top = periodRecords
    .map((record) => {
      const previous = sorted
        .filter((item) => item.exerciseId === record.exerciseId && item.metricType === record.metricType && item.achievedAt < record.achievedAt)
        .sort((left, right) => right.achievedAt.localeCompare(left.achievedAt))[0];
      if (!previous || previous.value <= 0) return null;
      return {
        record: toPerformanceRecord(record, exercises),
        previous_value: previous.value,
        improvement_ratio: (record.value - previous.value) / previous.value,
      };
    })
    .filter((item): item is NonNullable<typeof item> => item != null && item.improvement_ratio > 0)
    .sort((left, right) => right.improvement_ratio - left.improvement_ratio)
    .slice(0, 3);
  return {
    true_pr_count: periodRecords.filter((record) => record.kind === "true_pr").length,
    rpe_adjusted_rm_count: periodRecords.filter((record) => record.kind === "rpe_adjusted_rm").length,
    top_improvements: top,
    recent_records: periodDtos.slice(0, 5),
  };
}

function trendMetricForType(exerciseType: ExerciseType): PerformanceMetricType {
  if (exerciseType === "strength") return "strength.rpe_adjusted_rm_mean";
  if (exerciseType === "cardio") return "cardio.best_average_speed";
  if (exerciseType === "reps_only") return "reps_only.max_set_reps";
  return "static_hold.max_set_duration";
}

export function buildPerformanceRecords(workouts: WorkoutDoc[], exercises: ExerciseDoc[]): ExercisePerformanceRecordDoc[] {
  const candidates = workouts
    .filter((workout) => !workout.deletedAt && workout.endTime != null)
    .slice()
    .sort((left, right) => achievedAt(left).localeCompare(achievedAt(right)) || left.id.localeCompare(right.id))
    .flatMap((workout) => candidatesForWorkout(workout, exercises));
  const best = new Map<string, PerformanceCandidate>();
  const records: ExercisePerformanceRecordDoc[] = [];
  for (const candidate of candidates) {
    const key = `${candidate.exerciseId}:${candidate.metricType}`;
    const previous = best.get(key);
    if (!previous || compareCandidate(candidate, previous) > 0) {
      records.push(stripCandidate(candidate));
      best.set(key, candidate);
    }
  }
  return records;
}

export function buildPerformanceRefreshRecordsForWorkout(
  workout: WorkoutDoc,
  exercises: ExerciseDoc[],
  existingRecords: ExercisePerformanceRecordDoc[]
): ExercisePerformanceRecordDoc[] {
  if (workout.deletedAt || workout.endTime == null) return [];

  const previousBest = bestCandidatesByKey(
    existingRecords
      .filter((record) => !record.deletedAt && record.sourceWorkoutId !== workout.id)
      .map(candidateFromRecord)
  );
  const workoutBest = bestCandidatesByKey(candidatesForWorkout(workout, exercises));
  const records: ExercisePerformanceRecordDoc[] = [];

  for (const [key, candidate] of workoutBest) {
    const previous = previousBest.get(key);
    if (!previous || compareCandidate(candidate, previous) > 0) {
      records.push(stripCandidate(candidate));
    }
  }

  return records.sort((left, right) => left.achievedAt.localeCompare(right.achievedAt) || left.id.localeCompare(right.id));
}

function bestCandidatesByKey(candidates: PerformanceCandidate[]): Map<string, PerformanceCandidate> {
  const best = new Map<string, PerformanceCandidate>();
  for (const candidate of candidates) {
    const key = performanceKey(candidate);
    const previous = best.get(key);
    if (!previous || compareCandidate(candidate, previous) > 0) best.set(key, candidate);
  }
  return best;
}

function candidatesForWorkout(workout: WorkoutDoc, exercises: ExerciseDoc[]): PerformanceCandidate[] {
  return workout.exercises.flatMap((exercise) => {
    const resolved = resolveExerciseId(exercise.exerciseId, exercises);
    const exerciseId = resolved.status === "resolved" ? resolved.resolvedId : exercise.exerciseId;
    const sourceTime = achievedAt(workout);
    const baseUpdatedAt = maxIso(workout.updatedAt, sourceTime);
    if (exercise.exerciseType === "strength") return strengthCandidates(workout, exercise, exerciseId, sourceTime, baseUpdatedAt);
    if (exercise.exerciseType === "cardio") return cardioCandidates(workout, exercise, exerciseId, sourceTime, baseUpdatedAt);
    if (exercise.exerciseType === "reps_only") return repsOnlyCandidates(workout, exercise, exerciseId, sourceTime, baseUpdatedAt);
    return staticHoldCandidates(workout, exercise, exerciseId, sourceTime, baseUpdatedAt);
  });
}

function strengthCandidates(workout: WorkoutDoc, exercise: WorkoutExerciseDoc, exerciseId: string, sourceTime: string, updatedAt: string): PerformanceCandidate[] {
  const candidates: PerformanceCandidate[] = [];
  const workingSets = exercise.sets.filter((set) => !set.isWarmup);
  let workoutVolumeKgReps = 0;
  for (const set of workingSets) {
    const weightKg = set.weight == null ? null : convertWeight(set.weight, set.unit, "kg");
    const setVolume = weightKg != null && set.reps != null ? weightKg * set.reps : null;
    if (setVolume != null) workoutVolumeKgReps += setVolume;
    if (weightKg != null) candidates.push(makeCandidate({ workout, exercise, exerciseId, set, kind: "true_pr", metricType: "strength.max_weight", value: weightKg, unit: "kg", achievedAt: sourceTime, updatedAt, tieBreakers: [set.reps ?? 0], input: inputSummary({ weightKg, reps: set.reps, rpe: set.rpe, workoutVolumeKgReps: null }) }));
    if (set.reps != null) candidates.push(makeCandidate({ workout, exercise, exerciseId, set, kind: "true_pr", metricType: "strength.max_reps", value: set.reps, unit: "reps", achievedAt: sourceTime, updatedAt, tieBreakers: [weightKg ?? 0], input: inputSummary({ weightKg, reps: set.reps, rpe: set.rpe, workoutVolumeKgReps: null }) }));
    if (setVolume != null) candidates.push(makeCandidate({ workout, exercise, exerciseId, set, kind: "true_pr", metricType: "strength.max_set_volume", value: setVolume, unit: "kg_reps", achievedAt: sourceTime, updatedAt, tieBreakers: [weightKg ?? 0, set.reps ?? 0], input: inputSummary({ weightKg, reps: set.reps, rpe: set.rpe, workoutVolumeKgReps: null }) }));
    if (weightKg != null && set.reps != null && set.rpe != null) {
      const rm = calculateRpeAdjustedRm({ weightKg, reps: set.reps, rpe: set.rpe });
      if (rm) candidates.push(makeCandidate({ workout, exercise, exerciseId, set, kind: "rpe_adjusted_rm", metricType: "strength.rpe_adjusted_rm_mean", value: rm.formulas.meanKg, unit: "kg", achievedAt: sourceTime, updatedAt, tieBreakers: [weightKg, set.reps], input: inputSummary({ weightKg, reps: set.reps, rpe: set.rpe, effectiveReps: rm.effectiveReps, workoutVolumeKgReps: null }), rm: rm.formulas }));
    }
  }
  if (workoutVolumeKgReps > 0) candidates.push(makeCandidate({ workout, exercise, exerciseId, set: null, kind: "true_pr", metricType: "strength.max_workout_volume", value: workoutVolumeKgReps, unit: "kg_reps", achievedAt: sourceTime, updatedAt, tieBreakers: [workingSets.length], input: inputSummary({ workoutVolumeKgReps }) }));
  return candidates;
}

function cardioCandidates(workout: WorkoutDoc, exercise: WorkoutExerciseDoc, exerciseId: string, sourceTime: string, updatedAt: string): PerformanceCandidate[] {
  const candidates: PerformanceCandidate[] = [];
  for (const set of exercise.sets.filter((item) => !item.isWarmup)) {
    if (set.distanceM != null) candidates.push(makeCandidate({ workout, exercise, exerciseId, set, kind: "true_pr", metricType: "cardio.max_distance", value: set.distanceM, unit: "m", achievedAt: sourceTime, updatedAt, tieBreakers: [set.durationSec ?? 0], input: inputSummary({ distanceM: set.distanceM, durationSec: set.durationSec }) }));
    if (set.durationSec != null) candidates.push(makeCandidate({ workout, exercise, exerciseId, set, kind: "true_pr", metricType: "cardio.max_duration", value: set.durationSec, unit: "sec", achievedAt: sourceTime, updatedAt, tieBreakers: [set.distanceM ?? 0], input: inputSummary({ distanceM: set.distanceM, durationSec: set.durationSec }) }));
    if (set.distanceM != null && set.durationSec != null && set.durationSec > 0) candidates.push(makeCandidate({ workout, exercise, exerciseId, set, kind: "true_pr", metricType: "cardio.best_average_speed", value: set.distanceM / set.durationSec, unit: "m_per_sec", achievedAt: sourceTime, updatedAt, tieBreakers: [set.distanceM], input: inputSummary({ distanceM: set.distanceM, durationSec: set.durationSec }) }));
  }
  return candidates;
}

function repsOnlyCandidates(workout: WorkoutDoc, exercise: WorkoutExerciseDoc, exerciseId: string, sourceTime: string, updatedAt: string): PerformanceCandidate[] {
  const candidates: PerformanceCandidate[] = [];
  let workoutReps = 0;
  for (const set of exercise.sets.filter((item) => !item.isWarmup)) {
    if (set.reps == null) continue;
    workoutReps += set.reps;
    candidates.push(makeCandidate({ workout, exercise, exerciseId, set, kind: "true_pr", metricType: "reps_only.max_set_reps", value: set.reps, unit: "reps", achievedAt: sourceTime, updatedAt, tieBreakers: [], input: inputSummary({ reps: set.reps }) }));
  }
  if (workoutReps > 0) candidates.push(makeCandidate({ workout, exercise, exerciseId, set: null, kind: "true_pr", metricType: "reps_only.max_workout_reps", value: workoutReps, unit: "reps", achievedAt: sourceTime, updatedAt, tieBreakers: [], input: inputSummary({ reps: workoutReps }) }));
  return candidates;
}

function staticHoldCandidates(workout: WorkoutDoc, exercise: WorkoutExerciseDoc, exerciseId: string, sourceTime: string, updatedAt: string): PerformanceCandidate[] {
  const candidates: PerformanceCandidate[] = [];
  let workoutDuration = 0;
  for (const set of exercise.sets.filter((item) => !item.isWarmup)) {
    if (set.durationSec == null) continue;
    workoutDuration += set.durationSec;
    candidates.push(makeCandidate({ workout, exercise, exerciseId, set, kind: "true_pr", metricType: "static_hold.max_set_duration", value: set.durationSec, unit: "sec", achievedAt: sourceTime, updatedAt, tieBreakers: [], input: inputSummary({ durationSec: set.durationSec }) }));
  }
  if (workoutDuration > 0) candidates.push(makeCandidate({ workout, exercise, exerciseId, set: null, kind: "true_pr", metricType: "static_hold.max_workout_duration", value: workoutDuration, unit: "sec", achievedAt: sourceTime, updatedAt, tieBreakers: [], input: inputSummary({ durationSec: workoutDuration }) }));
  return candidates;
}

function makeCandidate(params: {
  workout: WorkoutDoc;
  exercise: WorkoutExerciseDoc;
  exerciseId: string;
  set: WorkoutSetDoc | null;
  kind: PerformanceRecordKind;
  metricType: PerformanceMetricType;
  value: number;
  unit: PerformanceUnit;
  achievedAt: string;
  updatedAt: string;
  tieBreakers: number[];
  input: ExercisePerformanceRecordDoc["input"];
  rm?: ExercisePerformanceRecordDoc["rm"];
}): PerformanceCandidate {
  return {
    id: performanceId(params),
    exerciseId: params.exerciseId,
    kind: params.kind,
    metricType: params.metricType,
    value: round(params.value),
    unit: params.unit,
    achievedAt: params.achievedAt,
    sourceWorkoutId: params.workout.id,
    sourceWorkoutExerciseId: params.exercise.id,
    sourceSetId: params.set?.id ?? null,
    input: params.input,
    rm: params.rm ? roundRm(params.rm) : null,
    createdAt: params.achievedAt,
    updatedAt: params.updatedAt,
    deletedAt: null,
    schemaVersion: CURRENT_SCHEMA_VERSION,
    tieBreakers: params.tieBreakers.map(round),
  };
}

function performanceId(params: Pick<Parameters<typeof makeCandidate>[0], "workout" | "exercise" | "set" | "kind" | "metricType">): string {
  return `performance:${params.metricType}:${params.workout.id}:${params.exercise.id}:${params.set?.id ?? "workout"}:${params.kind}`;
}

function inputSummary(values: Partial<ExercisePerformanceRecordDoc["input"]>): ExercisePerformanceRecordDoc["input"] {
  return {
    weightKg: values.weightKg == null ? null : round(values.weightKg),
    reps: values.reps ?? null,
    rpe: values.rpe ?? null,
    effectiveReps: values.effectiveReps ?? null,
    distanceM: values.distanceM ?? null,
    durationSec: values.durationSec ?? null,
    workoutVolumeKgReps: values.workoutVolumeKgReps == null ? null : round(values.workoutVolumeKgReps),
  };
}

function candidateFromRecord(record: ExercisePerformanceRecordDoc): PerformanceCandidate {
  return {
    ...record,
    tieBreakers: tieBreakersFromRecord(record),
  };
}

function tieBreakersFromRecord(record: ExercisePerformanceRecordDoc): number[] {
  if (record.metricType === "strength.max_weight") return [record.input.reps ?? 0];
  if (record.metricType === "strength.max_reps") return [record.input.weightKg ?? 0];
  if (record.metricType === "strength.max_set_volume") return [record.input.weightKg ?? 0, record.input.reps ?? 0];
  if (record.metricType === "strength.rpe_adjusted_rm_mean") return [record.input.weightKg ?? 0, record.input.reps ?? 0];
  if (record.metricType === "cardio.max_distance") return [record.input.durationSec ?? 0];
  if (record.metricType === "cardio.max_duration") return [record.input.distanceM ?? 0];
  if (record.metricType === "cardio.best_average_speed") return [record.input.distanceM ?? 0];
  return [];
}

function compareCandidate(left: PerformanceCandidate, right: PerformanceCandidate): number {
  const primary = left.value - right.value;
  if (Math.abs(primary) > 1e-9) return primary;
  const length = Math.max(left.tieBreakers.length, right.tieBreakers.length);
  for (let index = 0; index < length; index += 1) {
    const diff = (left.tieBreakers[index] ?? 0) - (right.tieBreakers[index] ?? 0);
    if (Math.abs(diff) > 1e-9) return diff;
  }
  return 0;
}

function performanceKey(record: Pick<ExercisePerformanceRecordDoc, "exerciseId" | "metricType">): string {
  return `${record.exerciseId}:${record.metricType}`;
}

function stripCandidate(candidate: PerformanceCandidate): ExercisePerformanceRecordDoc {
  const { tieBreakers: _tieBreakers, ...record } = candidate;
  return record;
}

function toPerformanceRecord(record: ExercisePerformanceRecordDoc, exercises: ExerciseDoc[]): PerformanceRecord {
  const exercise = exercises.find((item) => item.id === record.exerciseId);
  return {
    id: record.id,
    exercise_id: record.exerciseId,
    exercise_name: exercise?.name ?? null,
    kind: record.kind,
    metric_type: record.metricType,
    metric_label: PERFORMANCE_METRIC_LABELS[record.metricType],
    value: record.value,
    unit: record.unit,
    achieved_at: record.achievedAt,
    source_workout_id: record.sourceWorkoutId,
    source_workout_exercise_id: record.sourceWorkoutExerciseId,
    source_set_id: record.sourceSetId,
    input: record.input,
    rm: record.rm,
  };
}

function achievedAt(workout: WorkoutDoc): string {
  return workout.endTime || `${workout.date}T23:59:59.999Z`;
}

function maxIso(left: string, right: string): string {
  return left > right ? left : right;
}

function round(value: number): number {
  return Math.round(value * 1_000_000) / 1_000_000;
}

function roundRm(rm: NonNullable<ExercisePerformanceRecordDoc["rm"]>): NonNullable<ExercisePerformanceRecordDoc["rm"]> {
  return {
    epleyKg: round(rm.epleyKg),
    brzyckiKg: round(rm.brzyckiKg),
    lombardiKg: round(rm.lombardiKg),
    wathenKg: round(rm.wathenKg),
    meanKg: round(rm.meanKg),
    standardDeviationKg: round(rm.standardDeviationKg),
    minKg: round(rm.minKg),
    maxKg: round(rm.maxKg),
  };
}

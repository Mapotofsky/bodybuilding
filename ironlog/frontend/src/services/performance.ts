import {
  CURRENT_SCHEMA_VERSION,
  type ExerciseDoc,
  type ExercisePerformanceRecordDoc,
  type PerformanceMetricType,
  type PerformanceRecordKind,
  type PerformanceUnit,
  type RecordingMode,
  type WorkoutDoc,
  type WorkoutExerciseDoc,
  type WorkoutSetDoc,
} from "@/core/models";
import { resolveExerciseId } from "@/core/exerciseRedirects";
import { comparePerformanceValues, getPerformanceMetricSpec } from "@/core/performanceMetrics";
import { getRecordingModeSpec, recordingConfigOf, validateRecordingConfig } from "@/core/recordingModes";
import { calculateRpeAdjustedRm } from "@/core/rm";
import {
  calculateSetDistanceRateMps,
  calculateSetLoadDistanceKgM,
  calculateSetLoadDistanceRateKgMps,
  calculateSetLoadDurationKgSec,
  calculateSetVolumeKgReps,
  convertWeight,
  effectiveLoadKg,
} from "@/core/workoutMetrics";
import { localRepository } from "@/repositories/localJsonRepository";

export const PERFORMANCE_METRIC_LABELS: Record<PerformanceMetricType, string> = {
  "weight.max_input": "最大输入重量",
  "weight.max_effective": "最大有效负重",
  "reps.max_set": "最大单组次数",
  "reps.max_workout": "最大训练总次数",
  "volume.max_set": "最大单组容量",
  "volume.max_workout": "最大训练容量",
  "rm.rpe_adjusted_mean": "1RM 预测",
  "assistance.best_reps": "最佳辅助次数",
  "assistance.min_weight": "最低辅助重量",
  "distance.max_set": "最大单组距离",
  "distance.max_workout": "最大训练距离",
  "duration.max_set": "最长单组时间",
  "duration.max_workout": "最长训练时间",
  "speed.max": "最快速度",
  "load_duration.max": "最大持续负载",
  "load_distance.max": "最大距离负载",
  "load_distance_rate.max": "最大单位时间负载",
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
  const hasExistingRecordsForWorkout = snapshot.exercisePerformanceRecords
    .some((record) => !record.deletedAt && record.sourceWorkoutId === workout.id);
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
  const exercise = snapshot.exercises.find((item) => item.id === exerciseId && !item.deletedAt);
  if (!exercise) throw new Error("动作不存在");
  return buildExercisePerformanceTrend(snapshot.workouts, snapshot.exercises, exerciseId, exercise.recordingMode);
}

export function buildExercisePerformanceTrend(
  workouts: WorkoutDoc[],
  exercises: ExerciseDoc[],
  exerciseId: string,
  recordingMode: RecordingMode
): ExercisePerformanceTrend {
  const exercise = exercises.find((item) => item.id === exerciseId);
  if (!exercise) throw new Error("动作不存在");
  const metricType = trendMetricForConfig(exercise);
  if (exercise.recordingMode !== recordingMode) throw new Error("趋势记录方式与动作配置不一致");
  const points = workouts
    .filter((workout) => !workout.deletedAt && workout.endTime != null)
    .slice()
    .sort((left, right) => achievedAt(left).localeCompare(achievedAt(right)) || left.id.localeCompare(right.id))
    .map((workout) => {
      const best = candidatesForWorkout(workout, exercises)
        .filter((candidate) => candidate.exerciseId === exerciseId && candidate.metricType === metricType)
        .sort((left, right) => compareCandidate(right, left))[0];
      if (!best) return null;
      return { date: workout.date, value: best.value, unit: best.unit, source_workout_id: workout.id };
    })
    .filter((point): point is ExercisePerformanceTrendPoint => point != null);
  return { metric_type: metricType, metric_label: PERFORMANCE_METRIC_LABELS[metricType], points };
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
      const direction = getPerformanceMetricSpec(record.metricType).direction;
      const improvementRatio = direction === "max"
        ? (record.value - previous.value) / previous.value
        : (previous.value - record.value) / previous.value;
      return {
        record: toPerformanceRecord(record, exercises),
        previous_value: previous.value,
        improvement_ratio: improvementRatio,
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

export function buildPerformanceRecords(workouts: WorkoutDoc[], exercises: ExerciseDoc[]): ExercisePerformanceRecordDoc[] {
  const candidates = workouts
    .filter((workout) => !workout.deletedAt && workout.endTime != null)
    .slice()
    .sort((left, right) => achievedAt(left).localeCompare(achievedAt(right)) || left.id.localeCompare(right.id))
    .flatMap((workout) => candidatesForWorkout(workout, exercises));
  const best = new Map<string, PerformanceCandidate>();
  const records: ExercisePerformanceRecordDoc[] = [];
  for (const candidate of candidates) {
    const key = performanceKey(candidate);
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
  const previousBest = bestCandidatesByKey(existingRecords
    .filter((record) => !record.deletedAt && record.sourceWorkoutId !== workout.id)
    .map(candidateFromRecord));
  const workoutBest = bestCandidatesByKey(candidatesForWorkout(workout, exercises));
  const records: ExercisePerformanceRecordDoc[] = [];
  for (const [key, candidate] of workoutBest) {
    const previous = previousBest.get(key);
    if (!previous || compareCandidate(candidate, previous) > 0) records.push(stripCandidate(candidate));
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
    validateRecordingConfig(recordingConfigOf(exercise));
    const resolved = resolveExerciseId(exercise.exerciseId, exercises);
    if (resolved.status === "unresolved" && resolved.reason !== "missing") return [];
    const exerciseId = resolved.status === "resolved" ? resolved.resolvedId : exercise.exerciseId;
    return exerciseCandidates(workout, exercise, exerciseId, achievedAt(workout), maxIso(workout.updatedAt, achievedAt(workout)));
  });
}

function exerciseCandidates(
  workout: WorkoutDoc,
  exercise: WorkoutExerciseDoc,
  exerciseId: string,
  sourceTime: string,
  updatedAt: string
): PerformanceCandidate[] {
  const spec = getRecordingModeSpec(exercise.recordingMode);
  const workingSets = exercise.sets.filter((set) => !set.isWarmup);
  const candidates: PerformanceCandidate[] = [];
  let workoutReps = 0;
  let workoutDistanceM = 0;
  let workoutDurationSec = 0;
  let workoutVolumeKgReps = 0;

  for (const set of workingSets) {
    const enteredLoadKg = set.weight == null ? null : convertWeight(set.weight, set.unit, "kg");
    const effectiveKg = set.weight == null || !exercise.loadBasis
      ? null
      : effectiveLoadKg(set.weight, set.unit, exercise.loadBasis);
    const input = setInput(exercise, set, effectiveKg);

    if (spec.performance.base.includes("load") && enteredLoadKg != null && effectiveKg != null) {
      if (exercise.loadDirection === "higher_better") {
        if (exercise.loadBasis === "per_hand") {
          candidates.push(candidate({ workout, exercise, exerciseId, set, metricType: "weight.max_input", value: enteredLoadKg, sourceTime, updatedAt, input }));
        }
        candidates.push(candidate({ workout, exercise, exerciseId, set, metricType: "weight.max_effective", value: effectiveKg, sourceTime, updatedAt, input }));
      } else if (exercise.loadDirection === "lower_better") {
        candidates.push(candidate({ workout, exercise, exerciseId, set, metricType: "assistance.min_weight", value: effectiveKg, sourceTime, updatedAt, input }));
      }
    }

    if (spec.performance.base.includes("reps") && set.reps != null) {
      workoutReps += set.reps;
      const metricType = exercise.loadDirection === "lower_better" ? "assistance.best_reps" : "reps.max_set";
      candidates.push(candidate({ workout, exercise, exerciseId, set, metricType, value: set.reps, sourceTime, updatedAt, input }));
    }
    if (spec.performance.base.includes("distance") && set.distanceM != null) {
      workoutDistanceM += set.distanceM;
      candidates.push(candidate({ workout, exercise, exerciseId, set, metricType: "distance.max_set", value: set.distanceM, sourceTime, updatedAt, input }));
    }
    if (spec.performance.base.includes("duration") && set.durationSec != null) {
      workoutDurationSec += set.durationSec;
      candidates.push(candidate({ workout, exercise, exerciseId, set, metricType: "duration.max_set", value: set.durationSec, sourceTime, updatedAt, input }));
    }

    if (exercise.loadDirection === "higher_better" && exercise.loadBasis) {
      if (spec.performance.compound.includes("volume")) {
        const volume = calculateSetVolumeKgReps(set, exercise.loadBasis);
        if (volume != null) {
          workoutVolumeKgReps += volume;
          candidates.push(candidate({ workout, exercise, exerciseId, set, metricType: "volume.max_set", value: volume, sourceTime, updatedAt, input }));
        }
      }
      if (spec.performance.compound.includes("rpe_adjusted_rm") && effectiveKg != null && set.reps != null && set.rpe != null) {
        const rm = calculateRpeAdjustedRm({ weightKg: effectiveKg, reps: set.reps, rpe: set.rpe });
        if (rm) {
          candidates.push(candidate({
            workout,
            exercise,
            exerciseId,
            set,
            metricType: "rm.rpe_adjusted_mean",
            value: rm.formulas.meanKg,
            sourceTime,
            updatedAt,
            input: { ...input, effectiveReps: rm.effectiveReps },
            kind: "rpe_adjusted_rm",
            rm: rm.formulas,
          }));
        }
      }
      if (spec.performance.compound.includes("load_duration")) {
        const value = calculateSetLoadDurationKgSec(set, exercise.loadBasis);
        if (value != null) candidates.push(candidate({ workout, exercise, exerciseId, set, metricType: "load_duration.max", value, sourceTime, updatedAt, input }));
      }
      if (spec.performance.compound.includes("load_duration_without_distance") && set.distanceM == null) {
        const value = calculateSetLoadDurationKgSec(set, exercise.loadBasis);
        if (value != null) candidates.push(candidate({ workout, exercise, exerciseId, set, metricType: "load_duration.max", value, sourceTime, updatedAt, input }));
      }
      if (spec.performance.compound.includes("load_distance")) {
        const value = calculateSetLoadDistanceKgM(set, exercise.loadBasis);
        if (value != null) candidates.push(candidate({ workout, exercise, exerciseId, set, metricType: "load_distance.max", value, sourceTime, updatedAt, input }));
      }
      if (spec.performance.compound.includes("load_distance_rate") && exercise.rateMetric === "load_distance_per_time") {
        const value = calculateSetLoadDistanceRateKgMps(set, exercise.loadBasis);
        if (value != null) candidates.push(candidate({ workout, exercise, exerciseId, set, metricType: "load_distance_rate.max", value, sourceTime, updatedAt, input }));
      }
    }
    if (spec.performance.compound.includes("distance_rate") && exercise.rateMetric === "distance_per_time") {
      const value = calculateSetDistanceRateMps(set);
      if (value != null) candidates.push(candidate({ workout, exercise, exerciseId, set, metricType: "speed.max", value, sourceTime, updatedAt, input }));
    }
  }

  if (workoutReps > 0 && exercise.loadDirection !== "lower_better") {
    candidates.push(candidate({ workout, exercise, exerciseId, set: null, metricType: "reps.max_workout", value: workoutReps, sourceTime, updatedAt, input: inputSummary({ reps: workoutReps }) }));
  }
  if (workoutDistanceM > 0) {
    candidates.push(candidate({ workout, exercise, exerciseId, set: null, metricType: "distance.max_workout", value: workoutDistanceM, sourceTime, updatedAt, input: inputSummary({ distanceM: workoutDistanceM, durationSec: workoutDurationSec || null }) }));
  }
  if (workoutDurationSec > 0) {
    candidates.push(candidate({ workout, exercise, exerciseId, set: null, metricType: "duration.max_workout", value: workoutDurationSec, sourceTime, updatedAt, input: inputSummary({ durationSec: workoutDurationSec, distanceM: workoutDistanceM || null }) }));
  }
  if (workoutVolumeKgReps > 0) {
    candidates.push(candidate({ workout, exercise, exerciseId, set: null, metricType: "volume.max_workout", value: workoutVolumeKgReps, sourceTime, updatedAt, input: inputSummary({ workoutVolumeKgReps, reps: workoutReps || null }) }));
  }
  return candidates;
}

function candidate(params: {
  workout: WorkoutDoc;
  exercise: WorkoutExerciseDoc;
  exerciseId: string;
  set: WorkoutSetDoc | null;
  metricType: PerformanceMetricType;
  value: number;
  sourceTime: string;
  updatedAt: string;
  input: ExercisePerformanceRecordDoc["input"];
  kind?: PerformanceRecordKind;
  rm?: ExercisePerformanceRecordDoc["rm"];
}): PerformanceCandidate {
  const metricSpec = getPerformanceMetricSpec(params.metricType);
  return {
    id: performanceId(params),
    exerciseId: params.exerciseId,
    kind: params.kind ?? "true_pr",
    metricType: params.metricType,
    value: round(params.value),
    unit: metricSpec.unit,
    achievedAt: params.sourceTime,
    sourceWorkoutId: params.workout.id,
    sourceWorkoutExerciseId: params.exercise.id,
    sourceSetId: params.set?.id ?? null,
    input: roundInput(params.input),
    rm: params.rm ? roundRm(params.rm) : null,
    createdAt: params.sourceTime,
    updatedAt: params.updatedAt,
    deletedAt: null,
    schemaVersion: CURRENT_SCHEMA_VERSION,
    tieBreakers: tieBreakersFor(params.metricType, params.input),
  };
}

function performanceId(params: {
  workout: WorkoutDoc;
  exercise: WorkoutExerciseDoc;
  set: WorkoutSetDoc | null;
  metricType: PerformanceMetricType;
  kind?: PerformanceRecordKind;
}): string {
  return `performance:${params.metricType}:${params.workout.id}:${params.exercise.id}:${params.set?.id ?? "workout"}:${params.kind ?? "true_pr"}`;
}

function setInput(exercise: WorkoutExerciseDoc, set: WorkoutSetDoc, effectiveKg: number | null): ExercisePerformanceRecordDoc["input"] {
  return inputSummary({
    enteredLoad: set.weight,
    enteredLoadUnit: set.weight == null ? null : set.unit,
    effectiveLoadKg: effectiveKg,
    loadBasis: exercise.loadBasis,
    loadDirection: exercise.loadDirection,
    reps: set.reps,
    rpe: set.rpe,
    distanceM: set.distanceM,
    durationSec: set.durationSec,
  });
}

function inputSummary(values: Partial<ExercisePerformanceRecordDoc["input"]>): ExercisePerformanceRecordDoc["input"] {
  return {
    enteredLoad: values.enteredLoad ?? null,
    enteredLoadUnit: values.enteredLoadUnit ?? null,
    effectiveLoadKg: values.effectiveLoadKg ?? null,
    loadBasis: values.loadBasis ?? null,
    loadDirection: values.loadDirection ?? null,
    reps: values.reps ?? null,
    rpe: values.rpe ?? null,
    effectiveReps: values.effectiveReps ?? null,
    distanceM: values.distanceM ?? null,
    durationSec: values.durationSec ?? null,
    workoutVolumeKgReps: values.workoutVolumeKgReps ?? null,
  };
}

function roundInput(input: ExercisePerformanceRecordDoc["input"]): ExercisePerformanceRecordDoc["input"] {
  return {
    ...input,
    enteredLoad: input.enteredLoad == null ? null : round(input.enteredLoad),
    effectiveLoadKg: input.effectiveLoadKg == null ? null : round(input.effectiveLoadKg),
    distanceM: input.distanceM == null ? null : round(input.distanceM),
    workoutVolumeKgReps: input.workoutVolumeKgReps == null ? null : round(input.workoutVolumeKgReps),
  };
}

function candidateFromRecord(record: ExercisePerformanceRecordDoc): PerformanceCandidate {
  return { ...record, tieBreakers: tieBreakersFor(record.metricType, record.input) };
}

function tieBreakersFor(metricType: PerformanceMetricType, input: ExercisePerformanceRecordDoc["input"]): number[] {
  switch (metricType) {
    case "weight.max_input":
    case "weight.max_effective":
      return [input.reps ?? 0, input.distanceM ?? 0, input.durationSec ?? 0];
    case "reps.max_set": return [input.effectiveLoadKg ?? 0];
    case "reps.max_workout": return [input.reps ?? 0];
    case "volume.max_set": return [input.effectiveLoadKg ?? 0, input.reps ?? 0];
    case "volume.max_workout": return [input.reps ?? 0];
    case "rm.rpe_adjusted_mean": return [input.effectiveLoadKg ?? 0, input.reps ?? 0];
    case "assistance.best_reps": return [input.effectiveLoadKg ?? Number.MAX_SAFE_INTEGER];
    case "assistance.min_weight": return [input.reps ?? input.durationSec ?? input.distanceM ?? 0];
    case "distance.max_set":
    case "distance.max_workout": return [input.durationSec ?? Number.MAX_SAFE_INTEGER];
    case "duration.max_set":
    case "duration.max_workout": return [input.distanceM ?? 0];
    case "speed.max": return [input.distanceM ?? 0, input.durationSec ?? Number.MAX_SAFE_INTEGER];
    case "load_duration.max": return [input.effectiveLoadKg ?? 0, input.durationSec ?? 0];
    case "load_distance.max":
    case "load_distance_rate.max": return [input.effectiveLoadKg ?? 0, input.distanceM ?? 0, input.durationSec ?? Number.MAX_SAFE_INTEGER];
  }
}

function compareCandidate(left: PerformanceCandidate, right: PerformanceCandidate): number {
  return comparePerformanceValues({
    metricType: left.metricType,
    leftValue: left.value,
    rightValue: right.value,
    leftTieBreakers: left.tieBreakers,
    rightTieBreakers: right.tieBreakers,
  });
}

function trendMetricForConfig(exercise: ExerciseDoc): PerformanceMetricType {
  validateRecordingConfig(recordingConfigOf(exercise));
  switch (exercise.recordingMode) {
    case "weight_reps":
      return exercise.loadDirection === "lower_better" ? "assistance.best_reps" : "rm.rpe_adjusted_mean";
    case "reps": return "reps.max_set";
    case "duration": return "duration.max_set";
    case "distance_duration": return exercise.rateMetric === "distance_per_time" ? "speed.max" : "distance.max_set";
    case "weight_duration": return exercise.loadDirection === "lower_better" ? "duration.max_set" : "load_duration.max";
    case "weight_distance_duration":
      if (exercise.rateMetric === "load_distance_per_time") return "load_distance_rate.max";
      if (exercise.rateMetric === "distance_per_time") return "speed.max";
      return exercise.loadDirection === "lower_better" ? "distance.max_set" : "load_distance.max";
  }
}

function performanceKey(record: Pick<ExercisePerformanceRecordDoc, "exerciseId" | "metricType">): string {
  return `${record.exerciseId}:${record.metricType}`;
}

function stripCandidate(candidateValue: PerformanceCandidate): ExercisePerformanceRecordDoc {
  const { tieBreakers: _tieBreakers, ...record } = candidateValue;
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

import type {
  CountBasis,
  ContextKind,
  LoadBasis,
  LoadDirection,
  RateMetric,
  RecordingMode,
  WeightUnit,
  WorkoutSetDoc,
} from "./models";

export type RecordingField = "weight" | "reps" | "distanceM" | "durationSec";
export type SetValidationPhase = "draft" | "complete";
export type BasePerformanceStrategy = "load" | "reps" | "distance" | "duration";
export type CompoundPerformanceStrategy =
  | "volume"
  | "rpe_adjusted_rm"
  | "reps_rate"
  | "distance_rate"
  | "load_duration"
  | "load_duration_without_distance"
  | "load_distance"
  | "load_distance_rate";

export interface RecordingConfig {
  recordingMode: RecordingMode;
  loadBasis: LoadBasis | null;
  countBasis: CountBasis;
  loadDirection: LoadDirection | null;
  rateMetric: RateMetric;
  contextKind?: ContextKind;
}

export interface RecordingModeSpec {
  fields: readonly RecordingField[];
  requiredAll: readonly RecordingField[];
  requiredOneOf: readonly (readonly RecordingField[])[];
  allowedLoadBases: readonly LoadBasis[];
  allowedLoadDirections: readonly LoadDirection[];
  supportedRateMetrics: readonly RateMetric[];
  performance: {
    base: readonly BasePerformanceStrategy[];
    compound: readonly CompoundPerformanceStrategy[];
  };
}

export interface RecordingSetInput {
  weight?: number | null;
  reps?: number | null;
  distanceM?: number | null;
  durationSec?: number | null;
  contextValue?: number | null;
}

export interface RecordingFieldSpec {
  numericType: "finite" | "integer";
  min: number;
  max: number;
}

export const RECORDING_LIMITS = {
  maxWeight: 2_000,
  maxReps: 10_000,
  maxDurationSeconds: 86_400,
  maxDistanceMeters: 1_000_000,
  maxResistanceLevel: 200,
  maxInclinePercent: 100,
} as const;

export const RECORDING_FIELD_SPECS: Record<RecordingField, RecordingFieldSpec> = {
  weight: { numericType: "finite", min: 0, max: RECORDING_LIMITS.maxWeight },
  reps: { numericType: "integer", min: 1, max: RECORDING_LIMITS.maxReps },
  distanceM: { numericType: "finite", min: 0, max: RECORDING_LIMITS.maxDistanceMeters },
  durationSec: { numericType: "integer", min: 1, max: RECORDING_LIMITS.maxDurationSeconds },
};

export const RECORDING_MODE_SPECS = {
  weight_reps: {
    fields: ["weight", "reps"],
    requiredAll: ["weight", "reps"],
    requiredOneOf: [],
    allowedLoadBases: ["total", "per_hand"],
    allowedLoadDirections: ["higher_better", "lower_better"],
    supportedRateMetrics: ["none"],
    performance: { base: ["load", "reps"], compound: ["volume", "rpe_adjusted_rm"] },
  },
  reps: {
    fields: ["reps"],
    requiredAll: ["reps"],
    requiredOneOf: [],
    allowedLoadBases: [],
    allowedLoadDirections: [],
    supportedRateMetrics: ["none"],
    performance: { base: ["reps"], compound: [] },
  },
  reps_duration: {
    fields: ["reps", "durationSec"],
    requiredAll: ["durationSec"],
    requiredOneOf: [],
    allowedLoadBases: [],
    allowedLoadDirections: [],
    supportedRateMetrics: ["none", "reps_per_time"],
    performance: { base: ["reps", "duration"], compound: ["reps_rate"] },
  },
  duration: {
    fields: ["durationSec"],
    requiredAll: ["durationSec"],
    requiredOneOf: [],
    allowedLoadBases: [],
    allowedLoadDirections: [],
    supportedRateMetrics: ["none"],
    performance: { base: ["duration"], compound: [] },
  },
  distance_duration: {
    fields: ["distanceM", "durationSec"],
    requiredAll: [],
    requiredOneOf: [["distanceM", "durationSec"]],
    allowedLoadBases: [],
    allowedLoadDirections: [],
    supportedRateMetrics: ["none", "distance_per_time"],
    performance: { base: ["distance", "duration"], compound: ["distance_rate"] },
  },
  weight_duration: {
    fields: ["weight", "durationSec"],
    requiredAll: ["weight", "durationSec"],
    requiredOneOf: [],
    allowedLoadBases: ["total", "per_hand"],
    allowedLoadDirections: ["higher_better", "lower_better"],
    supportedRateMetrics: ["none"],
    performance: { base: ["load", "duration"], compound: ["load_duration"] },
  },
  weight_distance_duration: {
    fields: ["weight", "distanceM", "durationSec"],
    requiredAll: ["weight"],
    requiredOneOf: [["distanceM", "durationSec"]],
    allowedLoadBases: ["total", "per_hand"],
    allowedLoadDirections: ["higher_better", "lower_better"],
    supportedRateMetrics: ["none", "distance_per_time", "load_distance_per_time"],
    performance: {
      base: ["load", "distance", "duration"],
      compound: ["load_distance", "load_duration_without_distance", "distance_rate", "load_distance_rate"],
    },
  },
} as const satisfies Record<RecordingMode, RecordingModeSpec>;

const RECORDING_MODES = Object.keys(RECORDING_MODE_SPECS) as RecordingMode[];
const LOAD_BASES: LoadBasis[] = ["total", "per_hand"];
const COUNT_BASES: CountBasis[] = ["whole_set", "per_side"];
const LOAD_DIRECTIONS: LoadDirection[] = ["higher_better", "lower_better"];
const RATE_METRICS: RateMetric[] = ["none", "reps_per_time", "distance_per_time", "load_distance_per_time"];
const CONTEXT_KINDS: ContextKind[] = ["none", "resistance_level", "incline_percent"];

export function isRecordingMode(value: unknown): value is RecordingMode {
  return typeof value === "string" && RECORDING_MODES.includes(value as RecordingMode);
}

export function isLoadBasis(value: unknown): value is LoadBasis {
  return typeof value === "string" && LOAD_BASES.includes(value as LoadBasis);
}

export function isCountBasis(value: unknown): value is CountBasis {
  return typeof value === "string" && COUNT_BASES.includes(value as CountBasis);
}

export function isLoadDirection(value: unknown): value is LoadDirection {
  return typeof value === "string" && LOAD_DIRECTIONS.includes(value as LoadDirection);
}

export function isRateMetric(value: unknown): value is RateMetric {
  return typeof value === "string" && RATE_METRICS.includes(value as RateMetric);
}

export function isContextKind(value: unknown): value is ContextKind {
  return typeof value === "string" && CONTEXT_KINDS.includes(value as ContextKind);
}

export function getRecordingModeSpec(mode: RecordingMode): RecordingModeSpec {
  const spec = RECORDING_MODE_SPECS[mode];
  if (!spec) throw new Error("动作记录方式无效");
  return spec;
}

export function validateRecordingConfig(config: RecordingConfig): RecordingConfig {
  if (!isRecordingMode(config.recordingMode)) throw new Error("动作记录方式无效");
  if (!isCountBasis(config.countBasis)) throw new Error("必须选择有效的计数口径");
  const spec = getRecordingModeSpec(config.recordingMode);
  const hasWeight = spec.fields.includes("weight");

  if (hasWeight) {
    if (!isLoadBasis(config.loadBasis) || !spec.allowedLoadBases.includes(config.loadBasis)) {
      throw new Error("该记录方式必须选择有效的重量口径");
    }
    if (!isLoadDirection(config.loadDirection) || !spec.allowedLoadDirections.includes(config.loadDirection)) {
      throw new Error("该记录方式必须选择有效的成绩方向");
    }
  } else if (config.loadBasis !== null || config.loadDirection !== null) {
    throw new Error("不记录重量的动作不能设置重量口径或成绩方向");
  }

  if (!isRateMetric(config.rateMetric) || !spec.supportedRateMetrics.includes(config.rateMetric)) {
    throw new Error("竞速指标与记录方式不兼容");
  }
  const contextKind = config.contextKind ?? "none";
  if (!isContextKind(contextKind)) throw new Error("设备信息类型无效");
  if (contextKind !== "none" && config.recordingMode !== "distance_duration") {
    throw new Error("阻力或坡度上下文只适用于距离 / 时间记录");
  }
  if (contextKind === "resistance_level" && config.rateMetric !== "none") {
    throw new Error("记录阻力档位的动作不能启用竞速指标");
  }
  return { ...config, contextKind };
}

export function recordingConfigEquals(left: RecordingConfig, right: RecordingConfig): boolean {
  return left.recordingMode === right.recordingMode
    && left.loadBasis === right.loadBasis
    && left.countBasis === right.countBasis
    && left.loadDirection === right.loadDirection
    && left.rateMetric === right.rateMetric
    && left.contextKind === right.contextKind;
}

export function validateWorkoutSetForMode(
  set: RecordingSetInput,
  config: RecordingConfig,
  phase: SetValidationPhase
): void {
  const validated = validateRecordingConfig(config);
  const spec = getRecordingModeSpec(validated.recordingMode);
  const allFields: RecordingField[] = ["weight", "reps", "distanceM", "durationSec"];

  for (const field of allFields) {
    const value = set[field];
    if (!spec.fields.includes(field) && value != null) {
      throw new Error(`${fieldLabel(field)}不适用于当前记录方式`);
    }
    validateField(field, value);
  }
  validateContextValue(set.contextValue, validated.contextKind ?? "none");

  if (phase === "draft") return;
  for (const field of spec.requiredAll) {
    if (set[field] == null) throw new Error(`${fieldLabel(field)}不能为空`);
  }
  for (const group of spec.requiredOneOf) {
    if (group.every((field) => set[field] == null)) {
      throw new Error(`${group.map(fieldLabel).join("或")}至少填写一项`);
    }
  }
}

export const KG_PER_LB = 0.45359237;

export function convertWeight(value: number, from: WeightUnit, to: WeightUnit): number {
  if (!Number.isFinite(value)) throw new Error("重量必须是有效数值");
  if (from === to) return value;
  return from === "lb" ? value * KG_PER_LB : value / KG_PER_LB;
}

export function recordingConfigOf(value: RecordingConfig): RecordingConfig {
  return {
    recordingMode: value.recordingMode,
    loadBasis: value.loadBasis,
    countBasis: value.countBasis,
    loadDirection: value.loadDirection,
    rateMetric: value.rateMetric,
    contextKind: value.contextKind ?? "none",
  };
}

function validateContextValue(value: number | null | undefined, kind: ContextKind): void {
  if (kind === "none") {
    if (value != null) throw new Error("当前动作不能记录阻力或坡度");
    return;
  }
  if (value == null) return;
  if (!Number.isFinite(value)) throw new Error(kind === "resistance_level" ? "阻力档位必须是有效数值" : "坡度必须是有效数值");
  const max = kind === "resistance_level" ? RECORDING_LIMITS.maxResistanceLevel : RECORDING_LIMITS.maxInclinePercent;
  if (value < 0 || value > max) {
    throw new Error(kind === "resistance_level" ? "阻力档位必须在 0 到 200 之间" : "坡度必须在 0% 到 100% 之间");
  }
}

function validateField(field: RecordingField, value: number | null | undefined): void {
  if (value == null) return;
  if (!Number.isFinite(value)) throw new Error(`${fieldLabel(field)}必须是有效数值`);
  const spec = RECORDING_FIELD_SPECS[field];
  if (spec.numericType === "integer" && !Number.isInteger(value)) {
    throw new Error(`${fieldLabel(field)}必须是整数`);
  }
  if (value < spec.min || value > spec.max) {
    throw new Error(`${fieldLabel(field)}必须是 ${spec.min} 到 ${spec.max} 的${spec.numericType === "integer" ? "整数" : "有效数值"}`);
  }
}

function fieldLabel(field: RecordingField): string {
  switch (field) {
    case "weight": return "重量";
    case "reps": return "次数";
    case "distanceM": return "距离";
    case "durationSec": return "时长";
  }
}

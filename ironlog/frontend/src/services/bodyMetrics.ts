import { BODY_MEASUREMENT_KEYS, emptyBodyMeasurements } from "@/core/migrations";
import type { BodyMeasurementKey, BodyMeasurementsCm, BodyMetricDoc, WeightUnit } from "@/core/models";
import { convertWeight } from "@/core/workoutMetrics";
import { localRepository } from "@/repositories/localJsonRepository";

export type BodyTrendRange = "30d" | "90d" | "1y" | "all";
export type BodyMetricKey = "heightCm" | "weightKg" | "bodyFatPercent" | BodyMeasurementKey;
export type PairedMeasurementKey = "upperArm" | "forearm" | "thigh" | "calf";

export const BODY_METRIC_LABELS: Record<BodyMetricKey, string> = {
  heightCm: "身高",
  weightKg: "体重",
  bodyFatPercent: "体脂",
  neck: "颈围",
  shoulder: "肩围",
  chest: "胸围",
  waist: "腰围",
  hip: "臀围",
  upperArmLeft: "左上臂",
  upperArmRight: "右上臂",
  forearmLeft: "左前臂",
  forearmRight: "右前臂",
  thighLeft: "左大腿",
  thighRight: "右大腿",
  calfLeft: "左小腿",
  calfRight: "右小腿",
};

export const PAIRED_MEASUREMENTS: Record<PairedMeasurementKey, { left: BodyMeasurementKey; right: BodyMeasurementKey; label: string }> = {
  upperArm: { left: "upperArmLeft", right: "upperArmRight", label: "上臂围" },
  forearm: { left: "forearmLeft", right: "forearmRight", label: "前臂围" },
  thigh: { left: "thighLeft", right: "thighRight", label: "大腿围" },
  calf: { left: "calfLeft", right: "calfRight", label: "小腿围" },
};

export interface BodyMetricPayload {
  recorded_at: string;
  height_cm?: number | null;
  weight?: number | null;
  weight_unit?: WeightUnit;
  weight_kg?: number | null;
  body_fat_percent?: number | null;
  measurements_cm?: Partial<Record<BodyMeasurementKey, number | null>>;
  note?: string | null;
}

export interface BodyMetric {
  id: string;
  recorded_at: string;
  height_cm: number | null;
  weight_kg: number | null;
  body_fat_percent: number | null;
  measurements_cm: BodyMeasurementsCm;
  note: string | null;
  created_at: string;
  updated_at: string;
}

export interface CurrentMetricValue {
  value: number | null;
  unit: string;
  recorded_at: string | null;
  source_id: string | null;
}

export interface CurrentBodyMetrics {
  height_cm: CurrentMetricValue;
  weight: CurrentMetricValue;
  body_fat_percent: CurrentMetricValue;
  measurements_cm: Record<BodyMeasurementKey, CurrentMetricValue>;
}

export interface BodyTrendPoint {
  date: string;
  value: number;
  unit: string;
  source_id: string;
}

export interface PairedBodyTrendPoint {
  date: string;
  left: number | null;
  right: number | null;
  unit: "cm";
}

export interface PeriodBodyMetricSummary {
  key: BodyMetricKey;
  label: string;
  unit: string;
  first_value: number;
  last_value: number;
  delta: number;
  point_count: number;
}

export async function listBodyMetrics(params?: { from?: string; to?: string }): Promise<BodyMetric[]> {
  return (await localRepository.listBodyMetrics(params)).map(toBodyMetric);
}

export async function getBodyMetric(id: string): Promise<BodyMetric> {
  const metric = await localRepository.getBodyMetric(id);
  if (!metric) throw new Error("身体记录不存在");
  return toBodyMetric(metric);
}

export async function createBodyMetric(body: BodyMetricPayload): Promise<BodyMetric> {
  return toBodyMetric(await localRepository.createBodyMetric(normalizeBodyMetricPayload(body)));
}

export async function updateBodyMetric(id: string, body: BodyMetricPayload): Promise<BodyMetric> {
  await getBodyMetric(id);
  return toBodyMetric(await localRepository.updateBodyMetric(id, normalizeBodyMetricPayload(body)));
}

export async function deleteBodyMetric(id: string): Promise<void> {
  await localRepository.deleteBodyMetric(id);
}

export async function getCurrentBodyMetrics(): Promise<CurrentBodyMetrics> {
  const [records, settings] = await Promise.all([localRepository.listBodyMetrics(), localRepository.getSettings()]);
  return deriveCurrentBodyMetrics(records, settings.weightUnit);
}

export async function getBodyMetricTrend(metricKey: BodyMetricKey, range: BodyTrendRange): Promise<BodyTrendPoint[]> {
  const [records, settings] = await Promise.all([localRepository.listBodyMetrics({ from: rangeStartIso(range) }), localRepository.getSettings()]);
  const unit = displayUnitFor(metricKey, settings.weightUnit);
  const byDate = new Map<string, BodyTrendPoint>();
  for (const record of records.slice().sort((left, right) => left.recordedAt.localeCompare(right.recordedAt) || left.updatedAt.localeCompare(right.updatedAt))) {
    const rawValue = valueForMetric(record, metricKey);
    if (rawValue == null) continue;
    byDate.set(record.recordedAt.slice(0, 10), {
      date: record.recordedAt.slice(0, 10),
      value: displayValueFor(metricKey, rawValue, settings.weightUnit),
      unit,
      source_id: record.id,
    });
  }
  return [...byDate.values()];
}

export async function getPairedMeasurementTrend(pairKey: PairedMeasurementKey, range: BodyTrendRange): Promise<PairedBodyTrendPoint[]> {
  const pair = PAIRED_MEASUREMENTS[pairKey];
  const records = await localRepository.listBodyMetrics({ from: rangeStartIso(range) });
  const byDate = new Map<string, PairedBodyTrendPoint>();
  for (const record of records.slice().sort((left, right) => left.recordedAt.localeCompare(right.recordedAt) || left.updatedAt.localeCompare(right.updatedAt))) {
    const left = record.measurementsCm[pair.left];
    const right = record.measurementsCm[pair.right];
    if (left == null && right == null) continue;
    const date = record.recordedAt.slice(0, 10);
    byDate.set(date, { date, left, right, unit: "cm" });
  }
  return [...byDate.values()];
}

export async function getPeriodBodyMetricSummary(params: { from: string; to: string }): Promise<PeriodBodyMetricSummary[]> {
  const [records, settings] = await Promise.all([localRepository.listBodyMetrics({ from: `${params.from}T00:00:00.000Z`, to: `${params.to}T23:59:59.999Z` }), localRepository.getSettings()]);
  const summaries: PeriodBodyMetricSummary[] = [];
  for (const key of allMetricKeys()) {
    const points = records
      .map((record) => ({ record, value: valueForMetric(record, key) }))
      .filter((item): item is { record: BodyMetricDoc; value: number } => item.value != null)
      .sort((left, right) => left.record.recordedAt.localeCompare(right.record.recordedAt));
    if (points.length === 0) continue;
    const first = displayValueFor(key, points[0].value, settings.weightUnit);
    const last = displayValueFor(key, points[points.length - 1].value, settings.weightUnit);
    summaries.push({
      key,
      label: BODY_METRIC_LABELS[key],
      unit: displayUnitFor(key, settings.weightUnit),
      first_value: first,
      last_value: last,
      delta: last - first,
      point_count: points.length,
    });
  }
  return summaries;
}

export function deriveCurrentBodyMetrics(records: BodyMetricDoc[], weightUnit: WeightUnit): CurrentBodyMetrics {
  const sorted = records
    .filter((record) => !record.deletedAt && record.recordedAt <= nowIso())
    .sort((left, right) => right.recordedAt.localeCompare(left.recordedAt) || right.updatedAt.localeCompare(left.updatedAt));
  return {
    height_cm: currentValue(sorted, "heightCm", "cm", weightUnit),
    weight: currentValue(sorted, "weightKg", weightUnit, weightUnit),
    body_fat_percent: currentValue(sorted, "bodyFatPercent", "%", weightUnit),
    measurements_cm: Object.fromEntries(BODY_MEASUREMENT_KEYS.map((key) => [key, currentValue(sorted, key, "cm", weightUnit)])) as Record<BodyMeasurementKey, CurrentMetricValue>,
  };
}

function normalizeBodyMetricPayload(body: BodyMetricPayload): Omit<BodyMetricDoc, "id" | "createdAt" | "updatedAt" | "deletedAt" | "schemaVersion"> {
  const recordedAt = normalizeRecordedAt(body.recorded_at);
  const measurementsCm = normalizeMeasurements(body.measurements_cm);
  const weightKg = "weight_kg" in body
    ? normalizeOptionalNumber(body.weight_kg, "体重", 20, 500)
    : normalizeWeight(body.weight, body.weight_unit ?? "kg");
  const doc = {
    recordedAt,
    heightCm: normalizeOptionalNumber(body.height_cm, "身高", 50, 250),
    weightKg,
    bodyFatPercent: normalizeOptionalNumber(body.body_fat_percent, "体脂", 1, 80),
    measurementsCm,
    note: normalizeNote(body.note),
  };
  if (!hasAnyMeasurement(doc)) throw new Error("至少填写一个身体指标");
  return doc;
}

function normalizeRecordedAt(value: string): string {
  if (!value || Number.isNaN(Date.parse(value))) throw new Error("测量时间格式无效");
  const iso = new Date(value).toISOString();
  if (iso > nowIso()) throw new Error("测量时间不能晚于当前时间");
  return iso;
}

function normalizeMeasurements(value: BodyMetricPayload["measurements_cm"]): BodyMeasurementsCm {
  const measurements = emptyBodyMeasurements();
  for (const key of BODY_MEASUREMENT_KEYS) {
    measurements[key] = normalizeOptionalNumber(value?.[key], BODY_METRIC_LABELS[key], 1, 300);
  }
  return measurements;
}

function normalizeWeight(value: number | null | undefined, unit: WeightUnit): number | null {
  const normalized = normalizeOptionalNumber(value, "体重", unit === "kg" ? 20 : 44, unit === "kg" ? 500 : 1100);
  if (normalized == null) return null;
  return unit === "kg" ? normalized : convertWeight(normalized, "lb", "kg");
}

function normalizeOptionalNumber(value: number | null | undefined, label: string, min: number, max: number): number | null {
  if (value == null) return null;
  if (!Number.isFinite(value) || value < min || value > max) throw new Error(`${label}必须是 ${min} 到 ${max} 的有效数值`);
  return value;
}

function normalizeNote(value: string | null | undefined): string | null {
  const note = value?.trim() || null;
  if (note && note.length > 500) throw new Error("备注不能超过 500 个字符");
  return note;
}

function hasAnyMeasurement(doc: Pick<BodyMetricDoc, "heightCm" | "weightKg" | "bodyFatPercent" | "measurementsCm">): boolean {
  return doc.heightCm != null
    || doc.weightKg != null
    || doc.bodyFatPercent != null
    || BODY_MEASUREMENT_KEYS.some((key) => doc.measurementsCm[key] != null);
}

function toBodyMetric(doc: BodyMetricDoc): BodyMetric {
  return {
    id: doc.id,
    recorded_at: doc.recordedAt,
    height_cm: doc.heightCm,
    weight_kg: doc.weightKg,
    body_fat_percent: doc.bodyFatPercent,
    measurements_cm: doc.measurementsCm,
    note: doc.note,
    created_at: doc.createdAt,
    updated_at: doc.updatedAt,
  };
}

function currentValue(records: BodyMetricDoc[], key: BodyMetricKey, unit: string, weightUnit: WeightUnit): CurrentMetricValue {
  for (const record of records) {
    const rawValue = valueForMetric(record, key);
    if (rawValue == null) continue;
    return {
      value: displayValueFor(key, rawValue, weightUnit),
      unit,
      recorded_at: record.recordedAt,
      source_id: record.id,
    };
  }
  return { value: null, unit, recorded_at: null, source_id: null };
}

function valueForMetric(record: BodyMetricDoc, key: BodyMetricKey): number | null {
  if (key === "heightCm") return record.heightCm;
  if (key === "weightKg") return record.weightKg;
  if (key === "bodyFatPercent") return record.bodyFatPercent;
  return record.measurementsCm[key];
}

function displayValueFor(key: BodyMetricKey, value: number, weightUnit: WeightUnit): number {
  if (key !== "weightKg" || weightUnit === "kg") return round(value);
  return round(convertWeight(value, "kg", "lb"));
}

function displayUnitFor(key: BodyMetricKey, weightUnit: WeightUnit): string {
  if (key === "weightKg") return weightUnit;
  if (key === "bodyFatPercent") return "%";
  return "cm";
}

function rangeStartIso(range: BodyTrendRange): string | undefined {
  if (range === "all") return undefined;
  const days = range === "30d" ? 30 : range === "90d" ? 90 : 365;
  const date = new Date();
  date.setDate(date.getDate() - days + 1);
  date.setHours(0, 0, 0, 0);
  return date.toISOString();
}

function allMetricKeys(): BodyMetricKey[] {
  return ["heightCm", "weightKg", "bodyFatPercent", ...BODY_MEASUREMENT_KEYS];
}

function nowIso(): string {
  return new Date().toISOString();
}

function round(value: number): number {
  return Math.round(value * 10) / 10;
}

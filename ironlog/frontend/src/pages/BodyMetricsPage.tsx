import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, Pencil, Plus, Save, Trash2, X } from "lucide-react";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { BODY_MEASUREMENT_KEYS } from "@/core/migrations";
import type { BodyMeasurementKey } from "@/core/models";
import {
  BODY_METRIC_LABELS,
  PAIRED_MEASUREMENTS,
  createBodyMetric,
  deleteBodyMetric,
  getBodyMetricTrend,
  getCurrentBodyMetrics,
  getPairedMeasurementTrend,
  listBodyMetrics,
  updateBodyMetric,
  type BodyMetric,
  type BodyMetricKey,
  type BodyTrendRange,
  type CurrentBodyMetrics,
  type PairedMeasurementKey,
} from "@/services/bodyMetrics";
import { getSettings } from "@/services/settings";
import { useConfirmStore } from "@/components/ConfirmDialog";
import { useToastStore } from "@/components/Toast";

type TrendSelection = BodyMetricKey | `pair:${PairedMeasurementKey}`;

const BASE_KEYS: BodyMetricKey[] = ["heightCm", "weightKg", "bodyFatPercent"];
const TREND_RANGES: Array<{ value: BodyTrendRange; label: string }> = [
  { value: "30d", label: "30天" },
  { value: "90d", label: "90天" },
  { value: "1y", label: "1年" },
  { value: "all", label: "全部" },
];

export default function BodyMetricsPage() {
  const navigate = useNavigate();
  const confirm = useConfirmStore((state) => state.show);
  const toast = useToastStore((state) => state.add);
  const [records, setRecords] = useState<BodyMetric[]>([]);
  const [current, setCurrent] = useState<CurrentBodyMetrics | null>(null);
  const [weightUnit, setWeightUnit] = useState<"kg" | "lb">("kg");
  const [trendSelection, setTrendSelection] = useState<TrendSelection>("weightKg");
  const [trendRange, setTrendRange] = useState<BodyTrendRange>("90d");
  const [trendData, setTrendData] = useState<Array<Record<string, string | number | null | undefined>>>([]);
  const [editing, setEditing] = useState<BodyMetric | null>(null);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    reload();
    getSettings().then((settings) => setWeightUnit(settings.weight_unit));
  }, []);

  useEffect(() => {
    loadTrend();
  }, [trendSelection, trendRange]);

  async function reload() {
    const [nextRecords, nextCurrent] = await Promise.all([listBodyMetrics(), getCurrentBodyMetrics()]);
    setRecords(nextRecords);
    setCurrent(nextCurrent);
  }

  async function loadTrend() {
    if (trendSelection.startsWith("pair:")) {
      const pair = trendSelection.slice(5) as PairedMeasurementKey;
      const points = await getPairedMeasurementTrend(pair, trendRange);
      setTrendData(points.map((point) => ({ ...point })));
    } else {
      const points = await getBodyMetricTrend(trendSelection as BodyMetricKey, trendRange);
      setTrendData(points.map((point) => ({ ...point })));
    }
  }

  async function remove(record: BodyMetric) {
    const ok = await confirm("删除身体记录", "删除后会写入 tombstone，当前值和趋势会从剩余记录重新派生。");
    if (!ok) return;
    await deleteBodyMetric(record.id);
    toast("身体记录已删除", "success");
    reload();
    loadTrend();
  }

  const pairedCurrent = useMemo(() => {
    if (!current) return [];
    return Object.entries(PAIRED_MEASUREMENTS).map(([key, pair]) => {
      const left = current.measurements_cm[pair.left];
      const right = current.measurements_cm[pair.right];
      return { key, label: pair.label, left, right, diff: left.value != null && right.value != null ? Math.abs(left.value - right.value) : null };
    });
  }, [current]);

  return (
    <div className="app-screen min-h-screen pb-8">
      <div className="sticky top-0 z-10 app-surface border-b app-border px-4 h-14 flex items-center gap-3">
        <button onClick={() => navigate("/profile")} className="w-9 h-9 flex items-center justify-center rounded-full app-surface-muted" aria-label="返回">
          <ChevronLeft size={20} />
        </button>
        <h1 className="text-base font-bold app-text flex-1">身体数据</h1>
        <button onClick={() => { setEditing(null); setShowForm(true); }} className="app-primary-bg w-9 h-9 rounded-full flex items-center justify-center" aria-label="新增身体记录">
          <Plus size={18} />
        </button>
      </div>

      <div className="px-5 pt-5 space-y-4">
        <section className="app-surface rounded-2xl border shadow-sm p-4">
          <h2 className="text-sm font-bold app-text mb-3">当前值</h2>
          <div className="grid grid-cols-3 gap-2">
            <MetricTile label="身高" metric={current?.height_cm} />
            <MetricTile label="体重" metric={current?.weight} />
            <MetricTile label="体脂" metric={current?.body_fat_percent} />
          </div>
        </section>

        <section className="app-surface rounded-2xl border shadow-sm p-4">
          <h2 className="text-sm font-bold app-text mb-3">围度</h2>
          <div className="grid grid-cols-2 gap-2">
            {BODY_MEASUREMENT_KEYS.filter((key) => !key.endsWith("Left") && !key.endsWith("Right")).map((key) => (
              <MetricTile key={key} label={BODY_METRIC_LABELS[key]} metric={current?.measurements_cm[key]} />
            ))}
          </div>
          <div className="app-divide mt-3 divide-y">
            {pairedCurrent.map((item) => (
              <div key={item.key} className="py-2.5">
                <div className="flex justify-between gap-3">
                  <span className="text-sm font-semibold app-text">{item.label}</span>
                  <span className="text-xs app-text-muted">{item.diff == null ? "差值 —" : `差值 ${item.diff.toFixed(1)} cm`}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <MetricTile label="左侧" metric={item.left} compact />
                  <MetricTile label="右侧" metric={item.right} compact />
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="app-surface rounded-2xl border shadow-sm p-4">
          <div className="flex flex-wrap gap-2 mb-3">
            <select value={trendSelection} onChange={(event) => setTrendSelection(event.target.value as TrendSelection)} className="app-input flex-1 min-w-0 px-3 py-2 border rounded-xl text-sm">
              {[...BASE_KEYS, ...BODY_MEASUREMENT_KEYS].map((key) => <option key={key} value={key}>{BODY_METRIC_LABELS[key]}</option>)}
              {Object.entries(PAIRED_MEASUREMENTS).map(([key, pair]) => <option key={key} value={`pair:${key}`}>{pair.label}（左右）</option>)}
            </select>
            <select value={trendRange} onChange={(event) => setTrendRange(event.target.value as BodyTrendRange)} className="app-input px-3 py-2 border rounded-xl text-sm">
              {TREND_RANGES.map((range) => <option key={range.value} value={range.value}>{range.label}</option>)}
            </select>
          </div>
          <div className="h-48 app-surface-muted rounded-xl border app-border p-2">
            {trendData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-sm app-text-muted">暂无趋势数据</div>
            ) : trendSelection.startsWith("pair:") ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData}>
                  <XAxis dataKey="date" hide />
                  <YAxis width={36} tick={{ fill: "var(--color-text-secondary)", fontSize: 11 }} />
                  <Tooltip />
                  <Line type="monotone" dataKey="left" stroke="var(--color-chart-1)" strokeWidth={2} dot={false} connectNulls={false} />
                  <Line type="monotone" dataKey="right" stroke="var(--color-chart-2)" strokeWidth={2} dot={false} connectNulls={false} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData}>
                  <XAxis dataKey="date" hide />
                  <YAxis width={36} tick={{ fill: "var(--color-text-secondary)", fontSize: 11 }} />
                  <Tooltip />
                  <Line type="monotone" dataKey="value" stroke="var(--color-primary)" strokeWidth={2} dot={false} connectNulls={false} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </section>

        <section>
          <h2 className="text-sm font-bold app-text mb-2 px-1">历史记录</h2>
          {records.length === 0 ? (
            <div className="app-surface rounded-2xl border py-10 text-center text-sm app-text-muted">还没有身体记录</div>
          ) : (
            <div className="space-y-2">
              {records.map((record) => (
                <div key={record.id} className="app-surface rounded-2xl border shadow-sm p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-bold app-text">{formatDateTime(record.recorded_at)}</p>
                      <p className="text-xs app-text-muted mt-1">{recordSummary(record, weightUnit)}</p>
                      {record.note && <p className="text-xs app-text-muted mt-1 truncate">{record.note}</p>}
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <button onClick={() => { setEditing(record); setShowForm(true); }} className="w-9 h-9 app-surface-muted rounded-full flex items-center justify-center" aria-label="编辑">
                        <Pencil size={15} />
                      </button>
                      <button onClick={() => remove(record)} className="w-9 h-9 rounded-full flex items-center justify-center" style={{ color: "var(--color-danger)", backgroundColor: "var(--color-surface-2)" }} aria-label="删除">
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {showForm && (
        <BodyMetricForm
          initial={editing}
          weightUnit={weightUnit}
          onClose={() => setShowForm(false)}
          onSaved={() => {
            setShowForm(false);
            setEditing(null);
            reload();
            loadTrend();
          }}
        />
      )}
    </div>
  );
}

function BodyMetricForm({ initial, weightUnit, onClose, onSaved }: { initial: BodyMetric | null; weightUnit: "kg" | "lb"; onClose: () => void; onSaved: () => void }) {
  const toast = useToastStore((state) => state.add);
  const [recordedAt, setRecordedAt] = useState(toDateTimeLocal(initial?.recorded_at || new Date().toISOString()));
  const [height, setHeight] = useState(initial?.height_cm?.toString() || "");
  const [weight, setWeight] = useState(initial?.weight_kg != null ? displayWeight(initial.weight_kg, weightUnit) : "");
  const [bodyFat, setBodyFat] = useState(initial?.body_fat_percent?.toString() || "");
  const [note, setNote] = useState(initial?.note || "");
  const [measurements, setMeasurements] = useState<Record<BodyMeasurementKey, string>>(() => Object.fromEntries(BODY_MEASUREMENT_KEYS.map((key) => [key, initial?.measurements_cm[key]?.toString() || ""])) as Record<BodyMeasurementKey, string>);
  const [saving, setSaving] = useState(false);

  async function submit() {
    setSaving(true);
    try {
      const payload = {
        recorded_at: new Date(recordedAt).toISOString(),
        height_cm: parseOptional(height),
        weight: parseOptional(weight),
        weight_unit: weightUnit,
        body_fat_percent: parseOptional(bodyFat),
        measurements_cm: Object.fromEntries(BODY_MEASUREMENT_KEYS.map((key) => [key, parseOptional(measurements[key])])) as Partial<Record<BodyMeasurementKey, number | null>>,
        note,
      };
      if (initial) await updateBodyMetric(initial.id, payload);
      else await createBodyMetric(payload);
      toast(initial ? "身体记录已更新" : "身体记录已新增", "success");
      onSaved();
    } catch (err) {
      toast(err instanceof Error ? err.message : "保存失败", "error");
    } finally {
      setSaving(false);
    }
  }

  const inputCls = "app-input w-full px-3 py-2.5 border rounded-xl text-sm";

  return (
    <div className="fixed inset-0 z-[120] flex items-end justify-center">
      <button className="absolute inset-0 bg-black/50" onClick={onClose} aria-label="关闭" />
      <div className="relative w-full max-w-[480px] max-h-[88dvh] overflow-y-auto app-surface rounded-t-3xl p-5 space-y-4 md:max-w-[768px]">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-bold app-text">{initial ? "编辑身体记录" : "新增身体记录"}</h2>
          <button onClick={onClose} className="w-9 h-9 rounded-full app-surface-muted flex items-center justify-center" aria-label="关闭">
            <X size={18} />
          </button>
        </div>
        <div>
          <label className="block text-xs font-semibold app-text-muted mb-1.5">测量时间</label>
          <input type="datetime-local" value={recordedAt} onChange={(event) => setRecordedAt(event.target.value)} className={inputCls} />
        </div>
        <div className="grid grid-cols-3 gap-2">
          <Field label="身高(cm)" value={height} onChange={setHeight} />
          <Field label={`体重(${weightUnit})`} value={weight} onChange={setWeight} />
          <Field label="体脂(%)" value={bodyFat} onChange={setBodyFat} />
        </div>
        <div className="grid grid-cols-2 gap-2">
          {BODY_MEASUREMENT_KEYS.map((key) => (
            <Field key={key} label={`${BODY_METRIC_LABELS[key]}(cm)`} value={measurements[key]} onChange={(value) => setMeasurements({ ...measurements, [key]: value })} />
          ))}
        </div>
        <div>
          <label className="block text-xs font-semibold app-text-muted mb-1.5">备注</label>
          <textarea value={note} onChange={(event) => setNote(event.target.value)} className="app-input w-full px-3 py-2.5 border rounded-xl text-sm min-h-20" placeholder="例如：晨起空腹" />
        </div>
        <button onClick={submit} disabled={saving} className="app-primary-bg w-full h-11 rounded-2xl font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-50">
          <Save size={15} />
          {saving ? "保存中" : "保存"}
        </button>
      </div>
    </div>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="block min-w-0">
      <span className="block text-xs font-semibold app-text-muted mb-1.5 truncate">{label}</span>
      <input inputMode="decimal" value={value} onChange={(event) => onChange(event.target.value)} className="app-input w-full px-3 py-2.5 border rounded-xl text-sm" />
    </label>
  );
}

function MetricTile({ label, metric, compact = false }: { label: string; metric?: { value: number | null; unit: string }; compact?: boolean }) {
  return (
    <div className="app-surface-muted rounded-xl border app-border p-3 min-w-0">
      <p className={`${compact ? "text-base" : "text-lg"} font-bold app-text truncate`}>
        {metric?.value ?? "—"}{metric?.value != null && <span className="text-xs font-normal app-text-muted ml-0.5">{metric.unit}</span>}
      </p>
      <p className="text-xs app-text-muted mt-0.5 truncate">{label}</p>
    </div>
  );
}

function parseOptional(value: string): number | null {
  if (value.trim() === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}

function displayWeight(weightKg: number, unit: "kg" | "lb"): string {
  if (unit === "kg") return String(Math.round(weightKg * 10) / 10);
  return String(Math.round((weightKg / 0.45359237) * 10) / 10);
}

function toDateTimeLocal(iso: string): string {
  const date = new Date(iso);
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("zh-CN", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

function recordSummary(record: BodyMetric, weightUnit: "kg" | "lb"): string {
  const parts: string[] = [];
  if (record.height_cm != null) parts.push(`身高 ${record.height_cm}cm`);
  if (record.weight_kg != null) parts.push(`体重 ${displayWeight(record.weight_kg, weightUnit)}${weightUnit}`);
  if (record.body_fat_percent != null) parts.push(`体脂 ${record.body_fat_percent}%`);
  for (const key of BODY_MEASUREMENT_KEYS) {
    const value = record.measurements_cm[key];
    if (value != null) parts.push(`${BODY_METRIC_LABELS[key]} ${value}cm`);
  }
  return parts.join(" · ") || "无测量指标";
}

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Check, ChevronLeft, Dumbbell, Gauge, NotebookText, Pencil, Trash2, TrendingUp, X } from "lucide-react";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { getExerciseDetail } from "@/services/plan";
import { deleteExercise, getExerciseHistory, getExercises, updateExercise } from "@/services/exercise";
import type { EquipmentId, Exercise, ExerciseCategory, ExerciseDetail, LoadBasis, LoadDirection, MuscleGroupId, RateMetric, RecordingMode } from "@/types";
import type { ExerciseHistoryRecord } from "@/services/exercise";
import { getExercisePerformanceRecords, getExercisePerformanceTrend, rebuildPerformanceForExercise, type ExercisePerformanceTrend, type PerformanceRecord } from "@/services/performance";
import { getSettings } from "@/services/settings";
import { CATEGORY_LABELS, EQUIPMENT_LABELS, LOAD_BASIS_LABELS, LOAD_DIRECTION_LABELS, MUSCLE_GROUP_LABELS, RATE_METRIC_LABELS, RECORDING_MODE_LABELS } from "@/types";
import { useConfirmStore } from "@/components/ConfirmDialog";
import { useToastStore } from "@/components/Toast";
import CustomExerciseForm, { type CustomExerciseFormValue } from "@/components/CustomExerciseForm";
import MuscleHighlightMap from "@/components/MuscleHighlightMap";
import { CHART_TOOLTIP_CONTENT_STYLE, CHART_TOOLTIP_ITEM_STYLE, CHART_TOOLTIP_LABEL_STYLE } from "@/components/chartTooltip";
import { convertWeight, formatOneDecimal } from "@/core/workoutMetrics";
import { useAndroidBackDismiss } from "@/navigation/androidBackLayers";
import { comparePerformanceValues } from "@/core/performanceMetrics";
import {
  displayPerformanceScalar,
  displayPerformanceUnit,
  formatPerformanceInput,
  formatPerformanceMetric,
  formatRecordingDescription,
  formatSet,
  recordingSnapshotEquals,
} from "@/utils/recordingPresentation";
import { restoreRouteScrollPosition, saveRouteScrollPosition } from "@/utils/scroll";

const SCROLL_STORAGE_KEY = "ironlog.exerciseDetailScroll";

export default function ExerciseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const confirm = useConfirmStore((state) => state.show);
  const toast = useToastStore((state) => state.add);
  const [detail, setDetail] = useState<ExerciseDetail | null>(null);
  const [history, setHistory] = useState<ExerciseHistoryRecord[]>([]);
  const [performance, setPerformance] = useState<PerformanceRecord[]>([]);
  const [trend, setTrend] = useState<ExercisePerformanceTrend | null>(null);
  const [availableExercises, setAvailableExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showEditor, setShowEditor] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  useAndroidBackDismiss(showEditor, () => setShowEditor(false));
  useAndroidBackDismiss(showDelete, () => setShowDelete(false));
  const [name, setName] = useState("");
  const [category, setCategory] = useState<ExerciseCategory>("core");
  const [recordingMode, setRecordingMode] = useState<RecordingMode>("weight_reps");
  const [loadBasis, setLoadBasis] = useState<LoadBasis | null>("total");
  const [loadDirection, setLoadDirection] = useState<LoadDirection | null>("higher_better");
  const [rateMetric, setRateMetric] = useState<RateMetric>("none");
  const [equipment, setEquipment] = useState<EquipmentId | null>(null);
  const [description, setDescription] = useState("");
  const [primaryMuscles, setPrimaryMuscles] = useState<MuscleGroupId[]>([]);
  const [secondaryMuscles, setSecondaryMuscles] = useState<MuscleGroupId[]>([]);
  const [replacement, setReplacement] = useState("");
  const [displayUnit, setDisplayUnit] = useState<"kg" | "lb">("kg");
  const restoredScroll = useRef(false);

  useEffect(() => {
    if (!id) return;
    let alive = true;
    setLoading(true);
    setError(null);
    Promise.all([getExerciseDetail(id), getExerciseHistory(id, 20), getExercises(), getExercisePerformanceRecords(id), getExercisePerformanceTrend(id), getSettings()])
      .then(([nextDetail, nextHistory, exercises, nextPerformance, nextTrend, settings]) => {
        if (!alive) return;
        setDetail(nextDetail);
        setHistory(nextHistory);
        setAvailableExercises(exercises);
        setPerformance(nextPerformance);
        setTrend(nextTrend);
        setDisplayUnit(settings.weight_unit);
        setEditorState(nextDetail);
      })
      .catch((err) => {
        if (!alive) return;
        setError(err instanceof Error ? err.message : "动作读取失败");
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [id]);

  useLayoutEffect(() => {
    if (loading || restoredScroll.current || typeof sessionStorage === "undefined") return;
    restoredScroll.current = true;
    const main = document.querySelector<HTMLElement>("[data-app-main]");
    restoreRouteScrollPosition(sessionStorage, SCROLL_STORAGE_KEY, `${location.pathname}${location.search}`, main);
  }, [loading, location.pathname, location.search]);

  const groupedHistory = useMemo(() => {
    const byDate: Record<string, ExerciseHistoryRecord[]> = {};
    for (const record of history) {
      if (!byDate[record.date]) byDate[record.date] = [];
      byDate[record.date].push(record);
    }
    return byDate;
  }, [history]);
  const dates = Object.keys(groupedHistory).sort((a, b) => b.localeCompare(a));
  const currentBestPerformance = useMemo(
    () => currentBestByMetric(performance, detail?.load_basis ?? null),
    [performance, detail?.load_basis]
  );
  const trendData = useMemo(
    () => trend?.points.map((point) => ({ ...point, display_value: displayPerformanceScalar(point.value, point.unit, displayUnit) })) ?? [],
    [trend, displayUnit]
  );
  const trendUnit = trend ? displayPerformanceUnit(trend.points[0]?.unit ?? "kg", displayUnit) : "";

  function setEditorState(nextDetail: ExerciseDetail) {
    setName(nextDetail.name);
    setCategory(nextDetail.category);
    setRecordingMode(nextDetail.recording_mode);
    setLoadBasis(nextDetail.load_basis);
    setLoadDirection(nextDetail.load_direction);
    setRateMetric(nextDetail.rate_metric);
    setEquipment(nextDetail.equipment);
    setDescription(nextDetail.description || "");
    setPrimaryMuscles(nextDetail.primary_muscle_group_ids);
    setSecondaryMuscles(nextDetail.secondary_muscle_group_ids);
  }

  function goBack() {
    const from = searchParams.get("from");
    navigate(from && from.startsWith("/exercises") ? from : "/exercises");
  }

  function openSourceWorkout(workoutId: string) {
    const main = document.querySelector<HTMLElement>("[data-app-main]");
    if (typeof sessionStorage !== "undefined") {
      saveRouteScrollPosition(sessionStorage, SCROLL_STORAGE_KEY, `${location.pathname}${location.search}`, main?.scrollTop ?? 0);
    }
    navigate(`/workouts/${workoutId}`);
  }

  async function saveEdit() {
    if (!detail) return;
    try {
      const updated = await updateExercise(detail.id, {
        name,
        category,
        recording_mode: recordingMode,
        load_basis: loadBasis,
        load_direction: loadDirection,
        rate_metric: rateMetric,
        equipment,
        description: description.trim() || null,
        primary_muscle_group_ids: primaryMuscles,
        secondary_muscle_group_ids: secondaryMuscles,
      });
      const nextDetail: ExerciseDetail = { ...detail, ...updated };
      setDetail(nextDetail);
      setEditorState(nextDetail);
      setShowEditor(false);
      toast("动作已保存", "success");
    } catch (err) {
      toast(err instanceof Error ? err.message : "保存失败", "error");
    }
  }

  async function removeExercise() {
    if (!detail) return;
    const ok = await confirm(
      "删除自定义动作",
      replacement
        ? `删除后，仍在使用的模板中的「${detail.name}」会替换为所选动作；历史训练保留原来的动作和记录方式。`
        : "删除后会保留历史训练记录；未选择替代动作时，模板中的旧引用不会被迁移。"
    );
    if (!ok) return;
    try {
      await deleteExercise(detail.id, replacement || null);
      toast("动作已删除", "success");
      goBack();
    } catch (err) {
      toast(err instanceof Error ? err.message : "删除失败", "error");
    }
  }

  async function rebuildPerformance() {
    if (!detail) return;
    try {
      await rebuildPerformanceForExercise(detail.id);
      const [nextPerformance, nextTrend] = await Promise.all([getExercisePerformanceRecords(detail.id), getExercisePerformanceTrend(detail.id)]);
      setPerformance(nextPerformance);
      setTrend(nextTrend);
      toast("成绩记录已重算", "success");
    } catch (err) {
      toast(err instanceof Error ? err.message : "重算失败", "error");
    }
  }

  if (loading) return <LoadingDetail />;

  if (error || !detail) {
    return (
      <div className="app-page app-screen flex flex-col items-center justify-center app-text-muted gap-3 px-5">
        <p>{error || "动作不存在"}</p>
        <button onClick={goBack} className="app-primary-text text-sm font-medium">返回动作库</button>
      </div>
    );
  }

  return (
    <div className="app-page app-screen">
      <div className="sticky top-0 app-surface border-b app-border px-4 h-14 flex items-center gap-2 z-10">
        <button onClick={goBack} className="app-surface-muted w-9 h-9 shrink-0 flex items-center justify-center rounded-full" aria-label="返回动作库">
          <ChevronLeft size={20} className="app-text" />
        </button>
        <h1 className="text-base font-bold app-text flex-1 min-w-0 truncate">{detail.name}</h1>
        {detail.is_custom && (
          <>
            <button onClick={() => setShowEditor(true)} className="app-primary-text w-9 h-9 shrink-0 flex items-center justify-center" aria-label="编辑动作">
              <Pencil size={18} />
            </button>
            <button onClick={() => setShowDelete(true)} className="app-danger-text w-9 h-9 shrink-0 flex items-center justify-center" aria-label="删除动作">
              <Trash2 size={18} />
            </button>
          </>
        )}
      </div>

      <div className="px-5 pt-4 space-y-4 pb-8">
        <section className="app-surface rounded-2xl border app-border shadow-sm p-4">
          <div className="min-w-0">
            <p className="font-bold app-text break-words">{detail.name}</p>
            <div className="flex flex-wrap items-center gap-1.5 mt-1">
              <Badge>{CATEGORY_LABELS[detail.category] || detail.category}</Badge>
              <Badge>{RECORDING_MODE_LABELS[detail.recording_mode]}</Badge>
              <Badge>{detail.equipment ? EQUIPMENT_LABELS[detail.equipment] : "未设置器械"}</Badge>
              {detail.is_custom && <Badge>自定义</Badge>}
            </div>
          </div>
          <dl className="grid grid-cols-[5rem_minmax(0,1fr)] gap-x-3 gap-y-1.5 mt-3 text-sm">
            <dt className="app-text-muted">记录方式</dt>
            <dd className="app-text font-medium">{RECORDING_MODE_LABELS[detail.recording_mode]}</dd>
            {detail.load_basis && (
              <>
                <dt className="app-text-muted">重量口径</dt>
                <dd className="app-text font-medium">{LOAD_BASIS_LABELS[detail.load_basis]}</dd>
              </>
            )}
            {detail.rate_metric !== "none" && (
              <>
                <dt className="app-text-muted">成绩摘要</dt>
                <dd className="app-text font-medium">
                  {[detail.load_direction ? LOAD_DIRECTION_LABELS[detail.load_direction] : null, RATE_METRIC_LABELS[detail.rate_metric]]
                    .filter(Boolean)
                    .join(" · ")}
                </dd>
              </>
            )}
          </dl>
        </section>

        <section className="app-surface rounded-2xl border app-border shadow-sm p-4 space-y-3">
          <h2 className="text-sm font-bold app-text">目标肌群</h2>
          <MuscleHighlightMap
            primaryMuscleGroupIds={detail.primary_muscle_group_ids}
            secondaryMuscleGroupIds={detail.secondary_muscle_group_ids}
          />
          <MuscleGroupLine label="主目标" values={detail.primary_muscle_group_ids} />
          <MuscleGroupLine label="次要目标" values={detail.secondary_muscle_group_ids} />
        </section>

        <section className="app-surface rounded-2xl border app-border shadow-sm p-4">
          <h2 className="text-sm font-bold app-text mb-2">动作要领</h2>
          <p className="text-sm app-text-muted leading-relaxed whitespace-pre-wrap">{detail.description || "暂无"}</p>
        </section>

        <section>
          <h2 className="text-sm font-bold app-text mb-2 px-1">我的统计</h2>
          <div className="grid grid-cols-2 gap-3">
            <StatCard icon={<Check size={14} />} label="已完成训练" value={detail.stats.completed_workout_count} unit="次" />
            <StatCard icon={<NotebookText size={14} />} label="7天内总组" value={detail.stats.recent_7_day_set_count} unit="组" />
            {bestStatCards(detail.stats.performance).map((card) => (
              <StatCard key={card.label} icon={card.icon} label={card.label} value={card.value} unit={card.unit} />
            ))}
          </div>
        </section>

        <section className="app-surface rounded-2xl border app-border shadow-sm p-4">
          <div className="flex items-center justify-between gap-3 mb-3">
            <h2 className="text-sm font-bold app-text">动作成绩</h2>
            <button onClick={rebuildPerformance} className="app-primary-soft shrink-0 min-h-9 text-xs font-semibold border px-3 py-1 rounded-full">重算</button>
          </div>
          {currentBestPerformance.length === 0 ? (
            <p className="text-sm app-text-muted">暂无 PR/RM 刷新记录</p>
          ) : (
            <div className="space-y-2">
              {currentBestPerformance.map((record) => (
                <button key={record.id} onClick={() => openSourceWorkout(record.source_workout_id)} className="app-surface-muted w-full min-w-0 text-left rounded-xl border app-border p-3">
                  <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
                    <span className="text-sm font-semibold app-text break-words">{record.metric_label}</span>
                    <span className="text-sm font-bold app-primary-text text-right break-words max-w-36">{formatPerformanceMetric(record, displayUnit)}</span>
                  </div>
                  <p className="text-xs app-text-muted mt-1">{record.kind === "rpe_adjusted_rm" ? "基于 RPE 修正" : "真实 PR"} · {record.achieved_at.slice(0, 10)}</p>
                  {formatPerformanceInput(record.input, displayUnit) && (
                    <p className="text-xs app-text-muted mt-1 break-words">{formatPerformanceInput(record.input, displayUnit)}</p>
                  )}
                </button>
              ))}
            </div>
          )}
        </section>

        <section className="app-surface rounded-2xl border app-border shadow-sm p-4">
          <h2 className="text-sm font-bold app-text mb-3">{trend ? `${trend.metric_label}趋势` : "趋势"}</h2>
          {!trend || trendData.length === 0 ? (
            <p className="text-sm app-text-muted">暂无趋势数据</p>
          ) : (
            <div className="app-surface-muted h-40 min-w-0 rounded-xl border app-border p-2">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData}>
                  <XAxis dataKey="date" hide />
                  <YAxis width={48} tickFormatter={(value) => formatOneDecimal(Number(value))} tick={{ fill: "var(--color-text-secondary)", fontSize: 11 }} />
                  <Tooltip
                    contentStyle={CHART_TOOLTIP_CONTENT_STYLE}
                    itemStyle={CHART_TOOLTIP_ITEM_STYLE}
                    labelStyle={CHART_TOOLTIP_LABEL_STYLE}
                    formatter={(value) => [`${formatOneDecimal(Number(value))}${trendUnit ? ` ${trendUnit}` : ""}`, trend.metric_label]}
                  />
                  <Line type="monotone" dataKey="display_value" stroke="var(--color-primary)" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </section>

        <section>
          <h2 className="text-sm font-bold app-text mb-2 px-1">历史组记录</h2>
          {dates.length > 0 ? (
            <div className="space-y-2">
              {dates.map((date) => {
                const records = groupedHistory[date];
                const dayRecording = records[0];
                return (
                  <div key={date} className="app-surface rounded-2xl border app-border shadow-sm overflow-hidden">
                    <div className="app-surface-muted px-4 py-2.5 border-b app-border flex items-center justify-between gap-3">
                      <p className="text-xs font-semibold app-text-muted">{date.replace(/-/g, "/")}</p>
                      <span className="text-xs app-primary-text font-semibold text-right break-words">{formatRecordingDescription(dayRecording)}</span>
                    </div>
                    <div>
                      {records.map((record, index) => (
                        <div key={`${date}-${index}`} className={index > 0 ? "border-t app-border" : ""}>
                          <HistorySet record={record} />
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="app-surface rounded-2xl border app-border py-12 text-center">
              <Dumbbell size={28} className="mx-auto mb-2 app-text-muted" />
              <p className="text-sm app-text-muted">还没有使用记录</p>
            </div>
          )}
        </section>
      </div>

      {showEditor && (
        <ExerciseEditor
          name={name}
          category={category}
          recordingMode={recordingMode}
          loadBasis={loadBasis}
          loadDirection={loadDirection}
          rateMetric={rateMetric}
          equipment={equipment}
          description={description}
          primary={primaryMuscles}
          secondary={secondaryMuscles}
          onName={setName}
          onCategory={setCategory}
          onRecordingMode={setRecordingMode}
          onLoadBasis={setLoadBasis}
          onLoadDirection={setLoadDirection}
          onRateMetric={setRateMetric}
          onEquipment={setEquipment}
          onDescription={setDescription}
          onPrimary={setPrimaryMuscles}
          onSecondary={setSecondaryMuscles}
          onClose={() => setShowEditor(false)}
          onSave={saveEdit}
        />
      )}

      {showDelete && (
        <div className="fixed inset-0 z-[90] flex items-end justify-center">
          <button className="absolute inset-0 bg-black/50" onClick={() => setShowDelete(false)} aria-label="关闭删除选择" />
          <div className="app-surface relative w-full max-w-[480px] max-h-[88dvh] overflow-y-auto rounded-t-3xl p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] space-y-4 md:max-w-[768px]">
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-semibold app-text min-w-0">删除自定义动作</h2>
              <button onClick={() => setShowDelete(false)} className="app-surface-muted w-9 h-9 shrink-0 rounded-full flex items-center justify-center" aria-label="关闭">
                <X size={18} />
              </button>
            </div>
            <p className="text-sm app-text-muted leading-relaxed">
              选择替代动作后，仍在使用的模板会迁移到目标动作；历史训练保留原来的动作和记录方式。
            </p>
            <select
              value={replacement}
              onChange={(event) => setReplacement(event.target.value)}
              className="app-input w-full h-12 rounded-xl border px-3 text-sm"
            >
              <option value="">仅删除，不迁移模板</option>
              {availableExercises.filter((exercise) => exercise.id !== detail.id && recordingSnapshotEquals(exercise, detail)).map((exercise) => (
                <option key={exercise.id} value={exercise.id}>{exercise.name}</option>
              ))}
            </select>
            <button onClick={removeExercise} className="app-danger-bg w-full min-h-12 rounded-xl px-3 py-2 text-sm font-semibold break-words">
              {replacement ? "迁移模板后删除" : "仅删除"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function ExerciseEditor(props: {
  name: string;
  category: ExerciseCategory;
  recordingMode: RecordingMode;
  loadBasis: LoadBasis | null;
  loadDirection: LoadDirection | null;
  rateMetric: RateMetric;
  equipment: EquipmentId | null;
  description: string;
  primary: MuscleGroupId[];
  secondary: MuscleGroupId[];
  onName: (value: string) => void;
  onCategory: (value: ExerciseCategory) => void;
  onRecordingMode: (value: RecordingMode) => void;
  onLoadBasis: (value: LoadBasis | null) => void;
  onLoadDirection: (value: LoadDirection | null) => void;
  onRateMetric: (value: RateMetric) => void;
  onEquipment: (value: EquipmentId | null) => void;
  onDescription: (value: string) => void;
  onPrimary: (value: MuscleGroupId[]) => void;
  onSecondary: (value: MuscleGroupId[]) => void;
  onClose: () => void;
  onSave: () => void;
}) {
  const value: CustomExerciseFormValue = {
    name: props.name,
    category: props.category,
    recording_mode: props.recordingMode,
    load_basis: props.loadBasis,
    load_direction: props.loadDirection,
    rate_metric: props.rateMetric,
    equipment: props.equipment,
    description: props.description,
    primary_muscle_group_ids: props.primary,
    secondary_muscle_group_ids: props.secondary,
  };
  function onChange(next: CustomExerciseFormValue) {
    props.onName(next.name);
    props.onCategory(next.category);
    props.onRecordingMode(next.recording_mode);
    props.onLoadBasis(next.load_basis);
    props.onLoadDirection(next.load_direction);
    props.onRateMetric(next.rate_metric);
    props.onEquipment(next.equipment);
    props.onDescription(next.description);
    props.onPrimary(next.primary_muscle_group_ids);
    props.onSecondary(next.secondary_muscle_group_ids);
  }

  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center">
      <button className="absolute inset-0 bg-black/50" onClick={props.onClose} aria-label="关闭编辑动作" />
      <div className="app-surface relative w-full max-w-[480px] max-h-[88dvh] overflow-y-auto rounded-t-3xl p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] space-y-3 md:max-w-[768px]">
        <div className="flex justify-between items-center gap-3">
          <h2 className="font-semibold app-text min-w-0">编辑自定义动作</h2>
          <button onClick={props.onClose} className="app-surface-muted w-9 h-9 shrink-0 rounded-full flex items-center justify-center" aria-label="关闭">
            <X size={18} />
          </button>
        </div>
        <CustomExerciseForm value={value} onChange={onChange} onSubmit={props.onSave} submitLabel="保存" />
      </div>
    </div>
  );
}

function MuscleGroupLine({ label, values }: { label: string; values: MuscleGroupId[] }) {
  return (
    <div className="flex items-start gap-3">
      <span className="w-16 shrink-0 text-xs app-text-muted pt-1">{label}</span>
      <div className="flex-1 flex flex-wrap gap-1.5">
        {values.length > 0 ? values.map((id) => <Badge key={id}>{MUSCLE_GROUP_LABELS[id]}</Badge>) : <span className="text-sm app-text-muted">暂无</span>}
      </div>
    </div>
  );
}

function Badge({ children }: { children: string }) {
  return <span className="text-xs app-primary-soft px-2 py-0.5 rounded-full font-semibold border">{children}</span>;
}

function StatCard({ icon, label, value, unit }: { icon: ReactNode; label: string; value: string | number; unit?: string }) {
  return (
    <div className="app-surface min-w-0 rounded-2xl border app-border shadow-sm p-4">
      <div className="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-1.5 mb-2 app-primary-text">
        <span className="mt-0.5">{icon}</span>
        <span className="text-xs app-text-muted font-medium break-words">{label}</span>
      </div>
      <p className="text-xl font-bold app-text break-words">
        {value}
        {unit && <span className="text-sm font-normal app-text-muted ml-1">{unit}</span>}
      </p>
    </div>
  );
}

export function bestStatCards(stats: ExerciseDetail["stats"]["performance"]): Array<{ icon: ReactNode; label: string; value: string | number; unit?: string }> {
  const cards: Array<{ icon: ReactNode; label: string; value: string | number; unit?: string }> = [];
  if (stats.load_basis === "per_hand" && stats.best_input_load != null) {
    cards.push({
      icon: <TrendingUp size={14} />,
      label: stats.load_direction === "lower_better" ? "最低输入辅助重量" : "最大输入重量",
      value: round(stats.best_input_load),
      unit: stats.display_unit,
    });
  }
  if (stats.best_effective_load != null) {
    cards.push({
      icon: <TrendingUp size={14} />,
      label: stats.load_direction === "lower_better" ? "最低有效辅助重量" : "最大有效负重",
      value: round(stats.best_effective_load),
      unit: stats.display_unit,
    });
  }
  if (stats.best_set_volume != null) {
    cards.push({ icon: <Gauge size={14} />, label: "最大单组容量", value: formatOneDecimal(stats.best_set_volume), unit: `${stats.display_unit}·次` });
  }
  if (stats.best_reps != null) cards.push({ icon: <TrendingUp size={14} />, label: "最大次数", value: stats.best_reps, unit: "次" });
  if (stats.best_distance_m != null) cards.push({ icon: <TrendingUp size={14} />, label: "最大距离", value: round(stats.best_distance_m), unit: "m" });
  if (stats.best_duration_sec != null) cards.push({ icon: <TrendingUp size={14} />, label: "最长时间", value: formatDuration(stats.best_duration_sec) });
  if (stats.best_speed_mps != null) cards.push({ icon: <TrendingUp size={14} />, label: "最快速度", value: round(stats.best_speed_mps), unit: "m/s" });
  if (stats.best_load_distance_kg_m != null) cards.push({ icon: <Gauge size={14} />, label: "最大距离负载", value: formatOneDecimal(convertWeight(stats.best_load_distance_kg_m, "kg", stats.display_unit)), unit: `${stats.display_unit}·m` });
  if (stats.best_load_duration_kg_sec != null) cards.push({ icon: <Gauge size={14} />, label: "最大持续负载", value: formatOneDecimal(convertWeight(stats.best_load_duration_kg_sec, "kg", stats.display_unit)), unit: `${stats.display_unit}·s` });
  if (stats.best_load_distance_rate_kg_mps != null) cards.push({ icon: <Gauge size={14} />, label: "最大单位时间负载", value: round(convertWeight(stats.best_load_distance_rate_kg_mps, "kg", stats.display_unit)), unit: `${stats.display_unit}·m/s` });
  return cards;
}

function HistorySet({ record }: { record: ExerciseHistoryRecord }) {
  return (
    <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-3 px-4 py-2.5">
      <span className="text-xs font-semibold app-text-muted whitespace-nowrap">第{record.set_number}组</span>
      <span className="text-sm font-semibold app-text break-words">{formatSet(record, record)}</span>
    </div>
  );
}

function LoadingDetail() {
  return (
    <div className="app-page app-screen px-5 pt-16 pb-4 space-y-3">
      {[1, 2, 3].map((item) => (
        <div key={item} className="app-surface rounded-2xl p-4 border app-border animate-pulse">
          <div className="app-surface-muted h-4 rounded-xl w-1/2 mb-2" />
          <div className="app-surface-muted h-3 rounded-xl w-3/4" />
        </div>
      ))}
    </div>
  );
}

function round(value: number): number {
  return Math.round(value * 10) / 10;
}

function formatDuration(seconds: number): string {
  if (seconds <= 0) return "0 分钟";
  const minutes = Math.floor(seconds / 60);
  const remain = seconds % 60;
  if (minutes === 0) return `${remain} 秒`;
  return remain === 0 ? `${minutes} 分钟` : `${minutes} 分 ${remain} 秒`;
}

function currentBestByMetric(records: PerformanceRecord[], loadBasis: LoadBasis | null): PerformanceRecord[] {
  const best = new Map<string, PerformanceRecord>();
  for (const record of records) {
    if (record.metric_type === "weight.max_input" && loadBasis !== "per_hand") continue;
    const previous = best.get(record.metric_type);
    const comparison = previous ? comparePerformanceValues({
      metricType: record.metric_type,
      leftValue: record.value,
      rightValue: previous.value,
    }) : 1;
    if (comparison > 0 || (comparison === 0 && previous && record.achieved_at > previous.achieved_at)) {
      best.set(record.metric_type, record);
    }
  }
  return [...best.values()].sort((left, right) => metricOrder(left.metric_type) - metricOrder(right.metric_type));
}

function metricOrder(metricType: PerformanceRecord["metric_type"]): number {
  const order: PerformanceRecord["metric_type"][] = [
    "weight.max_input",
    "weight.max_effective",
    "assistance.min_weight",
    "assistance.best_reps",
    "reps.max_set",
    "reps.max_workout",
    "volume.max_set",
    "volume.max_workout",
    "rm.rpe_adjusted_mean",
    "distance.max_set",
    "distance.max_workout",
    "duration.max_set",
    "duration.max_workout",
    "speed.max",
    "load_duration.max",
    "load_distance.max",
    "load_distance_rate.max",
  ];
  const index = order.indexOf(metricType);
  return index === -1 ? Number.MAX_SAFE_INTEGER : index;
}

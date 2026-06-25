import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Check, ChevronLeft, Dumbbell, Gauge, ListChecks, NotebookText, Pencil, Rocket, Trash2, TrendingUp, X } from "lucide-react";
import { getExerciseDetail } from "@/services/plan";
import { deleteExercise, getExerciseHistory, getExercises, updateExercise } from "@/services/exercise";
import type { Exercise, ExerciseDetail, MuscleGroupId } from "@/types";
import type { ExerciseHistoryRecord } from "@/services/exercise";
import { CATEGORY_LABELS, MUSCLE_GROUP_LABELS } from "@/types";
import { useConfirmStore } from "@/components/ConfirmDialog";
import { useToastStore } from "@/components/Toast";

const TYPE_LABELS: Record<Exercise["type"], string> = {
  strength: "力量",
  cardio: "有氧",
  reps_only: "徒手次数",
  static_hold: "静态保持",
};

const MUSCLE_GROUP_OPTIONS = Object.entries(MUSCLE_GROUP_LABELS) as Array<[MuscleGroupId, string]>;

export default function ExerciseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const confirm = useConfirmStore((state) => state.show);
  const toast = useToastStore((state) => state.add);
  const [detail, setDetail] = useState<ExerciseDetail | null>(null);
  const [history, setHistory] = useState<ExerciseHistoryRecord[]>([]);
  const [availableExercises, setAvailableExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showEditor, setShowEditor] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [type, setType] = useState<Exercise["type"]>("strength");
  const [description, setDescription] = useState("");
  const [primaryMuscles, setPrimaryMuscles] = useState<MuscleGroupId[]>([]);
  const [secondaryMuscles, setSecondaryMuscles] = useState<MuscleGroupId[]>([]);
  const [replacement, setReplacement] = useState("");

  useEffect(() => {
    if (!id) return;
    let alive = true;
    setLoading(true);
    setError(null);
    Promise.all([getExerciseDetail(id), getExerciseHistory(id, 20), getExercises()])
      .then(([nextDetail, nextHistory, exercises]) => {
        if (!alive) return;
        setDetail(nextDetail);
        setHistory(nextHistory);
        setAvailableExercises(exercises);
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

  const groupedHistory = useMemo(() => {
    const byDate: Record<string, ExerciseHistoryRecord[]> = {};
    for (const record of history) {
      if (!byDate[record.date]) byDate[record.date] = [];
      byDate[record.date].push(record);
    }
    return byDate;
  }, [history]);
  const dates = Object.keys(groupedHistory).sort((a, b) => b.localeCompare(a));

  function setEditorState(nextDetail: ExerciseDetail) {
    setName(nextDetail.name);
    setCategory(nextDetail.category);
    setType(nextDetail.type as Exercise["type"]);
    setDescription(nextDetail.description || "");
    setPrimaryMuscles(nextDetail.primary_muscle_group_ids);
    setSecondaryMuscles(nextDetail.secondary_muscle_group_ids);
  }

  function goBack() {
    const from = searchParams.get("from");
    navigate(from && from.startsWith("/exercises") ? from : "/exercises");
  }

  async function saveEdit() {
    if (!detail) return;
    try {
      const updated = await updateExercise(detail.id, {
        name,
        category,
        type,
        description,
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
        ? `删除后，存活模板中的「${detail.name}」会替换为所选动作；历史训练记录保留原始 ID 和记录类型。`
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

  if (loading) return <LoadingDetail />;

  if (error || !detail) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center text-slate-400 gap-3 px-5">
        <p>{error || "动作不存在"}</p>
        <button onClick={goBack} className="text-emerald-600 text-sm font-medium">返回动作库</button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="sticky top-0 bg-white/95 backdrop-blur-sm border-b border-slate-100 px-4 h-14 flex items-center gap-3 z-10">
        <button onClick={goBack} className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-slate-100 transition-colors">
          <ChevronLeft size={20} className="text-slate-700" />
        </button>
        <h1 className="text-base font-bold text-slate-900 flex-1 truncate">{detail.name}</h1>
        {detail.is_custom && (
          <>
            <button onClick={() => setShowEditor(true)} className="p-2 text-emerald-600" aria-label="编辑动作">
              <Pencil size={18} />
            </button>
            <button onClick={() => setShowDelete(true)} className="p-2 text-red-500" aria-label="删除动作">
              <Trash2 size={18} />
            </button>
          </>
        )}
      </div>

      <div className="px-5 pt-4 space-y-4 pb-8">
        <section className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
          <div className="min-w-0">
            <p className="font-bold text-slate-900 truncate">{detail.name}</p>
            <div className="flex flex-wrap items-center gap-1.5 mt-1">
              <Badge>{CATEGORY_LABELS[detail.category] || detail.category}</Badge>
              <Badge>{TYPE_LABELS[detail.type as Exercise["type"]] || detail.type}</Badge>
              {detail.is_custom && <Badge>自定义</Badge>}
            </div>
          </div>
        </section>

        <section className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 space-y-3">
          <h2 className="text-sm font-bold text-slate-700">目标肌群</h2>
          <MuscleGroupLine label="主目标" values={detail.primary_muscle_group_ids} />
          <MuscleGroupLine label="次要目标" values={detail.secondary_muscle_group_ids} />
        </section>

        <section className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
          <h2 className="text-sm font-bold text-slate-700 mb-2">动作要领</h2>
          <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">{detail.description || "暂无"}</p>
        </section>

        <section>
          <h2 className="text-sm font-bold text-slate-700 mb-2 px-1">我的统计</h2>
          <div className="grid grid-cols-2 gap-3">
            <StatCard icon={<Check size={14} />} label="已完成训练" value={detail.stats.completed_workout_count} unit="次" />
            <StatCard icon={<NotebookText size={14} />} label="7天内总组" value={detail.stats.recent_7_day_set_count} unit="组" />
            {bestStatCards(detail).map((card) => (
              <StatCard key={card.label} icon={card.icon} label={card.label} value={card.value} unit={card.unit} />
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-sm font-bold text-slate-700 mb-2 px-1">历史组记录</h2>
          {dates.length > 0 ? (
            <div className="space-y-2">
              {dates.map((date) => {
                const records = groupedHistory[date];
                const dayType = records[0].exercise_type;
                const maxWeight = dayType === "strength" ? Math.max(...records.map((record) => record.weight ?? 0)) : 0;
                return (
                  <div key={date} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                    <div className="px-4 py-2.5 bg-slate-50/60 border-b border-slate-50 flex items-center justify-between">
                      <p className="text-xs font-semibold text-slate-500">{date.replace(/-/g, "/")}</p>
                      <span className="text-xs text-emerald-600 font-semibold">{TYPE_LABELS[dayType]}</span>
                    </div>
                    <div className="divide-y divide-slate-50">
                      {records.map((record, index) => (
                        <HistorySet key={`${date}-${index}`} record={record} maxWeight={maxWeight} />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-100 py-12 text-center">
              <Dumbbell size={28} className="mx-auto mb-2 text-slate-300" />
              <p className="text-sm text-slate-400">还没有使用记录</p>
            </div>
          )}
        </section>
      </div>

      {showEditor && (
        <ExerciseEditor
          name={name}
          category={category}
          type={type}
          description={description}
          primary={primaryMuscles}
          secondary={secondaryMuscles}
          onName={setName}
          onCategory={setCategory}
          onType={setType}
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
          <div className="relative w-full max-w-[480px] bg-white rounded-t-3xl p-5 space-y-4 md:max-w-[768px]">
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-semibold text-slate-900">删除自定义动作</h2>
              <button onClick={() => setShowDelete(false)} className="w-9 h-9 rounded-full hover:bg-slate-100 flex items-center justify-center">
                <X size={18} />
              </button>
            </div>
            <p className="text-sm text-slate-500 leading-relaxed">
              选择替代动作后，存活模板会迁移到目标动作；历史训练保留原始动作 ID 和记录类型快照。
            </p>
            <select
              value={replacement}
              onChange={(event) => setReplacement(event.target.value)}
              className="w-full h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-400"
            >
              <option value="">仅删除，不迁移模板</option>
              {availableExercises.filter((exercise) => exercise.id !== detail.id && exercise.type === detail.type).map((exercise) => (
                <option key={exercise.id} value={exercise.id}>{exercise.name}</option>
              ))}
            </select>
            <button onClick={removeExercise} className="w-full h-11 rounded-xl bg-red-500 text-white text-sm font-semibold">
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
  category: string;
  type: Exercise["type"];
  description: string;
  primary: MuscleGroupId[];
  secondary: MuscleGroupId[];
  onName: (value: string) => void;
  onCategory: (value: string) => void;
  onType: (value: Exercise["type"]) => void;
  onDescription: (value: string) => void;
  onPrimary: (value: MuscleGroupId[]) => void;
  onSecondary: (value: MuscleGroupId[]) => void;
  onClose: () => void;
  onSave: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center">
      <button className="absolute inset-0 bg-black/50" onClick={props.onClose} aria-label="关闭编辑动作" />
      <div className="relative w-full max-w-[480px] max-h-[88dvh] overflow-y-auto bg-white rounded-t-3xl p-5 space-y-3 md:max-w-[768px]">
        <div className="flex justify-between items-center">
          <h2 className="font-semibold text-slate-900">编辑自定义动作</h2>
          <button onClick={props.onClose} className="w-9 h-9 rounded-full hover:bg-slate-100 flex items-center justify-center">
            <X size={18} />
          </button>
        </div>
        <input value={props.name} onChange={(event) => props.onName(event.target.value)} className="w-full h-11 border border-slate-200 rounded-xl px-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-400" />
        <input value={props.category} onChange={(event) => props.onCategory(event.target.value)} className="w-full h-11 border border-slate-200 rounded-xl px-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-400" />
        <select value={props.type} onChange={(event) => props.onType(event.target.value as Exercise["type"])} className="w-full h-11 border border-slate-200 rounded-xl px-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-400">
          <option value="strength">力量</option>
          <option value="cardio">有氧</option>
          <option value="reps_only">徒手次数</option>
          <option value="static_hold">静态保持</option>
        </select>
        <textarea value={props.description} onChange={(event) => props.onDescription(event.target.value)} rows={4} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-400" placeholder="动作要领" />
        <MusclePicker title="主目标肌群" selected={props.primary} disabled={props.secondary} max={3} onChange={props.onPrimary} />
        <MusclePicker title="次要目标肌群" selected={props.secondary} disabled={props.primary} max={6} onChange={props.onSecondary} />
        <button onClick={props.onSave} className="w-full h-11 bg-emerald-500 text-white rounded-xl font-semibold text-sm">保存</button>
      </div>
    </div>
  );
}

function MusclePicker({ title, selected, disabled, max, onChange }: {
  title: string;
  selected: MuscleGroupId[];
  disabled: MuscleGroupId[];
  max: number;
  onChange: (value: MuscleGroupId[]) => void;
}) {
  function toggle(id: MuscleGroupId) {
    if (disabled.includes(id)) return;
    if (selected.includes(id)) {
      onChange(selected.filter((item) => item !== id));
      return;
    }
    if (selected.length >= max) return;
    onChange([...selected, id]);
  }

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold text-slate-500">{title}</p>
      <div className="flex flex-wrap gap-2">
        {MUSCLE_GROUP_OPTIONS.map(([id, label]) => {
          const active = selected.includes(id);
          const blocked = disabled.includes(id);
          return (
            <button
              key={id}
              type="button"
              onClick={() => toggle(id)}
              className={`px-2.5 py-1.5 rounded-full border text-xs font-medium ${
                active
                  ? "bg-emerald-500 border-emerald-500 text-white"
                  : blocked
                    ? "bg-slate-50 border-slate-100 text-slate-300"
                    : "bg-white border-slate-200 text-slate-600"
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function MuscleGroupLine({ label, values }: { label: string; values: MuscleGroupId[] }) {
  return (
    <div className="flex items-start gap-3">
      <span className="w-16 shrink-0 text-xs text-slate-500 pt-1">{label}</span>
      <div className="flex-1 flex flex-wrap gap-1.5">
        {values.length > 0 ? values.map((id) => <Badge key={id}>{MUSCLE_GROUP_LABELS[id]}</Badge>) : <span className="text-sm text-slate-400">暂无</span>}
      </div>
    </div>
  );
}

function Badge({ children }: { children: string }) {
  return <span className="text-xs bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-full font-semibold border border-emerald-100">{children}</span>;
}

function StatCard({ icon, label, value, unit }: { icon: ReactNode; label: string; value: string | number; unit?: string }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
      <div className="flex items-center gap-1.5 mb-2 text-emerald-500">
        {icon}
        <span className="text-xs text-slate-500 font-medium">{label}</span>
      </div>
      <p className="text-xl font-bold text-slate-900">
        {value}
        {unit && <span className="text-sm font-normal text-slate-400 ml-1">{unit}</span>}
      </p>
    </div>
  );
}

function bestStatCards(detail: ExerciseDetail): Array<{ icon: ReactNode; label: string; value: string | number; unit?: string }> {
  if (detail.type === "strength") {
    return [
      {
        icon: <TrendingUp size={14} />,
        label: "单次最大重量",
        value: detail.stats.strength.best_weight == null ? "暂无" : round(detail.stats.strength.best_weight),
        unit: detail.stats.strength.best_weight == null ? undefined : detail.stats.strength.display_unit,
      },
      {
        icon: <Gauge size={14} />,
        label: "单次最大容量",
        value: detail.stats.strength.best_volume > 0 ? round(detail.stats.strength.best_volume) : "暂无",
        unit: detail.stats.strength.best_volume > 0 ? detail.stats.strength.display_unit : undefined,
      },
    ];
  }
  if (detail.type === "cardio") {
    return [
      {
        icon: <TrendingUp size={14} />,
        label: "单次最大距离",
        value: detail.stats.cardio.best_distance_m > 0 ? round(detail.stats.cardio.best_distance_m / 1000) : "暂无",
        unit: detail.stats.cardio.best_distance_m > 0 ? "km" : undefined,
      },
      {
        icon: <Rocket size={14} />,
        label: "单次最快速度",
        value: detail.stats.cardio.best_speed_kmh == null ? "暂无" : round(detail.stats.cardio.best_speed_kmh),
        unit: detail.stats.cardio.best_speed_kmh == null ? undefined : "km/h",
      },
    ];
  }
  if (detail.type === "reps_only") {
    return [{
      icon: <ListChecks size={14} />,
      label: "单次最大次数",
      value: detail.stats.reps_only.best_reps > 0 ? detail.stats.reps_only.best_reps : "暂无",
      unit: detail.stats.reps_only.best_reps > 0 ? "次" : undefined,
    }];
  }
  return [{
    icon: <TrendingUp size={14} />,
    label: "单次最长保持",
    value: detail.stats.static_hold.best_duration_sec > 0 ? formatDuration(detail.stats.static_hold.best_duration_sec) : "暂无",
  }];
}

function HistorySet({ record, maxWeight }: { record: ExerciseHistoryRecord; maxWeight: number }) {
  return (
    <div className="flex items-center gap-3 px-4 py-2.5">
      <span className="text-xs font-semibold text-slate-400 w-8">第{record.set_number}组</span>
      {record.exercise_type === "cardio" ? (
        <span className="text-sm font-semibold text-slate-600">{record.distance_m ?? "—"} m · {record.duration_sec ?? "—"} s</span>
      ) : record.exercise_type === "static_hold" ? (
        <span className="text-sm font-semibold text-slate-600">{record.duration_sec ?? "—"} s</span>
      ) : (
        <>
          {record.exercise_type === "strength" && (
            <>
              <span className={`text-sm font-bold ${record.weight === maxWeight && maxWeight > 0 ? "text-emerald-600" : "text-slate-800"}`}>
                {record.weight !== null ? `${record.weight}${record.unit}` : "—"}
              </span>
              <span className="text-slate-300">×</span>
            </>
          )}
          <span className="text-sm font-semibold text-slate-600">{record.reps !== null ? `${record.reps}次` : "—"}</span>
        </>
      )}
    </div>
  );
}

function LoadingDetail() {
  return (
    <div className="min-h-screen bg-slate-50 px-5 pt-16 pb-4 space-y-3">
      {[1, 2, 3].map((item) => (
        <div key={item} className="bg-white rounded-2xl p-4 border border-slate-100 animate-pulse">
          <div className="h-4 bg-slate-100 rounded-xl w-1/2 mb-2" />
          <div className="h-3 bg-slate-100 rounded-xl w-3/4" />
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

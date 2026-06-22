import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ChevronLeft, Dumbbell, TrendingUp, Calendar, Pencil, Trash2, X } from "lucide-react";
import { getExerciseDetail } from "@/services/plan";
import { deleteExercise, getExerciseHistory, getExercises, updateExercise } from "@/services/exercise";
import type { Exercise, ExerciseDetail } from "@/types";
import type { ExerciseHistoryRecord } from "@/services/exercise";
import { CATEGORY_LABELS } from "@/types";
import { useToastStore } from "@/components/Toast";

export default function ExerciseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [detail, setDetail] = useState<ExerciseDetail | null>(null);
  const [history, setHistory] = useState<ExerciseHistoryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [availableExercises, setAvailableExercises] = useState<Exercise[]>([]);
  const [showEditor, setShowEditor] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [type, setType] = useState<Exercise["type"]>("strength");
  const [replacement, setReplacement] = useState("");

  useEffect(() => {
    if (!id) return;
    Promise.all([
      getExerciseDetail(id),
      getExerciseHistory(id, 20),
      getExercises(),
    ])
      .then(([d, h, exercises]) => {
        setDetail(d);
        setHistory(h);
        setAvailableExercises(exercises);
        if (d) { setName(d.name); setCategory(d.category); setType(d.type as Exercise["type"]); }
      })
      .finally(() => setLoading(false));
  }, [id]);

  async function saveEdit() {
    if (!detail) return;
    try {
      const updated = await updateExercise(detail.id, { name, category, type });
      setDetail({ ...detail, ...updated });
      setShowEditor(false);
    } catch (error) { useToastStore.getState().add(error instanceof Error ? error.message : "保存失败", "error"); }
  }

  async function removeExercise() {
    if (!detail) return;
    try { await deleteExercise(detail.id, replacement || null); navigate(-1); }
    catch (error) { useToastStore.getState().add(error instanceof Error ? error.message : "删除失败", "error"); }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 px-5 pt-16 pb-4 space-y-3">
        {[1,2,3].map(i => (
          <div key={i} className="bg-white rounded-2xl p-4 border border-slate-100 animate-pulse">
            <div className="h-4 bg-slate-200 rounded-xl w-1/2 mb-2" />
            <div className="h-3 bg-slate-200 rounded-xl w-3/4" />
          </div>
        ))}
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-slate-400 gap-3">
        <p>动作不存在</p>
        <button onClick={() => navigate(-1)} className="text-emerald-600 text-sm font-medium">
          返回
        </button>
      </div>
    );
  }

  // Group history by date
  const byDate: Record<string, ExerciseHistoryRecord[]> = {};
  for (const record of history) {
    if (!byDate[record.date]) byDate[record.date] = [];
    byDate[record.date].push(record);
  }
  const dates = Object.keys(byDate).sort((a, b) => b.localeCompare(a));

  const TYPE_LABELS: Record<string, string> = {
    strength: "力量",
    cardio: "有氧",
    reps_only: "徒手次数",
    static_hold: "静态保持",
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="sticky top-0 bg-white/95 backdrop-blur-sm border-b border-slate-100 px-4 h-14 flex items-center gap-3 z-10">
        <button
          onClick={() => navigate(-1)}
          className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-slate-100 transition-colors"
        >
          <ChevronLeft size={20} className="text-slate-700" />
        </button>
        <h1 className="text-base font-bold text-slate-900 flex-1 truncate">{detail.name}</h1>
        {detail.is_custom && <><button onClick={() => setShowEditor(true)} className="p-2 text-emerald-600"><Pencil size={18} /></button><button onClick={() => setShowDelete(true)} className="p-2 text-red-500"><Trash2 size={18} /></button></>}
      </div>

      <div className="px-5 pt-4 space-y-4 pb-8">
        {/* Basic Info */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center flex-shrink-0">
              <Dumbbell size={22} className="text-emerald-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-slate-900 truncate">{detail.name}</p>
              <div className="flex flex-wrap items-center gap-1.5 mt-1">
                <span className="text-xs bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-full font-semibold border border-emerald-100">
                  {CATEGORY_LABELS[detail.category] || detail.category}
                </span>
                <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-medium">
                  {TYPE_LABELS[detail.type] || detail.type}
                </span>
                {detail.is_custom && (
                  <span className="text-xs bg-amber-50 text-amber-600 px-2 py-0.5 rounded-full font-medium border border-amber-100">
                    自定义
                  </span>
                )}
              </div>
            </div>
          </div>

          {detail.description && (
            <p className="text-sm text-slate-600 leading-relaxed border-t border-slate-50 pt-3">
              {detail.description}
            </p>
          )}

          {detail.met_value && (
            <div className="flex items-center justify-between text-sm mt-2 pt-2 border-t border-slate-50">
              <span className="text-slate-500">MET 值</span>
              <span className="font-bold text-slate-800">{detail.met_value}</span>
            </div>
          )}
        </div>

        {/* Usage Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
            <div className="flex items-center gap-1.5 mb-2">
              <TrendingUp size={14} className="text-emerald-500" />
              <span className="text-xs text-slate-500 font-medium">累计使用</span>
            </div>
            <p className="text-2xl font-bold text-slate-900">
              {detail.usage_count}
              <span className="text-sm font-normal text-slate-400 ml-1">组</span>
            </p>
          </div>
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
            <div className="flex items-center gap-1.5 mb-2">
              <Calendar size={14} className="text-emerald-500" />
              <span className="text-xs text-slate-500 font-medium">最近使用</span>
            </div>
            <p className="text-lg font-bold text-slate-900">
              {detail.last_used_date
                ? detail.last_used_date.replace(/-/g, "/").slice(5)
                : "—"}
            </p>
          </div>
        </div>

        {/* History */}
        {dates.length > 0 && (
          <div>
            <h2 className="text-sm font-bold text-slate-700 mb-2 px-1">历史记录</h2>
            <div className="space-y-2">
              {dates.map((date) => {
                const type = byDate[date][0].exercise_type;
                const maxW = type === "strength" ? Math.max(...byDate[date].map(r => r.weight ?? 0)) : 0;
                return (
                  <div key={date} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                    <div className="px-4 py-2.5 bg-slate-50/60 border-b border-slate-50 flex items-center justify-between">
                      <p className="text-xs font-semibold text-slate-500">
                        {date.replace(/-/g, "/")}
                      </p>
                      <span className="text-xs text-emerald-600 font-semibold">
                        {type === "cardio" ? "距离与时长" : type === "static_hold" ? "保持时长" : type === "reps_only" ? "完成次数" : `最大 ${maxW}kg`}
                      </span>
                    </div>
                    <div className="divide-y divide-slate-50">
                      {byDate[date].map((r, i) => (
                        <div key={i} className="flex items-center gap-3 px-4 py-2.5">
                          <span className="text-xs font-semibold text-slate-400 w-8">第{r.set_number}组</span>
                          {r.exercise_type === "cardio" ? <span className="text-sm font-semibold text-slate-600">{r.distance_m ?? "—"} m · {r.duration_sec ?? "—"} s</span> : r.exercise_type === "static_hold" ? <span className="text-sm font-semibold text-slate-600">{r.duration_sec ?? "—"} s</span> : <>
                            {r.exercise_type === "strength" && <><span className={`text-sm font-bold ${r.weight === maxW && maxW > 0 ? "text-emerald-600" : "text-slate-800"}`}>{r.weight !== null ? `${r.weight}${r.unit}` : "—"}</span><span className="text-slate-300">×</span></>}
                            <span className="text-sm font-semibold text-slate-600">{r.reps !== null ? `${r.reps}次` : "—"}</span>
                          </>}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {dates.length === 0 && (
          <div className="bg-white rounded-2xl border border-slate-100 py-12 text-center">
            <Dumbbell size={28} className="mx-auto mb-2 text-slate-300" />
            <p className="text-sm text-slate-400">还没有使用记录</p>
          </div>
        )}
      </div>
      {showEditor && <div className="fixed inset-0 z-50 bg-black/50 flex items-end"><div className="w-full bg-white rounded-t-3xl p-5 space-y-3"><div className="flex justify-between"><h2 className="font-semibold">编辑自定义动作</h2><button onClick={() => setShowEditor(false)}><X size={20} /></button></div><input value={name} onChange={(event) => setName(event.target.value)} className="w-full border border-slate-200 rounded-xl px-3 py-2.5" /><input value={category} onChange={(event) => setCategory(event.target.value)} className="w-full border border-slate-200 rounded-xl px-3 py-2.5" /><select value={type} onChange={(event) => setType(event.target.value as Exercise["type"])} className="w-full border border-slate-200 rounded-xl px-3 py-2.5"><option value="strength">力量</option><option value="cardio">有氧</option><option value="reps_only">徒手次数</option><option value="static_hold">静态保持</option></select><button onClick={saveEdit} className="w-full py-2.5 bg-emerald-500 text-white rounded-xl font-semibold">保存</button></div></div>}
      {showDelete && <div className="fixed inset-0 z-50 bg-black/50 flex items-end"><div className="w-full bg-white rounded-t-3xl p-5 space-y-3"><div className="flex justify-between"><h2 className="font-semibold">删除自定义动作</h2><button onClick={() => setShowDelete(false)}><X size={20} /></button></div><p className="text-sm text-slate-600">仅删除会保留模板和历史的原始引用。选择替代动作后，活跃模板会原子迁移；历史训练只解析显示名称，记录方式保持不变。</p><select value={replacement} onChange={(event) => setReplacement(event.target.value)} className="w-full border border-slate-200 rounded-xl px-3 py-2.5"><option value="">仅删除（不迁移）</option>{availableExercises.filter((exercise) => exercise.id !== detail.id).map((exercise) => <option key={exercise.id} value={exercise.id}>{exercise.name}</option>)}</select><button onClick={removeExercise} className="w-full py-2.5 bg-red-500 text-white rounded-xl font-semibold">{replacement ? "迁移后删除" : "仅删除"}</button></div></div>}
    </div>
  );
}

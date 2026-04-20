import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getWorkout, deleteWorkout, copyWorkout, shareWorkout } from "@/services/workout";
import type { WorkoutShareData } from "@/services/workout";
import type { Workout } from "@/types";
import { CATEGORY_LABELS, MOOD_LABELS } from "@/types";
import {
  ArrowLeft,
  Copy,
  Trash2,
  Clock,
  Dumbbell,
  MoreHorizontal,
  Pencil,
  Share2,
  X,
} from "lucide-react";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";
import { useToastStore } from "@/components/Toast";
import { useConfirmStore } from "@/components/ConfirmDialog";

const MOOD_EMOJI: Record<number, string> = { 1: "😫", 2: "😕", 3: "😐", 4: "😊", 5: "🔥" };

export default function WorkoutDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [workout, setWorkout] = useState<Workout | null>(null);
  const [loading, setLoading] = useState(true);
  const [showMenu, setShowMenu] = useState(false);
  const [copyDate, setCopyDate] = useState("");
  const [showCopyModal, setShowCopyModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareData, setShareData] = useState<WorkoutShareData | null>(null);

  useEffect(() => {
    if (!id) return;
    getWorkout(Number(id))
      .then(setWorkout)
      .catch(() => navigate("/workouts", { replace: true }))
      .finally(() => setLoading(false));
  }, [id]);

  const handleDelete = async () => {
    if (!workout) return;
    const ok = await useConfirmStore.getState().show("删除训练", "确定删除这次训练记录？");
    if (!ok) return;
    await deleteWorkout(workout.id);
    navigate("/workouts", { replace: true });
  };

  const handleCopy = async () => {
    if (!workout || !copyDate) return;
    const newWorkout = await copyWorkout(workout.id, copyDate);
    navigate(`/workouts/${newWorkout.id}`, { replace: true });
    setShowCopyModal(false);
  };

  const handleShare = async () => {
    if (!workout) return;
    try {
      const data = await shareWorkout(workout.id);
      setShareData(data);
      setShowShareModal(true);
    } catch {
      useToastStore.getState().add("生成分享数据失败", "error");
    }
  };

  const doShare = async (data: WorkoutShareData) => {
    const text = [
      `🏋️ IronLog 训练记录`,
      `📅 ${data.date}`,
      `💪 ${data.exercise_count}个动作 · ${data.total_sets}组 · ${Math.round(data.total_volume)}kg`,
      data.duration_minutes ? `⏱ ${data.duration_minutes}分钟` : "",
      "",
      ...data.exercises.map((e) => `• ${e.name}: ${e.sets}组 ${Math.round(e.volume)}kg`),
    ]
      .filter(Boolean)
      .join("\n");

    if (navigator.share) {
      try {
        await navigator.share({ title: "IronLog 训练记录", text });
      } catch {
        /* user cancelled */
      }
    } else {
      await navigator.clipboard.writeText(text);
      useToastStore.getState().add("已复制到剪贴板", "success");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 p-4 pt-16 space-y-3">
        {[1,2,3].map(i => (
          <div key={i} className="bg-white rounded-2xl p-4 space-y-2 animate-pulse border border-slate-100">
            <div className="h-4 bg-slate-200 rounded-xl w-1/2" />
            <div className="h-3 bg-slate-200 rounded-xl w-3/4" />
          </div>
        ))}
      </div>
    );
  }

  if (!workout) return null;

  const totalVolume = workout.exercises.reduce(
    (sum, ex) =>
      sum + ex.sets.reduce((s, set) => s + (set.weight || 0) * (set.reps || 0), 0),
    0
  );
  const totalSets = workout.exercises.reduce((sum, ex) => sum + ex.sets.length, 0);

  const duration =
    workout.start_time && workout.end_time
      ? Math.round(
          (new Date(workout.end_time).getTime() - new Date(workout.start_time).getTime()) / 60000
        )
      : null;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-sm border-b border-slate-100 px-4 h-14 flex items-center justify-between">
        <button
          onClick={() => navigate(-1)}
          className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-slate-100 transition-colors"
        >
          <ArrowLeft size={20} className="text-slate-700" />
        </button>
        <h1 className="font-bold text-base text-slate-900 absolute left-1/2 -translate-x-1/2">训练详情</h1>
        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-slate-100 transition-colors"
          >
            <MoreHorizontal size={20} className="text-slate-700" />
          </button>
          {showMenu && (
            <div className="absolute right-0 top-11 bg-white border border-slate-100 rounded-2xl shadow-xl py-1.5 w-36 z-20 animate-scale-in">
              <button
                onClick={() => { setShowMenu(false); navigate(`/workouts/${workout.id}/edit`); }}
                className="w-full text-left px-4 py-2.5 text-sm hover:bg-slate-50 flex items-center gap-2.5 font-medium text-slate-700"
              >
                <Pencil size={15} className="text-slate-500" /> 编辑
              </button>
              <button
                onClick={() => { setShowMenu(false); setShowCopyModal(true); setCopyDate(format(new Date(), "yyyy-MM-dd")); }}
                className="w-full text-left px-4 py-2.5 text-sm hover:bg-slate-50 flex items-center gap-2.5 font-medium text-slate-700"
              >
                <Copy size={15} className="text-slate-500" /> 复制训练
              </button>
              <button
                onClick={() => { setShowMenu(false); handleShare(); }}
                className="w-full text-left px-4 py-2.5 text-sm hover:bg-slate-50 flex items-center gap-2.5 font-medium text-slate-700"
              >
                <Share2 size={15} className="text-slate-500" /> 分享
              </button>
              <div className="my-1 mx-3 border-t border-slate-100" />
              <button
                onClick={() => { setShowMenu(false); handleDelete(); }}
                className="w-full text-left px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 flex items-center gap-2.5 font-medium"
              >
                <Trash2 size={15} /> 删除
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Hero info card */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
          <h2 className="text-lg font-bold text-slate-900">
            {format(new Date(workout.date), "M月d日 EEEE", { locale: zhCN })}
            {workout.mood ? ` ${MOOD_LABELS[workout.mood]}` : ""}
          </h2>
          <div className="flex gap-4 mt-3">
            <div className="text-center">
              <p className="text-xl font-bold text-slate-900">{workout.exercises.length}</p>
              <p className="text-xs text-slate-400 mt-0.5">动作</p>
            </div>
            <div className="w-px bg-slate-100" />
            <div className="text-center">
              <p className="text-xl font-bold text-slate-900">{totalSets}</p>
              <p className="text-xs text-slate-400 mt-0.5">总组数</p>
            </div>
            <div className="w-px bg-slate-100" />
            <div className="text-center">
              <p className="text-xl font-bold text-slate-900">
                {totalVolume >= 1000 ? `${(totalVolume/1000).toFixed(1)}t` : `${Math.round(totalVolume)}`}
              </p>
              <p className="text-xs text-slate-400 mt-0.5">容量(kg)</p>
            </div>
            {duration != null && duration > 0 && (
              <>
                <div className="w-px bg-slate-100" />
                <div className="text-center">
                  <p className="text-xl font-bold text-slate-900">{duration}</p>
                  <p className="text-xs text-slate-400 mt-0.5">分钟</p>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Exercises */}
        {workout.exercises.map((ex) => {
          const exVolume = ex.sets.reduce(
            (s, set) => s + (set.weight || 0) * (set.reps || 0),
            0
          );
          return (
            <div key={ex.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-50 flex items-center justify-between">
                <div>
                  <p className="font-bold text-sm text-slate-900">
                    {ex.exercise_name || `动作#${ex.exercise_id}`}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[11px] text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full font-medium">
                      {CATEGORY_LABELS[ex.exercise_category || ""] || ex.exercise_category}
                    </span>
                    <span className="text-xs text-slate-400">{Math.round(exVolume)} kg</span>
                  </div>
                </div>
                <span className="text-sm font-bold text-slate-500">{ex.sets.length} 组</span>
              </div>

              <div className="grid grid-cols-[36px_1fr_1fr_52px] gap-2 text-[11px] font-semibold text-slate-400 uppercase tracking-wide px-4 py-2 bg-slate-50/60">
                <span>组</span>
                <span>重量</span>
                <span>次数</span>
                <span>休息</span>
              </div>

              <div className="divide-y divide-slate-50">
                {ex.sets.map((s) => (
                  <div
                    key={s.id}
                    className="grid grid-cols-[36px_1fr_1fr_52px] gap-2 items-center px-4 py-2.5"
                  >
                    <span className={`text-center text-sm font-bold ${
                      s.is_warmup ? "text-amber-500" : "text-slate-500"
                    }`}>
                      {s.is_warmup ? "W" : s.set_number}
                    </span>
                    <span className="text-sm font-semibold text-slate-800">
                      {s.weight ?? "—"} {s.unit}
                    </span>
                    <span className="text-sm font-semibold text-slate-800">
                      {s.reps ?? "—"} 次
                      {s.rpe ? (
                        <span className="text-slate-400 text-xs ml-1">@{s.rpe}</span>
                      ) : null}
                    </span>
                    <span className="text-xs text-slate-400">
                      {s.rest_seconds != null ? `${s.rest_seconds}s` : "—"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}

        {/* Note */}
        {workout.note && (
          <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 text-sm text-slate-700">
            📝 {workout.note}
          </div>
        )}
      </div>

      {/* Copy Modal — bottom sheet */}
      {showCopyModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center animate-fade-in">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowCopyModal(false)} />
          <div className="relative w-full max-w-[480px] bg-white rounded-t-3xl p-6 space-y-4 animate-slide-up md:max-w-[768px]">
            <div className="w-10 h-1 bg-slate-200 rounded-full mx-auto" />
            <h3 className="font-bold text-lg text-slate-900">复制训练到</h3>
            <input
              type="date"
              value={copyDate}
              onChange={(e) => setCopyDate(e.target.value)}
              className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:border-emerald-400"
            />
            <div className="flex gap-3">
              <button
                onClick={() => setShowCopyModal(false)}
                className="flex-1 py-3.5 bg-slate-100 rounded-2xl font-medium text-sm text-slate-700"
              >
                取消
              </button>
              <button
                onClick={handleCopy}
                className="flex-1 py-3.5 bg-emerald-500 text-white rounded-2xl font-semibold text-sm"
              >
                确定
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Share Modal */}
      {showShareModal && shareData && (
        <div className="fixed inset-0 z-50 flex items-end justify-center animate-fade-in">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowShareModal(false)} />
          <div className="relative w-full max-w-[480px] bg-white rounded-t-3xl overflow-hidden animate-slide-up md:max-w-[768px]">
            <div className="bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-700 p-6 text-white">
              <div className="flex items-center gap-2 mb-4">
                <Dumbbell size={18} className="text-white" />
                <span className="font-bold text-base">IronLog</span>
              </div>
              <p className="text-emerald-100 text-sm">
                {format(new Date(shareData.date), "yyyy年M月d日 EEEE", { locale: zhCN })}
              </p>
              <div className="grid grid-cols-3 gap-2 mt-4">
                {[
                  { v: shareData.exercise_count, l: "动作" },
                  { v: shareData.total_sets, l: "总组数" },
                  { v: shareData.total_volume >= 1000 ? `${(shareData.total_volume/1000).toFixed(1)}t` : `${Math.round(shareData.total_volume)}`, l: "容量(kg)" },
                ].map(({ v, l }) => (
                  <div key={l} className="bg-white/15 rounded-xl p-3 text-center">
                    <p className="text-xl font-bold">{v}</p>
                    <p className="text-xs text-emerald-100 mt-0.5">{l}</p>
                  </div>
                ))}
              </div>
              {shareData.duration_minutes != null && shareData.duration_minutes > 0 && (
                <p className="text-sm text-emerald-100 mt-3 flex items-center gap-1">
                  <Clock size={13} /> 训练时长 {shareData.duration_minutes} 分钟
                </p>
              )}
              <div className="mt-3 space-y-1">
                {shareData.exercises.map((ex, i) => (
                  <div key={i} className="flex justify-between text-sm">
                    <span>{ex.name}</span>
                    <span className="text-emerald-200">{ex.sets}组 · {Math.round(ex.volume)}kg</span>
                  </div>
                ))}
              </div>
              {shareData.mood != null && shareData.mood in MOOD_EMOJI && (
                <p className="mt-3 text-lg">{MOOD_EMOJI[shareData.mood]}</p>
              )}
            </div>
            <div className="p-4 flex gap-3">
              <button
                onClick={() => setShowShareModal(false)}
                className="flex-1 py-3 bg-slate-100 rounded-2xl font-medium text-sm text-slate-700 flex items-center justify-center gap-1.5"
              >
                <X size={15} /> 关闭
              </button>
              <button
                onClick={() => doShare(shareData)}
                className="flex-1 py-3 bg-emerald-500 text-white rounded-2xl font-semibold text-sm flex items-center justify-center gap-1.5"
              >
                <Share2 size={15} /> 分享
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

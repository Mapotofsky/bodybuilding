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
      <div className="flex items-center justify-center h-screen text-gray-400">
        加载中...
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
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between">
        <button onClick={() => navigate(-1)} className="p-1">
          <ArrowLeft size={22} />
        </button>
        <h1 className="font-semibold">训练详情</h1>
        <div className="relative">
          <button onClick={() => setShowMenu(!showMenu)} className="p-1">
            <MoreHorizontal size={22} />
          </button>
          {showMenu && (
            <div className="absolute right-0 top-10 bg-white border border-gray-200 rounded-xl shadow-lg py-1 w-32 z-20">
              <button
                onClick={() => {
                  setShowMenu(false);
                  navigate(`/workouts/${workout.id}/edit`);
                }}
                className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 flex items-center gap-2"
              >
                <Pencil size={15} /> 编辑
              </button>
              <button
                onClick={() => {
                  setShowMenu(false);
                  setShowCopyModal(true);
                  setCopyDate(format(new Date(), "yyyy-MM-dd"));
                }}
                className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 flex items-center gap-2"
              >
                <Copy size={15} /> 复制训练
              </button>
              <button
                onClick={() => {
                  setShowMenu(false);
                  handleShare();
                }}
                className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 flex items-center gap-2"
              >
                <Share2 size={15} /> 分享
              </button>
              <button
                onClick={() => {
                  setShowMenu(false);
                  handleDelete();
                }}
                className="w-full text-left px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 flex items-center gap-2"
              >
                <Trash2 size={15} /> 删除
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Date & Summary */}
      <div className="p-4 space-y-5">
        <div>
          <h2 className="text-xl font-bold">
            {format(new Date(workout.date), "M月d日 EEEE", { locale: zhCN })}
            {workout.mood ? ` ${MOOD_LABELS[workout.mood]}` : ""}
          </h2>
          <div className="flex gap-4 mt-2 text-sm text-gray-500">
            <span className="flex items-center gap-1">
              <Dumbbell size={14} /> {workout.exercises.length} 个动作
            </span>
            <span>{totalSets} 组</span>
            <span>{Math.round(totalVolume)} kg</span>
            {duration != null && duration > 0 && (
              <span className="flex items-center gap-1">
                <Clock size={14} /> {duration} 分钟
              </span>
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
            <div key={ex.id} className="bg-gray-50 rounded-2xl p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="font-semibold">
                    {ex.exercise_name || `动作#${ex.exercise_id}`}
                  </p>
                  <p className="text-xs text-gray-400">
                    {CATEGORY_LABELS[ex.exercise_category || ""] || ex.exercise_category}{" "}
                    · {Math.round(exVolume)} kg
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-[40px_1fr_1fr_auto] gap-2 text-xs text-gray-400 px-1 mb-1">
                <span>组</span>
                <span>重量</span>
                <span>次数</span>
                <span>休息</span>
              </div>

              {ex.sets.map((s) => (
                <div
                  key={s.id}
                  className="grid grid-cols-[40px_1fr_1fr_auto] gap-2 items-center py-1.5 border-b border-gray-100 last:border-0"
                >
                  <span
                    className={`text-center text-sm ${
                      s.is_warmup ? "text-orange-400 font-medium" : "text-gray-500"
                    }`}
                  >
                    {s.is_warmup ? "W" : s.set_number}
                  </span>
                  <span className="text-sm">
                    {s.weight ?? "-"} {s.unit}
                  </span>
                  <span className="text-sm">
                    {s.reps ?? "-"} 次
                    {s.rpe ? (
                      <span className="text-gray-400 text-xs ml-1">@{s.rpe}</span>
                    ) : null}
                  </span>
                  <span className="text-xs text-gray-400">
                    {s.rest_seconds != null ? `${s.rest_seconds}s` : "-"}
                  </span>
                </div>
              ))}
            </div>
          );
        })}

        {/* Note */}
        {workout.note && (
          <div className="bg-yellow-50 rounded-xl p-4 text-sm text-gray-700">
            {workout.note}
          </div>
        )}
      </div>

      {/* Copy Modal */}
      {showCopyModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center px-6">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm space-y-4">
            <h3 className="font-semibold text-lg">复制训练到</h3>
            <input
              type="date"
              value={copyDate}
              onChange={(e) => setCopyDate(e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl"
            />
            <div className="flex gap-3">
              <button
                onClick={() => setShowCopyModal(false)}
                className="flex-1 py-2.5 bg-gray-100 rounded-xl font-medium"
              >
                取消
              </button>
              <button
                onClick={handleCopy}
                className="flex-1 py-2.5 bg-blue-500 text-white rounded-xl font-medium"
              >
                确定
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Share Modal */}
      {showShareModal && shareData && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center px-4">
          <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden">
            <div className="bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-700 p-6 text-white">
              <div className="flex items-center gap-2 mb-4">
                <Dumbbell size={20} />
                <span className="font-bold text-lg">IronLog</span>
              </div>
              <p className="text-blue-100 text-sm">
                {format(new Date(shareData.date), "yyyy年M月d日 EEEE", { locale: zhCN })}
              </p>
              <div className="grid grid-cols-3 gap-3 mt-4">
                <div className="bg-white/15 backdrop-blur rounded-xl p-3 text-center">
                  <p className="text-2xl font-bold">{shareData.exercise_count}</p>
                  <p className="text-xs text-blue-100">动作</p>
                </div>
                <div className="bg-white/15 backdrop-blur rounded-xl p-3 text-center">
                  <p className="text-2xl font-bold">{shareData.total_sets}</p>
                  <p className="text-xs text-blue-100">总组数</p>
                </div>
                <div className="bg-white/15 backdrop-blur rounded-xl p-3 text-center">
                  <p className="text-2xl font-bold">
                    {shareData.total_volume >= 1000
                      ? `${(shareData.total_volume / 1000).toFixed(1)}t`
                      : `${Math.round(shareData.total_volume)}`}
                  </p>
                  <p className="text-xs text-blue-100">容量(kg)</p>
                </div>
              </div>
              {shareData.duration_minutes != null && shareData.duration_minutes > 0 && (
                <p className="text-sm text-blue-100 mt-3 flex items-center gap-1">
                  <Clock size={14} /> 训练时长 {shareData.duration_minutes} 分钟
                </p>
              )}
              <div className="mt-4 space-y-1">
                {shareData.exercises.map((ex, i) => (
                  <div key={i} className="flex justify-between text-sm">
                    <span>{ex.name}</span>
                    <span className="text-blue-200">{ex.sets}组 · {Math.round(ex.volume)}kg</span>
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
                className="flex-1 py-2.5 bg-gray-100 rounded-xl font-medium text-sm flex items-center justify-center gap-1"
              >
                <X size={16} /> 关闭
              </button>
              <button
                onClick={() => doShare(shareData)}
                className="flex-1 py-2.5 bg-blue-500 text-white rounded-xl font-medium text-sm flex items-center justify-center gap-1"
              >
                <Share2 size={16} /> 分享
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

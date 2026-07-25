import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getWorkout, deleteWorkout, copyWorkout } from "@/services/workout";
import { getSettings } from "@/services/settings";
import { dataUrlToFile, prepareWorkoutShareImage, saveWorkoutShareImage, type WorkoutShareImage } from "@/services/shareImage";
import type { Workout } from "@/types";
import { CATEGORY_LABELS, MOOD_LABELS } from "@/types";
import {
  ArrowLeft,
  Copy,
  Trash2,
  MoreHorizontal,
  Pencil,
  Share2,
  X,
} from "lucide-react";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";
import { useToastStore } from "@/components/Toast";
import { useConfirmStore } from "@/components/ConfirmDialog";
import { calculateWorkoutMetrics, convertWeight, formatOneDecimal, formatVolume } from "@/core/workoutMetrics";
import { useAndroidBackDismiss } from "@/navigation/androidBackLayers";
import { formatExerciseCompletion } from "@/utils/workoutPresentation";
import { formatRecordingDescription, formatSet, formatSetMetrics } from "@/utils/recordingPresentation";

export default function WorkoutDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [workout, setWorkout] = useState<Workout | null>(null);
  const [loading, setLoading] = useState(true);
  const [showMenu, setShowMenu] = useState(false);
  const [copyDate, setCopyDate] = useState("");
  const [showCopyModal, setShowCopyModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareImage, setShareImage] = useState<WorkoutShareImage | null>(null);
  const [shareDetails, setShareDetails] = useState(false);
  const [displayUnit, setDisplayUnit] = useState<"kg" | "lb">("kg");
  useAndroidBackDismiss(showMenu, () => setShowMenu(false));
  useAndroidBackDismiss(showCopyModal, () => setShowCopyModal(false));
  useAndroidBackDismiss(showShareModal, () => setShowShareModal(false));

  useEffect(() => {
    if (!id) return;
    getWorkout(id)
      .then(setWorkout)
      .catch(() => navigate("/workouts", { replace: true }))
      .finally(() => setLoading(false));
    getSettings().then((settings) => setDisplayUnit(settings.weight_unit)).catch(() => undefined);
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
      const image = await prepareWorkoutShareImage(workout.id, { show_details: shareDetails });
      setShareImage(image);
      setShowShareModal(true);
    } catch {
      useToastStore.getState().add("生成分享图失败", "error");
    }
  };

  const saveShareImage = async (image: WorkoutShareImage) => {
    try {
      const destination = await saveWorkoutShareImage(image);
      useToastStore.getState().add(destination === "gallery" ? "图片已保存到相册的 IronLog 文件夹" : "图片已下载", "success");
    } catch (error) {
      useToastStore.getState().add(error instanceof Error ? error.message : "保存图片失败，请重试", "error");
    }
  };

  const doShareImage = async (image: WorkoutShareImage) => {
    const file = await dataUrlToFile(image.data_url, image.file_name);
    const nav = navigator as Navigator & { canShare?: (data: ShareData) => boolean };
    if (navigator.share && (!nav.canShare || nav.canShare({ files: [file] }))) {
      try {
        await navigator.share({ title: "IronLog 训练记录", files: [file] });
      } catch {
        /* user cancelled */
      }
    } else {
      useToastStore.getState().add("当前环境不支持系统图片分享，请先保存图片", "error");
    }
  };

  if (loading) {
    return (
      <div className="app-page bg-slate-50 px-5 pt-16 pb-4 space-y-3">
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

  const metrics = calculateWorkoutMetrics(workout.exercises.map((exercise) => ({
    recordingMode: exercise.recording_mode,
    loadBasis: exercise.load_basis,
    countBasis: exercise.count_basis,
    loadDirection: exercise.load_direction,
    rateMetric: exercise.rate_metric,
    contextKind: exercise.context_kind ?? "none",
    sets: exercise.sets.map((set) => ({
      weight: set.weight,
      reps: set.reps,
      unit: set.unit,
      durationSec: set.duration_sec,
      distanceM: set.distance_m,
    })),
  })), displayUnit);
  const totalVolume = metrics.totalVolume;
  const totalSets = workout.exercises.reduce((sum, ex) => sum + ex.sets.length, 0);

  const duration =
    workout.start_time && workout.end_time
      ? Math.round(
          (new Date(workout.end_time).getTime() - new Date(workout.start_time).getTime()) / 60000
        )
      : null;

  return (
    <div className="app-page bg-slate-50">
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
            aria-label="更多操作"
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

      <div className="px-5 pt-4 space-y-4">
        {/* Hero info card */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
          <h2 className="text-lg font-bold text-slate-900">
            {format(new Date(workout.date), "M月d日 EEEE", { locale: zhCN })}
            {workout.mood ? ` ${MOOD_LABELS[workout.mood]}` : ""}
          </h2>
          {workout.template_name && (
            <div className="mt-2">
              <span
                className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full"
                style={{
                  backgroundColor: workout.template_color || workout.plan_color
                    ? `${workout.template_color || workout.plan_color}22`
                    : "var(--color-primary-soft)",
                  color: workout.template_color || workout.plan_color || "var(--color-primary-hover)",
                }}
              >
                <span
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ backgroundColor: workout.template_color || workout.plan_color || "var(--color-primary)" }}
                />
                {workout.template_name}
              </span>
            </div>
          )}
          <div className="flex flex-wrap gap-4 mt-3">
            <div className="text-center">
              <p className="text-xl font-bold text-slate-900">{workout.exercises.length}</p>
              <p className="text-xs text-slate-400 mt-0.5">动作</p>
            </div>
            <div className="w-px bg-slate-100" />
            <div className="text-center">
              <p className="text-xl font-bold text-slate-900">{totalSets}</p>
              <p className="text-xs text-slate-400 mt-0.5">总组数</p>
            </div>
            {totalVolume > 0 && <><div className="w-px bg-slate-100" /><div className="text-center"><p className="text-xl font-bold text-slate-900">{formatVolume(totalVolume, metrics.totalVolumeUnit)}</p><p className="text-xs text-slate-400 mt-0.5">容量</p></div></>}
            {metrics.totalLoadDistanceKgM > 0 && <><div className="w-px bg-slate-100" /><div className="text-center"><p className="text-xl font-bold text-slate-900">{formatOneDecimal(convertWeight(metrics.totalLoadDistanceKgM, "kg", displayUnit))} {displayUnit}·m</p><p className="text-xs text-slate-400 mt-0.5">距离负载</p></div></>}
            {metrics.totalLoadDurationKgSec > 0 && <><div className="w-px bg-slate-100" /><div className="text-center"><p className="text-xl font-bold text-slate-900">{formatOneDecimal(convertWeight(metrics.totalLoadDurationKgSec, "kg", displayUnit))} {displayUnit}·s</p><p className="text-xs text-slate-400 mt-0.5">持续负载</p></div></>}
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
          const summary = formatExerciseCompletion(ex, ex.sets, displayUnit);
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
                    <span className="text-xs text-slate-400">{summary.value}</span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">{formatRecordingDescription(ex)}</p>
                </div>
                <span className="text-sm font-bold text-slate-500">{ex.sets.length} 组</span>
              </div>

              <div className="grid grid-cols-[36px_minmax(0,1fr)_52px] gap-2 text-[11px] font-semibold text-slate-400 uppercase tracking-wide px-4 py-2 bg-slate-50/60">
                <span>组</span>
                <span>记录</span>
                <span>休息</span>
              </div>

              <div className="divide-y divide-slate-50">
                {ex.sets.map((s) => (
                  <div
                    key={s.id}
                    className="grid grid-cols-[36px_minmax(0,1fr)_52px] gap-2 items-start px-4 py-2.5"
                  >
                    <span className={`text-center text-sm font-bold ${
                      s.is_warmup ? "text-amber-500" : "text-slate-500"
                    }`}>
                      {s.is_warmup ? "W" : s.set_number}
                    </span>
                    <span className="min-w-0 text-sm font-semibold text-slate-800">
                      <span className="break-words">{formatSet(ex, s)}</span>
                      {s.rpe ? (
                        <span className="text-slate-400 text-xs ml-1">@{s.rpe}</span>
                      ) : null}
                      {s.is_failure ? (
                        <span className="text-red-500 text-xs ml-1">力竭</span>
                      ) : null}
                      {formatSetMetrics(ex, s, displayUnit).map((metric) => (
                        <span key={metric.label} className="block text-[11px] font-normal text-slate-400 mt-0.5">
                          {metric.label} {metric.value}
                        </span>
                      ))}
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
        <div className="fixed inset-0 z-[120] flex items-end justify-center animate-fade-in">
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
      {showShareModal && shareImage && (
        <div className="fixed inset-0 z-[120] flex items-end justify-center animate-fade-in">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowShareModal(false)} />
          <div className="relative w-full max-w-[480px] bg-white rounded-t-3xl overflow-hidden animate-slide-up md:max-w-[768px]">
            <div className="p-4 bg-slate-50 max-h-[70dvh] overflow-y-auto">
              <label className="flex items-center justify-between gap-3 mb-3 bg-white rounded-2xl border border-slate-100 px-4 py-3">
                <span className="text-sm font-semibold text-slate-700">显示组明细</span>
                <input
                  type="checkbox"
                  checked={shareDetails}
                  onChange={async (event) => {
                    const next = event.target.checked;
                    setShareDetails(next);
                    if (workout) setShareImage(await prepareWorkoutShareImage(workout.id, { show_details: next }));
                  }}
                />
              </label>
              <img src={shareImage.data_url} alt="训练分享图预览" className="w-full rounded-2xl border border-slate-100 shadow-sm" />
            </div>
            <div className="p-4 flex gap-3">
              <button
                onClick={() => setShowShareModal(false)}
                className="flex-1 py-3 bg-slate-100 rounded-2xl font-medium text-sm text-slate-700 flex items-center justify-center gap-1.5"
              >
                <X size={15} /> 关闭
              </button>
              <button
                onClick={() => saveShareImage(shareImage)}
                className="flex-1 py-3 bg-slate-100 rounded-2xl font-medium text-sm text-slate-700 flex items-center justify-center gap-1.5"
              >
                保存图片
              </button>
              <button
                onClick={() => doShareImage(shareImage)}
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

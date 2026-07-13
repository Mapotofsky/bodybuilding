import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getWorkouts } from "@/services/workout";
import type { WorkoutSummary } from "@/types";
import { MOOD_LABELS } from "@/types";
import { Plus, ChevronLeft, ChevronRight, Dumbbell } from "lucide-react";
import { format, addMonths, subMonths } from "date-fns";
import { zhCN } from "date-fns/locale";
import { SkeletonList } from "@/components/ui/Skeleton";
import { formatVolume } from "@/core/workoutMetrics";
import { formatDistance, formatDuration } from "@/utils/workoutPresentation";

export default function WorkoutsPage() {
  const navigate = useNavigate();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [workouts, setWorkouts] = useState<WorkoutSummary[]>([]);
  const [loading, setLoading] = useState(true);

  const monthStr = format(currentMonth, "yyyy-MM");

  useEffect(() => {
    setLoading(true);
    getWorkouts({ month: monthStr })
      .then(setWorkouts)
      .finally(() => setLoading(false));
  }, [monthStr]);

  const totalSets = workouts.reduce((s, w) => s + w.total_sets, 0);
  const monthlyMetric = monthlySummaryMetric(workouts);

  return (
    <div className="app-page app-page-with-fab px-5 pt-4 pb-6">
      {/* Month Selector */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => setCurrentMonth((m) => subMonths(m, 1))}
          className="w-9 h-9 rounded-full hover:bg-slate-100 flex items-center justify-center transition-colors"
        >
          <ChevronLeft size={20} className="text-slate-600" />
        </button>
        <h1 className="text-lg font-bold text-slate-900">
          {format(currentMonth, "yyyy年M月")}
        </h1>
        <button
          onClick={() => setCurrentMonth((m) => addMonths(m, 1))}
          className="w-9 h-9 rounded-full hover:bg-slate-100 flex items-center justify-center transition-colors"
        >
          <ChevronRight size={20} className="text-slate-600" />
        </button>
      </div>

      {/* Monthly Stats */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="bg-amber-50 border border-amber-100 rounded-2xl p-3 text-center">
          <p className="text-xl font-bold text-amber-700">{workouts.length}</p>
          <p className="text-xs text-amber-600/80 mt-0.5">训练次数</p>
        </div>
        <div className="bg-sky-50 border border-sky-100 rounded-2xl p-3 text-center">
          <p className="text-xl font-bold text-sky-700">{totalSets}</p>
          <p className="text-xs text-sky-600/80 mt-0.5">总组数</p>
        </div>
        <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-3 text-center">
          <p className="text-xl font-bold text-emerald-700">
            {monthlyMetric.value}
          </p>
          <p className="text-xs text-emerald-600/80 mt-0.5">{monthlyMetric.label}</p>
        </div>
      </div>

      {/* Workout List */}
      {loading ? (
        <SkeletonList count={4} />
      ) : workouts.length === 0 ? (
        <div className="text-center py-14 bg-white rounded-2xl border border-slate-100">
          <div className="w-14 h-14 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <Dumbbell size={24} className="text-slate-400" />
          </div>
          <p className="text-slate-500 font-medium">本月暂无训练记录</p>
          <p className="text-slate-400 text-sm mt-1">点击右下角按钮开始训练</p>
        </div>
      ) : (
        <div className="space-y-2">
          {workouts.map((w) => (
            <button
              key={w.id}
              onClick={() => navigate(`/workouts/${w.id}`)}
              className="w-full text-left bg-white rounded-2xl p-4 border border-slate-100 hover:bg-slate-50 active:scale-[0.99] transition-all shadow-sm"
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-2 h-10 rounded-full flex-shrink-0"
                  style={{
                    backgroundColor: w.template_color || w.plan_color || "var(--color-border)",
                  }}
                />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-slate-900">
                    {format(new Date(w.date), "M月d日 EEEE", { locale: zhCN })}{" "}
                    {w.mood ? MOOD_LABELS[w.mood] : ""}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {w.exercise_count} 个动作 · {w.total_sets} 组 ·{" "}
                    {summaryMetric(w)}
                  </p>
                  {w.note && (
                    <p className="text-xs text-slate-400 mt-1 line-clamp-1">{w.note}</p>
                  )}
                </div>
                <ChevronRight size={16} className="text-slate-300 shrink-0" />
              </div>
            </button>
          ))}
        </div>
      )}

      {/* FAB */}
      <button
        onClick={() => navigate("/workouts/new")}
        className="app-fixed-above-tab fixed right-4 w-14 h-14 bg-emerald-500 text-white rounded-full shadow-lg shadow-emerald-500/30 flex items-center justify-center hover:bg-emerald-600 active:scale-95 transition-all md:right-[calc(50%-384px+16px)]"
      >
        <Plus size={24} />
      </button>
    </div>
  );
}

function summaryMetric(workout: WorkoutSummary): string {
  if (workout.total_volume > 0) return formatVolume(workout.total_volume, workout.total_volume_unit);
  if (workout.total_distance_m > 0) return `${Math.round(workout.total_distance_m)} m`;
  if (workout.total_duration_sec > 0) return `${workout.total_duration_sec} s`;
  return `${workout.total_reps} 次`;
}

export function monthlySummaryMetric(workouts: WorkoutSummary[]): { label: string; value: string } {
  const volume = workouts.reduce((sum, workout) => sum + workout.total_volume, 0);
  const unit = workouts[0]?.total_volume_unit || "kg";
  if (volume > 0 || workouts.length === 0) return { label: "总容量", value: formatVolume(volume, unit) };
  const distance = workouts.reduce((sum, workout) => sum + workout.total_distance_m, 0);
  if (distance > 0) return { label: "总距离", value: formatDistance(distance) };
  const duration = workouts.reduce((sum, workout) => sum + workout.total_duration_sec, 0);
  if (duration > 0) return { label: "动作时长", value: formatDuration(duration) };
  const reps = workouts.reduce((sum, workout) => sum + workout.total_reps, 0);
  return { label: "完成次数", value: `${reps} 次` };
}

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getWorkouts } from "@/services/workout";
import type { WorkoutSummary } from "@/types";
import { MOOD_LABELS } from "@/types";
import { Plus, ChevronLeft, ChevronRight, Dumbbell } from "lucide-react";
import { format, addMonths, subMonths } from "date-fns";
import { zhCN } from "date-fns/locale";
import { SkeletonList } from "@/components/ui/Skeleton";

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

  const totalVolume = workouts.reduce((s, w) => s + w.total_volume, 0);
  const totalSets = workouts.reduce((s, w) => s + w.total_sets, 0);

  return (
    <div className="px-4 pt-4 pb-6">
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
            {totalVolume >= 1000
              ? `${(totalVolume / 1000).toFixed(1)}t`
              : `${Math.round(totalVolume)}`}
          </p>
          <p className="text-xs text-emerald-600/80 mt-0.5">总容量(kg)</p>
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
                    backgroundColor: w.template_color || w.plan_color || "#e2e8f0",
                  }}
                />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-slate-900">
                    {format(new Date(w.date), "M月d日 EEEE", { locale: zhCN })}{" "}
                    {w.mood ? MOOD_LABELS[w.mood] : ""}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {w.exercise_count} 个动作 · {w.total_sets} 组 ·{" "}
                    {Math.round(w.total_volume)} kg
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
        className="fixed bottom-24 right-4 w-14 h-14 bg-emerald-500 text-white rounded-full shadow-lg shadow-emerald-500/30 flex items-center justify-center hover:bg-emerald-600 active:scale-95 transition-all md:right-[calc(50%-384px+16px)]"
      >
        <Plus size={24} />
      </button>
    </div>
  );
}

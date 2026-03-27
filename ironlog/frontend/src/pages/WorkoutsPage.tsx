import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getWorkouts } from "@/services/workout";
import type { WorkoutSummary } from "@/types";
import { MOOD_LABELS } from "@/types";
import { Plus, ChevronLeft, ChevronRight } from "lucide-react";
import { format, addMonths, subMonths } from "date-fns";
import { zhCN } from "date-fns/locale";

export default function WorkoutsPage() {
  const navigate = useNavigate();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [workouts, setWorkouts] = useState<WorkoutSummary[]>([]);
  const [loading, setLoading] = useState(true);

  const monthStr = format(currentMonth, "yyyy-MM");

  useEffect(() => {
    setLoading(true);
    getWorkouts(monthStr)
      .then(setWorkouts)
      .finally(() => setLoading(false));
  }, [monthStr]);

  const totalVolume = workouts.reduce((s, w) => s + w.total_volume, 0);
  const totalSets = workouts.reduce((s, w) => s + w.total_sets, 0);

  return (
    <div className="p-4">
      {/* Month Selector */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => setCurrentMonth((m) => subMonths(m, 1))}
          className="p-2 rounded-lg hover:bg-gray-100"
        >
          <ChevronLeft size={20} />
        </button>
        <h1 className="text-lg font-semibold">
          {format(currentMonth, "yyyy年M月")}
        </h1>
        <button
          onClick={() => setCurrentMonth((m) => addMonths(m, 1))}
          className="p-2 rounded-lg hover:bg-gray-100"
        >
          <ChevronRight size={20} />
        </button>
      </div>

      {/* Monthly Stats */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="bg-gray-50 rounded-xl p-3 text-center">
          <p className="text-xl font-bold">{workouts.length}</p>
          <p className="text-xs text-gray-500">训练次数</p>
        </div>
        <div className="bg-gray-50 rounded-xl p-3 text-center">
          <p className="text-xl font-bold">{totalSets}</p>
          <p className="text-xs text-gray-500">总组数</p>
        </div>
        <div className="bg-gray-50 rounded-xl p-3 text-center">
          <p className="text-xl font-bold">
            {totalVolume >= 1000
              ? `${(totalVolume / 1000).toFixed(1)}t`
              : `${Math.round(totalVolume)}`}
          </p>
          <p className="text-xs text-gray-500">总容量(kg)</p>
        </div>
      </div>

      {/* Workout List */}
      {loading ? (
        <div className="text-center py-12 text-gray-400">加载中...</div>
      ) : workouts.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <p>本月暂无训练记录</p>
        </div>
      ) : (
        <div className="space-y-2">
          {workouts.map((w) => (
            <button
              key={w.id}
              onClick={() => navigate(`/workouts/${w.id}`)}
              className="w-full text-left bg-gray-50 rounded-xl p-4 hover:bg-gray-100 transition"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">
                    {format(new Date(w.date), "M月d日 EEEE", { locale: zhCN })}{" "}
                    {w.mood ? MOOD_LABELS[w.mood] : ""}
                  </p>
                  <p className="text-sm text-gray-500 mt-0.5">
                    {w.exercise_count} 个动作 · {w.total_sets} 组 ·{" "}
                    {Math.round(w.total_volume)} kg
                  </p>
                  {w.note && (
                    <p className="text-xs text-gray-400 mt-1 line-clamp-1">
                      {w.note}
                    </p>
                  )}
                </div>
                <ChevronRight size={18} className="text-gray-300 shrink-0" />
              </div>
            </button>
          ))}
        </div>
      )}

      {/* FAB */}
      <button
        onClick={() => navigate("/workouts/new")}
        className="fixed bottom-24 right-4 w-14 h-14 bg-blue-500 text-white rounded-full shadow-lg flex items-center justify-center hover:bg-blue-600 transition md:right-[calc(50%-384px+16px)]"
      >
        <Plus size={26} />
      </button>
    </div>
  );
}

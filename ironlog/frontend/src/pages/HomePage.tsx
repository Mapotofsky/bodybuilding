import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "@/store/auth";
import { getWorkouts } from "@/services/workout";
import type { WorkoutSummary } from "@/types";
import { CATEGORY_LABELS, MOOD_LABELS } from "@/types";
import { Plus, ChevronRight, Flame, Dumbbell, Calendar } from "lucide-react";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";

export default function HomePage() {
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();
  const [recentWorkouts, setRecentWorkouts] = useState<WorkoutSummary[]>([]);
  const [loading, setLoading] = useState(true);

  const today = format(new Date(), "yyyy-MM");

  useEffect(() => {
    getWorkouts(today)
      .then((data) => setRecentWorkouts(data.slice(0, 5)))
      .finally(() => setLoading(false));
  }, [today]);

  const thisMonthCount = recentWorkouts.length;
  const thisMonthVolume = recentWorkouts.reduce((sum, w) => sum + w.total_volume, 0);

  return (
    <div className="p-4 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">
            {user?.nickname || "训练者"}，你好
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            {format(new Date(), "M月d日 EEEE", { locale: zhCN })}
          </p>
        </div>
      </div>

      {/* Quick Start */}
      <button
        onClick={() => navigate("/workouts/new")}
        className="w-full py-4 bg-blue-500 text-white rounded-2xl flex items-center justify-center gap-2 font-medium text-lg hover:bg-blue-600 transition shadow-lg shadow-blue-500/20"
      >
        <Plus size={22} />
        开始训练
      </button>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Flame size={18} className="text-orange-500" />
            <span className="text-sm text-orange-700">本月训练</span>
          </div>
          <p className="text-2xl font-bold text-orange-900">{thisMonthCount} 次</p>
        </div>
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Dumbbell size={18} className="text-blue-500" />
            <span className="text-sm text-blue-700">本月容量</span>
          </div>
          <p className="text-2xl font-bold text-blue-900">
            {thisMonthVolume >= 1000
              ? `${(thisMonthVolume / 1000).toFixed(1)}t`
              : `${Math.round(thisMonthVolume)}kg`}
          </p>
        </div>
      </div>

      {/* Recent Workouts */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">最近训练</h2>
          <button
            onClick={() => navigate("/workouts")}
            className="text-sm text-blue-500 flex items-center gap-0.5"
          >
            全部 <ChevronRight size={16} />
          </button>
        </div>

        {loading ? (
          <div className="text-center py-8 text-gray-400">加载中...</div>
        ) : recentWorkouts.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <Calendar size={40} className="mx-auto mb-2 opacity-50" />
            <p>本月还没有训练记录</p>
            <p className="text-sm mt-1">点击上方按钮开始第一次训练</p>
          </div>
        ) : (
          <div className="space-y-2">
            {recentWorkouts.map((w) => (
              <button
                key={w.id}
                onClick={() => navigate(`/workouts/${w.id}`)}
                className="w-full text-left bg-gray-50 rounded-xl p-4 hover:bg-gray-100 transition"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">
                      {format(new Date(w.date), "M月d日")}{" "}
                      {w.mood ? MOOD_LABELS[w.mood] : ""}
                    </p>
                    <p className="text-sm text-gray-500 mt-0.5">
                      {w.exercise_count} 个动作 · {w.total_sets} 组 ·{" "}
                      {Math.round(w.total_volume)} kg
                    </p>
                  </div>
                  <ChevronRight size={18} className="text-gray-300" />
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "@/store/auth";
import { getWorkouts } from "@/services/workout";
import { getCalendar } from "@/services/plan";
import type { WorkoutSummary, CalendarEntry } from "@/types";
import { MOOD_LABELS } from "@/types";
import { Plus, ChevronRight, Flame, Dumbbell, Calendar, ClipboardList } from "lucide-react";
import { format, subDays } from "date-fns";
import { zhCN } from "date-fns/locale";

export default function HomePage() {
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();
  const [recentWorkouts, setRecentWorkouts] = useState<WorkoutSummary[]>([]);
  const [todayEntries, setTodayEntries] = useState<CalendarEntry[]>([]);
  const [missedEntries, setMissedEntries] = useState<CalendarEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const today = format(new Date(), "yyyy-MM");
  const todayStr = format(new Date(), "yyyy-MM-dd");
  const sevenDaysAgo = format(subDays(new Date(), 7), "yyyy-MM-dd");
  const yesterday = format(subDays(new Date(), 1), "yyyy-MM-dd");

  useEffect(() => {
    Promise.all([
      getWorkouts({ month: today }).then((data) => data.slice(0, 5)),
      // Today's scheduled plan entries
      getCalendar(todayStr, todayStr).then((days) => days[0]?.entries || []),
      // Past 7 days: only weekly-plan entries count as "missed".
      // An entry is missed only if no workout from scheduled_date→today
      // contains ANY exercise from the template.
      Promise.all([
        getCalendar(sevenDaysAgo, yesterday),
        getWorkouts({ from: sevenDaysAgo, to: todayStr }),
      ]).then(([pastDays, pastWorkouts]) => {
        return pastDays
          .flatMap((d) =>
            d.entries.filter((e) => {
              if (e.plan_mode !== "weekly") return false;
              if (e.is_completed) return false;
              const templateSet = new Set(e.template_exercise_ids);
              return !pastWorkouts.some(
                (w) =>
                  w.date >= e.scheduled_date &&
                  w.date <= todayStr &&
                  w.exercise_ids.some((eid) => templateSet.has(eid))
              );
            })
          )
          .slice(-3);
      }),
    ])
      .then(([workouts, entries, missed]) => {
        setRecentWorkouts(workouts);
        setTodayEntries(entries);
        setMissedEntries(missed);
      })
      .finally(() => setLoading(false));
  }, [today, todayStr, sevenDaysAgo, yesterday]);

  function handleStartFromPlan(entry: CalendarEntry) {
    navigate(`/workouts/new?template_id=${entry.template_id}`);
  }

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

      {/* Today's Plan + Missed */}
      {!loading && (todayEntries.length > 0 || missedEntries.length > 0) && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold">今日计划</h2>
            <button
              onClick={() => navigate("/calendar")}
              className="text-sm text-blue-500 flex items-center gap-0.5"
            >
              日历 <ChevronRight size={16} />
            </button>
          </div>
          <div className="space-y-2">
            {/* Missed entries from past days */}
            {missedEntries.map((entry, idx) => (
              <div
                key={`missed-${idx}`}
                className="bg-amber-50 rounded-2xl p-4 border border-amber-100 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-3 h-10 rounded-full flex-shrink-0"
                    style={{ backgroundColor: entry.template_color || entry.plan_color }}
                  />
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs bg-amber-200 text-amber-700 px-1.5 py-0.5 rounded font-medium">补</span>
                      <p className="font-medium text-sm text-gray-900">{entry.template_name}</p>
                    </div>
                    <p className="text-xs text-gray-400">
                      {entry.scheduled_date.slice(5).replace("-", "/")} · {entry.plan_name}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleStartFromPlan(entry)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 text-white rounded-full text-xs font-medium hover:bg-amber-600 transition"
                >
                  <Dumbbell size={12} /> 补训
                </button>
              </div>
            ))}
            {/* Today's entries */}
            {todayEntries.map((entry, idx) => (
              <div
                key={`today-${idx}`}
                className="bg-white rounded-2xl p-4 border border-gray-100 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-3 h-10 rounded-full flex-shrink-0"
                    style={{ backgroundColor: entry.template_color || entry.plan_color }}
                  />
                  <div>
                    <p className="font-medium text-sm text-gray-900">{entry.template_name}</p>
                    <p className="text-xs text-gray-400">{entry.plan_name}</p>
                  </div>
                </div>
                {entry.is_completed ? (
                  <span className="text-xs bg-green-50 text-green-600 px-2 py-1 rounded-full">已完成</span>
                ) : (
                  <button
                    onClick={() => handleStartFromPlan(entry)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500 text-white rounded-full text-xs font-medium hover:bg-blue-600 transition"
                  >
                    <Dumbbell size={12} /> 开始
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

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

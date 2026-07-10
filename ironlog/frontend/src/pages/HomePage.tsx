import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getProfile } from "@/services/profile";
import { getWorkouts } from "@/services/workout";
import { getCalendar } from "@/services/plan";
import type { WorkoutSummary, CalendarEntry, User } from "@/types";
import { MOOD_LABELS } from "@/types";
import { Plus, ChevronRight, Flame, Dumbbell, BarChart2 } from "lucide-react";
import { format, subDays } from "date-fns";
import { zhCN } from "date-fns/locale";
import { AreaChart, Area, ResponsiveContainer, Tooltip } from "recharts";
import { SkeletonList } from "@/components/ui/Skeleton";
import { formatVolume } from "@/core/workoutMetrics";

export default function HomePage() {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [recentWorkouts, setRecentWorkouts] = useState<WorkoutSummary[]>([]);
  const [monthWorkouts, setMonthWorkouts] = useState<WorkoutSummary[]>([]);
  const [todayEntries, setTodayEntries] = useState<CalendarEntry[]>([]);
  const [missedEntries, setMissedEntries] = useState<CalendarEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const today = format(new Date(), "yyyy-MM");
  const todayStr = format(new Date(), "yyyy-MM-dd");
  const sevenDaysAgo = format(subDays(new Date(), 7), "yyyy-MM-dd");
  const yesterday = format(subDays(new Date(), 1), "yyyy-MM-dd");

  useEffect(() => {
    Promise.all([
      getProfile(),
      getWorkouts().then((data) => data.slice(0, 10)),          // 最近10条，不限月份
      getWorkouts({ month: today }),                            // 本月全部，用于统计
      getCalendar(todayStr, todayStr).then((days) => days[0]?.entries || []),
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
      .then(([profile, recent, month, entries, missed]) => {
        setUser(profile);
        setRecentWorkouts(recent);
        setMonthWorkouts(month);
        setTodayEntries(entries);
        setMissedEntries(missed);
      })
      .finally(() => setLoading(false));
  }, [today, todayStr, sevenDaysAgo, yesterday]);

  function handleStartFromPlan(entry: CalendarEntry) {
    navigate(`/workouts/new?template_id=${entry.template_id}`);
  }

  const thisMonthCount = monthWorkouts.length;
  const thisMonthVolume = monthWorkouts.reduce((sum, w) => sum + w.total_volume, 0);
  const displayUnit = monthWorkouts[0]?.total_volume_unit || recentWorkouts[0]?.total_volume_unit || "kg";

  const volumeChartData = [...recentWorkouts]
    .reverse()
    .map((w) => ({ date: w.date.slice(5), vol: w.total_volume }));

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "早上好" : hour < 18 ? "下午好" : "晚上好";

  return (
    <div className="min-h-screen bg-slate-50 pb-6">
      {/* Hero banner */}
      <div className="bg-gradient-to-br from-emerald-500 to-teal-600 px-5 pt-12 pb-7 rounded-b-[28px]">
        <p className="text-emerald-100 text-sm mb-1">
          {format(new Date(), "M月d日 EEEE", { locale: zhCN })}
        </p>
        <h1 className="text-2xl font-bold text-white">
          {greeting}，{user?.nickname || "训练者"} 👋
        </h1>
      </div>

      <div className="px-5 space-y-5 mt-4">
        {/* Primary action */}
        <button
          onClick={() => navigate("/workouts/new")}
          className="w-full min-h-14 px-5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl flex items-center justify-center gap-2.5 font-semibold text-base shadow-md shadow-emerald-600/20 active:scale-[0.99] transition-all"
        >
          <span className="w-7 h-7 rounded-xl bg-white/15 flex items-center justify-center">
            <Plus size={19} strokeWidth={2.5} />
          </span>
          开始训练
        </button>

        {/* Today's Plan + Missed */}
        {!loading && (todayEntries.length > 0 || missedEntries.length > 0) && (
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-bold text-slate-900">今日计划</h2>
              <button
                onClick={() => navigate("/calendar")}
                className="text-sm text-emerald-600 font-medium flex items-center gap-0.5"
              >
                日历 <ChevronRight size={15} />
              </button>
            </div>
            <div className="space-y-2">
              {missedEntries.map((entry, idx) => (
                <div
                  key={`missed-${idx}`}
                  className="bg-amber-50 rounded-2xl p-4 border border-amber-100/80 flex items-center justify-between animate-fade-in"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-2.5 h-10 rounded-full flex-shrink-0"
                      style={{ backgroundColor: entry.template_color || entry.plan_color }}
                    />
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] bg-amber-200 text-amber-700 px-1.5 py-0.5 rounded-full font-semibold">补</span>
                        <p className="font-semibold text-sm text-slate-900">{entry.template_name}</p>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {entry.scheduled_date.slice(5).replace("-", "/")} · {entry.plan_name}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleStartFromPlan(entry)}
                    className="flex items-center gap-1 px-3 py-1.5 bg-amber-500 text-white rounded-xl text-xs font-semibold shadow-sm shadow-amber-200 active:scale-95 transition-transform"
                  >
                    <Dumbbell size={11} /> 补训
                  </button>
                </div>
              ))}
              {todayEntries.map((entry, idx) => (
                <div
                  key={`today-${idx}`}
                  className="bg-white rounded-2xl p-4 border border-slate-100 flex items-center justify-between shadow-sm animate-fade-in"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-2.5 h-10 rounded-full flex-shrink-0"
                      style={{ backgroundColor: entry.template_color || entry.plan_color }}
                    />
                    <div>
                      <p className="font-semibold text-sm text-slate-900">{entry.template_name}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{entry.plan_name}</p>
                    </div>
                  </div>
                  {entry.is_completed ? (
                    <span className="text-[11px] bg-emerald-50 text-emerald-600 px-2.5 py-1 rounded-full font-medium border border-emerald-100">
                      已完成 ✓
                    </span>
                  ) : (
                    <button
                      onClick={() => handleStartFromPlan(entry)}
                      className="flex items-center gap-1 px-3 py-1.5 bg-emerald-500 text-white rounded-xl text-xs font-semibold shadow-sm shadow-emerald-200 active:scale-95 transition-transform"
                    >
                      <Dumbbell size={11} /> 开始
                    </button>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Stats Cards */}
        <section className="grid grid-cols-2 gap-3">
          <div className="bg-gradient-to-br from-orange-400 to-amber-500 rounded-2xl p-4 shadow-sm shadow-orange-200">
            <Flame size={16} className="text-white/80 mb-2" />
            <p className="text-2xl font-bold text-white">{thisMonthCount}<span className="text-base font-semibold ml-0.5"> 次</span></p>
            <p className="text-orange-100 text-xs mt-0.5">本月训练</p>
          </div>
          <div className="bg-gradient-to-br from-emerald-400 to-teal-500 rounded-2xl p-4 shadow-sm shadow-emerald-200">
            <BarChart2 size={16} className="text-white/80 mb-2" />
            <p className="text-2xl font-bold text-white">
              {formatVolume(thisMonthVolume, displayUnit)}
            </p>
            <p className="text-emerald-100 text-xs mt-0.5">本月容量</p>
          </div>
        </section>

        {/* Recent Workouts */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-bold text-slate-900">最近训练</h2>
            <button
              onClick={() => navigate("/workouts")}
              className="text-sm text-emerald-600 font-medium flex items-center gap-0.5"
            >
              全部 <ChevronRight size={15} />
            </button>
          </div>

          {loading ? (
            <SkeletonList count={3} />
          ) : recentWorkouts.length === 0 ? (
            <div className="text-center py-10 bg-white rounded-2xl border border-slate-100">
              <div className="w-14 h-14 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Dumbbell size={24} className="text-slate-400" />
              </div>
              <p className="text-slate-500 font-medium">本月还没有训练记录</p>
              <p className="text-slate-400 text-sm mt-1">点击上方按钮开始第一次训练</p>
            </div>
          ) : (
            <div className="space-y-2">
              {/* Mini trend chart */}
              {volumeChartData.length >= 3 && (
                <div className="bg-white rounded-2xl border border-slate-100 px-4 pt-3 pb-1 shadow-sm">
                  <p className="text-xs text-slate-400 mb-2">容量趋势</p>
                  <ResponsiveContainer width="100%" height={60}>
                    <AreaChart data={volumeChartData}>
                      <defs>
                        <linearGradient id="volGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <Area type="monotone" dataKey="vol" stroke="#10b981" strokeWidth={2} fill="url(#volGrad)" dot={false} />
                      <Tooltip
                        contentStyle={{ fontSize: 11, borderRadius: 8, border: "none", boxShadow: "0 2px 8px rgba(0,0,0,0.12)" }}
                        formatter={(v: number) => [formatVolume(v, displayUnit), "容量"]}
                        labelFormatter={(_, payload) => payload?.[0]?.payload?.date ?? ""}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}
              {recentWorkouts.map((w) => (
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
                        {format(new Date(w.date), "M月d日 EEEE", { locale: zhCN })}
                        {w.mood ? ` ${MOOD_LABELS[w.mood]}` : ""}
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {w.exercise_count} 个动作 · {w.total_sets} 组 · {summaryMetric(w)}
                      </p>
                    </div>
                    <ChevronRight size={16} className="text-slate-300 flex-shrink-0" />
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>

      </div>
    </div>
  );
}

function summaryMetric(workout: WorkoutSummary): string {
  if (workout.total_volume > 0) return formatVolume(workout.total_volume, workout.total_volume_unit);
  if (workout.total_distance_m > 0) return `${Math.round(workout.total_distance_m)} m`;
  if (workout.total_duration_sec > 0) return `${workout.total_duration_sec} s`;
  return `${workout.total_reps} 次`;
}

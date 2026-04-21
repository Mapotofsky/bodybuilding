import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight, List, Dumbbell, Plus } from "lucide-react";
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addMonths,
  subMonths,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isToday,
} from "date-fns";
import { zhCN } from "date-fns/locale";
import { getWorkouts } from "@/services/workout";
import type { WorkoutSummary } from "@/types";

/** Pick a display color: prefer template_color, fall back to plan_color, then gray */
function entryColor(w: WorkoutSummary): string {
  return w.template_color || w.plan_color || "#9CA3AF";
}

export default function CalendarPage() {
  const navigate = useNavigate();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [workouts, setWorkouts] = useState<WorkoutSummary[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [loading, setLoading] = useState(false);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const allDays = eachDayOfInterval({ start: calStart, end: calEnd });

  useEffect(() => {
    setLoading(true);
    getWorkouts({
      from: format(calStart, "yyyy-MM-dd"),
      to: format(calEnd, "yyyy-MM-dd"),
    })
      .then(setWorkouts)
      .finally(() => setLoading(false));
  }, [currentMonth]);

  /** Group workouts by date string */
  const byDate = useMemo(() => {
    const map: Record<string, WorkoutSummary[]> = {};
    for (const w of workouts) {
      if (!map[w.date]) map[w.date] = [];
      map[w.date].push(w);
    }
    return map;
  }, [workouts]);

  const selectedDateStr = selectedDate ? format(selectedDate, "yyyy-MM-dd") : null;
  const selectedWorkouts = selectedDateStr ? (byDate[selectedDateStr] || []) : [];

  const monthStartStr = format(monthStart, "yyyy-MM-dd");
  const monthEndStr = format(monthEnd, "yyyy-MM-dd");
  const monthWorkoutCount = useMemo(
    () => workouts.filter((w) => w.date >= monthStartStr && w.date <= monthEndStr).length,
    [workouts, monthStartStr, monthEndStr]
  );

  return (
    <div className="pb-24 bg-slate-50 min-h-screen">
      {/* Header */}
      <div className="sticky top-0 bg-white/95 backdrop-blur-sm z-10 px-4 pt-4 pb-3 border-b border-slate-100">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentMonth((m) => subMonths(m, 1))}
              className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-500 transition-colors"
            >
              <ChevronLeft size={18} />
            </button>
            <h1 className="text-base font-bold w-28 text-center text-slate-900">
              {format(currentMonth, "yyyy年M月", { locale: zhCN })}
            </h1>
            <button
              onClick={() => setCurrentMonth((m) => addMonths(m, 1))}
              className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-500 transition-colors"
            >
              <ChevronRight size={18} />
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentMonth(new Date())}
              className="text-xs text-emerald-600 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full font-medium"
            >
              今天
            </button>
            <button
              onClick={() => navigate("/workouts")}
              className="flex items-center gap-1 text-xs text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full font-medium"
            >
              <List size={11} /> 列表
            </button>
          </div>
        </div>

        {/* Weekday headers */}
        <div className="grid grid-cols-7 text-center">
          {["一", "二", "三", "四", "五", "六", "日"].map((d) => (
            <div key={d} className="text-[11px] font-semibold text-slate-400 py-0.5">{d}</div>
          ))}
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 px-1.5 pt-1.5 gap-y-0.5">
        {allDays.map((day) => {
          const dateStr = format(day, "yyyy-MM-dd");
          const dayWorkouts = byDate[dateStr] || [];
          const isCurrentMonth = isSameMonth(day, currentMonth);
          const isSelected = selectedDate ? isSameDay(day, selectedDate) : false;
          const isTodayDate = isToday(day);
          const hasWorkout = dayWorkouts.length > 0;

          return (
            <button
              key={dateStr}
              onClick={() => setSelectedDate(isSameDay(day, selectedDate ?? new Date(0)) ? null : day)}
              className={`relative flex flex-col items-center rounded-2xl py-1.5 px-0.5 min-h-[58px] transition-all ${
                isSelected
                  ? "bg-emerald-50 ring-2 ring-emerald-400"
                  : "hover:bg-slate-100"
              } ${!isCurrentMonth ? "opacity-25" : ""}`}
            >
              {/* Day number */}
              <span
                className={`text-sm font-bold mb-1 w-7 h-7 flex items-center justify-center rounded-full ${
                  isTodayDate
                    ? "bg-emerald-500 text-white shadow-sm shadow-emerald-300"
                    : isSelected
                    ? "text-emerald-700"
                    : "text-slate-700"
                }`}
              >
                {format(day, "d")}
              </span>

              {/* Color dots */}
              {hasWorkout && (
                <div className="flex gap-0.5 justify-center flex-wrap max-w-[36px]">
                  {dayWorkouts.slice(0, 3).map((w, i) => (
                    <span
                      key={i}
                      className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: entryColor(w) }}
                    />
                  ))}
                  {dayWorkouts.length > 3 && (
                    <span className="text-[8px] text-slate-400 font-medium leading-none mt-0.5">
                      +{dayWorkouts.length - 3}
                    </span>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Month summary / selected detail */}
      <div className="px-4 mt-3">
        {!selectedDate && !loading && (
          <div className="bg-white rounded-2xl border border-slate-100 p-4 text-center">
            <p className="text-2xl font-bold text-slate-900">{monthWorkoutCount}</p>
            <p className="text-xs text-slate-400 mt-0.5">本月训练次数 · 点击日期查看</p>
          </div>
        )}

        {selectedDate && (
          <div>
            <h2 className="text-sm font-bold text-slate-700 mb-2">
              {format(selectedDate, "M月d日 EEEE", { locale: zhCN })}
            </h2>

            {loading ? (
              <div className="space-y-2">
                {[1,2].map(i => (
                  <div key={i} className="bg-white rounded-2xl p-4 border border-slate-100 animate-pulse">
                    <div className="h-4 bg-slate-200 rounded-xl w-2/3" />
                  </div>
                ))}
              </div>
            ) : selectedWorkouts.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-100 py-8 text-center">
                <Dumbbell size={24} className="mx-auto mb-2 text-slate-300" />
                <p className="text-sm text-slate-400">当日无训练记录</p>
              </div>
            ) : (
              <div className="space-y-2">
                {selectedWorkouts.map((w) => (
                  <button
                    key={w.id}
                    onClick={() => navigate(`/workouts/${w.id}`)}
                    className="w-full text-left bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex active:scale-[0.99] transition-transform"
                  >
                    <div
                      className="w-1.5 flex-shrink-0"
                      style={{ backgroundColor: entryColor(w) }}
                    />
                    <div className="flex-1 min-w-0 p-3 flex items-center justify-between">
                      <div>
                        {w.template_name && (
                          <span
                            className="text-xs font-semibold px-2 py-0.5 rounded-full"
                            style={{
                              backgroundColor: entryColor(w) + "22",
                              color: entryColor(w),
                            }}
                          >
                            {w.template_name}
                          </span>
                        )}
                        <p className="text-xs text-slate-400 mt-1">
                          {w.exercise_count} 动作 · {w.total_sets} 组 · {Math.round(w.total_volume)}kg
                        </p>
                        {w.start_time && w.end_time && (
                          <p className="text-xs text-slate-400 mt-0.5">
                            {format(new Date(w.start_time), "HH:mm")} – {format(new Date(w.end_time), "HH:mm")}
                          </p>
                        )}
                      </div>
                      <ChevronRight size={15} className="text-slate-300 flex-shrink-0" />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* FAB: 选中日期时显示 */}
      {selectedDate && (
        <button
          onClick={() => navigate(`/workouts/new?date=${selectedDateStr}`)}
          className="fixed bottom-24 right-4 w-14 h-14 bg-emerald-500 text-white rounded-full shadow-lg shadow-emerald-500/30 flex items-center justify-center hover:bg-emerald-600 active:scale-95 transition-all z-40 md:right-[calc(50%-384px+16px)]"
        >
          <Plus size={24} />
        </button>
      )}
    </div>
  );
}

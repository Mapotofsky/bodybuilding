import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight, List, Dumbbell } from "lucide-react";
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

  return (
    <div className="pb-24">
      {/* Header */}
      <div className="sticky top-0 bg-white z-10 px-4 pt-4 pb-2">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentMonth((m) => subMonths(m, 1))}
              className="p-1.5 rounded-full hover:bg-gray-100 text-gray-500"
            >
              <ChevronLeft size={20} />
            </button>
            <h1 className="text-lg font-bold w-28 text-center">
              {format(currentMonth, "yyyy年M月", { locale: zhCN })}
            </h1>
            <button
              onClick={() => setCurrentMonth((m) => addMonths(m, 1))}
              className="p-1.5 rounded-full hover:bg-gray-100 text-gray-500"
            >
              <ChevronRight size={20} />
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentMonth(new Date())}
              className="text-xs text-blue-500 border border-blue-200 px-2.5 py-1 rounded-full"
            >
              今天
            </button>
            <button
              onClick={() => navigate("/workouts")}
              className="flex items-center gap-1 text-xs text-gray-500 border border-gray-200 px-2.5 py-1 rounded-full"
            >
              <List size={12} /> 列表
            </button>
          </div>
        </div>

        {/* Weekday headers */}
        <div className="grid grid-cols-7 text-center mb-1">
          {["一", "二", "三", "四", "五", "六", "日"].map((d) => (
            <div key={d} className="text-xs text-gray-400 py-0.5">{d}</div>
          ))}
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 px-1">
        {allDays.map((day) => {
          const dateStr = format(day, "yyyy-MM-dd");
          const dayWorkouts = byDate[dateStr] || [];
          const isCurrentMonth = isSameMonth(day, currentMonth);
          const isSelected = selectedDate ? isSameDay(day, selectedDate) : false;
          const isTodayDate = isToday(day);

          return (
            <button
              key={dateStr}
              onClick={() => setSelectedDate(isSameDay(day, selectedDate ?? new Date(0)) ? null : day)}
              className={`relative flex flex-col items-center rounded-xl py-1 px-0.5 min-h-[64px] transition ${
                isSelected ? "bg-blue-50 ring-1 ring-blue-300" : "hover:bg-gray-50"
              } ${!isCurrentMonth ? "opacity-30" : ""}`}
            >
              {/* Day number */}
              <span
                className={`text-sm font-medium mb-0.5 w-7 h-7 flex items-center justify-center rounded-full ${
                  isTodayDate
                    ? "bg-blue-500 text-white"
                    : isSelected
                    ? "text-blue-600"
                    : "text-gray-700"
                }`}
              >
                {format(day, "d")}
              </span>

              {/* Template color tags — up to 3 */}
              <div className="flex flex-col gap-0.5 w-full px-0.5">
                {dayWorkouts.slice(0, 3).map((w, i) => (
                  <div
                    key={i}
                    className="w-full rounded text-center overflow-hidden"
                    style={{ backgroundColor: entryColor(w) + "22" }}
                  >
                    <span
                      className="text-[9px] font-semibold leading-tight px-0.5 truncate block"
                      style={{ color: entryColor(w) }}
                    >
                      {w.template_name || "训练"}
                    </span>
                  </div>
                ))}
                {dayWorkouts.length > 3 && (
                  <span className="text-[9px] text-gray-400 text-center">
                    +{dayWorkouts.length - 3}
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Selected Day Detail */}
      {selectedDate && (
        <div className="px-4 mt-3">
          <h2 className="text-sm font-semibold text-gray-700 mb-2">
            {format(selectedDate, "M月d日 EEEE", { locale: zhCN })}
          </h2>

          {loading ? (
            <p className="text-center py-6 text-gray-400 text-sm">加载中...</p>
          ) : selectedWorkouts.length === 0 ? (
            <div className="text-center py-6 text-gray-400">
              <Dumbbell size={28} className="mx-auto mb-1 opacity-30" />
              <p className="text-sm">当日无训练记录</p>
            </div>
          ) : (
            <div className="space-y-2">
              {selectedWorkouts.map((w) => (
                <button
                  key={w.id}
                  onClick={() => navigate(`/workouts/${w.id}`)}
                  className="w-full text-left bg-white rounded-2xl p-4 border border-gray-100 hover:bg-gray-50 transition"
                >
                  <div className="flex items-center gap-3">
                    {/* Color bar */}
                    <div
                      className="w-1 h-10 rounded-full flex-shrink-0"
                      style={{ backgroundColor: entryColor(w) }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
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
                        <span className="text-xs text-gray-400">
                          {w.exercise_count} 个动作 · {w.total_sets} 组 ·{" "}
                          {Math.round(w.total_volume)}kg
                        </span>
                      </div>
                      {w.start_time && w.end_time && (
                        <p className="text-xs text-gray-400 mt-0.5">
                          {format(new Date(w.start_time), "HH:mm")} –{" "}
                          {format(new Date(w.end_time), "HH:mm")}
                        </p>
                      )}
                    </div>
                    <ChevronRight size={16} className="text-gray-300 flex-shrink-0" />
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Month summary when no date selected */}
      {!selectedDate && !loading && (
        <div className="px-4 mt-4">
          <p className="text-xs text-gray-400 text-center">
            本月已完成 <span className="font-semibold text-gray-700">{workouts.length}</span> 次训练
            · 点击日期查看详情
          </p>
        </div>
      )}
    </div>
  );
}

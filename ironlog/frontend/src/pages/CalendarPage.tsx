import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { addMonths, eachDayOfInterval, endOfMonth, endOfWeek, format, isSameDay, isSameMonth, isToday, startOfMonth, startOfWeek, subMonths } from "date-fns";
import { zhCN } from "date-fns/locale";
import { Customized, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ChevronLeft, ChevronRight, Dumbbell, List, Plus } from "lucide-react";
import { convertWeight, formatOneDecimal, formatVolume } from "@/core/workoutMetrics";
import { getCalendarOverview, getCalendarStats, type CalendarDayNote, type CalendarDayOverview, type CalendarStats, type StatsPeriod } from "@/services/calendarStats";
import { categoryKeyStyle } from "@/theme/categoryColors";
import { CHART_TOOLTIP_CONTENT_STYLE, CHART_TOOLTIP_ITEM_STYLE, CHART_TOOLTIP_LABEL_STYLE } from "@/components/chartTooltip";

export default function CalendarPage() {
  const navigate = useNavigate();
  const [view, setView] = useState<"calendar" | "stats">("calendar");
  const [period, setPeriod] = useState<StatsPeriod>("month");
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [days, setDays] = useState<CalendarDayOverview[]>([]);
  const [stats, setStats] = useState<CalendarStats | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [loading, setLoading] = useState(false);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const allDays = eachDayOfInterval({ start: calStart, end: calEnd });

  useEffect(() => {
    setLoading(true);
    getCalendarOverview({ from: format(calStart, "yyyy-MM-dd"), to: format(calEnd, "yyyy-MM-dd") })
      .then(setDays)
      .finally(() => setLoading(false));
  }, [currentMonth]);

  useEffect(() => {
    getCalendarStats(period, currentMonth).then(setStats);
  }, [period, currentMonth]);

  const byDate = useMemo(() => Object.fromEntries(days.map((day) => [day.date, day])), [days]);
  const selectedDateStr = selectedDate ? format(selectedDate, "yyyy-MM-dd") : null;
  const selected = selectedDateStr ? byDate[selectedDateStr] : null;
  const monthWorkoutCount = days
    .filter((day) => day.date >= format(monthStart, "yyyy-MM-dd") && day.date <= format(monthEnd, "yyyy-MM-dd"))
    .reduce((sum, day) => sum + day.workouts.length, 0);

  return (
    <div className="app-screen min-h-screen pb-24">
      <div className="sticky top-0 app-surface z-10 px-4 pt-4 pb-3 border-b app-border">
        <div className="flex items-center justify-between mb-3 gap-3">
          <div className="flex items-center gap-1 min-w-0">
            <button onClick={() => setCurrentMonth((month) => subMonths(month, 1))} className="w-8 h-8 rounded-full app-surface-muted flex items-center justify-center app-text-muted" aria-label="上个月">
              <ChevronLeft size={18} />
            </button>
            <h1 className="text-base font-bold w-28 text-center app-text">{format(currentMonth, "yyyy年M月", { locale: zhCN })}</h1>
            <button onClick={() => setCurrentMonth((month) => addMonths(month, 1))} className="w-8 h-8 rounded-full app-surface-muted flex items-center justify-center app-text-muted" aria-label="下个月">
              <ChevronRight size={18} />
            </button>
          </div>
          <button onClick={() => setCurrentMonth(new Date())} className="app-primary-soft text-xs border px-2.5 py-1 rounded-full font-medium">今天</button>
        </div>
        <div className="app-surface-muted rounded-2xl border app-border p-1 grid grid-cols-2">
          <button onClick={() => setView("calendar")} className={`h-9 rounded-xl text-sm font-semibold ${view === "calendar" ? "app-primary-bg" : "app-text-muted"}`}>日历</button>
          <button onClick={() => setView("stats")} className={`h-9 rounded-xl text-sm font-semibold ${view === "stats" ? "app-primary-bg" : "app-text-muted"}`}>统计</button>
        </div>
        {view === "calendar" && (
          <div className="grid grid-cols-7 text-center mt-3">
            {["一", "二", "三", "四", "五", "六", "日"].map((day) => <div key={day} className="text-[11px] font-semibold app-text-muted py-0.5">{day}</div>)}
          </div>
        )}
      </div>

      {view === "calendar" ? (
        <>
          <div className="grid grid-cols-7 px-1.5 pt-1.5 gap-1">
            {allDays.map((day) => {
              const dateStr = format(day, "yyyy-MM-dd");
              const overview = byDate[dateStr];
              const isSelected = selectedDate ? isSameDay(day, selectedDate) : false;
              return (
                <button
                  key={dateStr}
                  onClick={() => setSelectedDate(isSelected ? null : day)}
                  className="app-surface min-h-[82px] rounded-2xl border app-border p-1.5 flex flex-col items-start gap-1 transition-transform active:scale-[0.98]"
                  style={{ opacity: isSameMonth(day, currentMonth) ? 1 : 0.36, boxShadow: isSelected ? "0 0 0 2px var(--color-primary)" : undefined }}
                >
                  <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold" style={isToday(day) ? { backgroundColor: "var(--color-primary)", color: "var(--color-surface)" } : { color: "var(--color-text)" }}>
                    {format(day, "d")}
                  </span>
                  <div className="w-full space-y-1">
                    {(overview?.labels || []).map((label) => (
                      <span key={`${dateStr}-${label.text}`} className="block max-w-full truncate text-[10px] leading-4 px-1.5 rounded-full border font-semibold" style={categoryKeyStyle(label.color_key)}>
                        {label.text}
                      </span>
                    ))}
                    {overview && overview.hidden_label_count > 0 && <span className="text-[10px] app-text-muted">+{overview.hidden_label_count}</span>}
                    {overview && overview.note_count > 0 && <span className="block text-[10px] app-text-muted">备注 {overview.note_count}</span>}
                  </div>
                </button>
              );
            })}
          </div>

          <div className="px-5 mt-3">
            {!selectedDate && !loading && (
              <div className="app-surface rounded-2xl border app-border p-4 text-center">
                <p className="text-2xl font-bold app-text">{monthWorkoutCount}</p>
                <p className="text-xs app-text-muted mt-0.5">本月实际训练 · 点击日期查看</p>
              </div>
            )}
            {selectedDate && (
              <div>
                <h2 className="text-sm font-bold app-text mb-2">{format(selectedDate, "M月d日 EEEE", { locale: zhCN })}</h2>
                {loading ? (
                  <div className="app-surface rounded-2xl border app-border p-4 text-sm app-text-muted">加载中...</div>
                ) : (
                  <div className="space-y-2">
                    {selected && selected.notes.length > 0 && <NoteList notes={selected.notes} onOpenManage={() => navigate("/timeline-notes")} />}
                    {!selected || selected.workouts.length === 0 ? (
                      <div className="app-surface rounded-2xl border app-border py-8 text-center">
                        <Dumbbell size={24} className="mx-auto mb-2 app-text-muted" />
                        <p className="text-sm app-text-muted">当日无训练记录</p>
                      </div>
                    ) : (
                      selected.workouts.map((workout) => (
                        <button key={workout.id} onClick={() => navigate(`/workouts/${workout.id}`)} className="app-surface w-full text-left rounded-2xl p-4 border app-border shadow-sm flex items-center gap-3 active:scale-[0.99] transition-transform">
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap gap-1">
                              {workout.labels.map((label) => <span key={label.text} className="text-xs font-semibold px-2 py-0.5 rounded-full border" style={categoryKeyStyle(label.color_key)}>{label.text}</span>)}
                            </div>
                            <p className="text-xs app-text-muted mt-1">{workout.summary}</p>
                          </div>
                          <ChevronRight size={15} className="app-text-muted shrink-0" />
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
          {selectedDate && (
            <button onClick={() => navigate(`/workouts/new?date=${selectedDateStr}`)} className="fixed bottom-24 right-4 w-14 h-14 app-primary-bg rounded-full shadow-lg flex items-center justify-center active:scale-95 transition-all z-40 md:right-[calc(50%-384px+16px)]" aria-label="新建训练">
              <Plus size={24} />
            </button>
          )}
        </>
      ) : (
        <StatsView period={period} onPeriod={setPeriod} stats={stats} onOpenWorkouts={() => navigate("/workouts")} onOpenWorkout={(id) => navigate(`/workouts/${id}`)} />
      )}
    </div>
  );
}

function StatsView({ period, onPeriod, stats, onOpenWorkouts, onOpenWorkout }: { period: StatsPeriod; onPeriod: (period: StatsPeriod) => void; stats: CalendarStats | null; onOpenWorkouts: () => void; onOpenWorkout: (id: string) => void }) {
  if (!stats) return <div className="px-5 pt-5 app-text-muted text-sm">加载中...</div>;
  return (
    <div className="px-5 pt-5 space-y-4">
      <div className="app-surface-muted rounded-2xl border app-border p-1 grid grid-cols-3">
        {(["week", "month", "year"] as StatsPeriod[]).map((item) => (
          <button key={item} onClick={() => onPeriod(item)} className={`h-9 rounded-xl text-sm font-semibold ${period === item ? "app-primary-bg" : "app-text-muted"}`}>
            {item === "week" ? "周" : item === "month" ? "月" : "年"}
          </button>
        ))}
      </div>

      <section className="app-surface rounded-2xl border shadow-sm p-4">
        <div className="flex items-center justify-between gap-3 mb-3">
          <div>
            <h2 className="text-sm font-bold app-text">{stats.current.label}</h2>
            {stats.current.is_current_incomplete && <p className="text-xs app-text-muted mt-0.5">截至今日</p>}
          </div>
          <button onClick={onOpenWorkouts} className="app-primary-soft border text-xs font-semibold px-2.5 py-1 rounded-full flex items-center gap-1">
            <List size={12} />
            列表
          </button>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Kpi label="训练次数" value={stats.kpis.workout_count} delta={stats.deltas.workout_count} unit="次" />
          <Kpi label="总组数" value={stats.kpis.total_sets} delta={stats.deltas.total_sets} unit="组" />
          <Kpi label="总容量" value={formatVolume(stats.kpis.total_volume, stats.kpis.total_volume_unit)} deltaText={formatSignedVolume(stats.deltas.total_volume, stats.kpis.total_volume_unit)} unit="" />
          <Kpi label="训练时长" value={stats.kpis.duration_minutes} unit="分钟" />
        </div>
      </section>

      <section className="app-surface rounded-2xl border shadow-sm p-4">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <h2 className="text-sm font-bold app-text">容量曲线</h2>
          {stats.period === "year" && (
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] app-text-muted" aria-label="容量曲线图例">
              <span className="flex items-center gap-1"><span className="w-3 h-0.5 rounded-full" style={{ backgroundColor: "var(--color-primary)" }} />月日均</span>
              <span className="flex items-center gap-1"><span className="w-3 border-t border-dashed" style={{ borderColor: "var(--color-text-secondary)" }} />7 日滑动平均</span>
            </div>
          )}
        </div>
        <div className="h-44 app-surface-muted rounded-xl border app-border p-2">
          <VolumeChart stats={stats} />
        </div>
      </section>

      <section className="app-surface rounded-2xl border shadow-sm p-4">
        <h2 className="text-sm font-bold app-text mb-1">打卡强度</h2>
        <p className="text-xs app-text-muted leading-relaxed mb-3">按每天完成训练次数分档，次数越多颜色越深。</p>
        <CheckinGrid period={period} points={stats.checkins} />
      </section>

      <section className="app-surface rounded-2xl border shadow-sm p-4">
        <h2 className="text-sm font-bold app-text mb-1">肌群分布</h2>
        <p className="text-xs app-text-muted leading-relaxed mb-3">按非热身训练组统计肌群占比，主目标计 1，次要目标计 0.5。</p>
        {stats.muscle_distribution.length === 0 ? <p className="text-sm app-text-muted">暂无工作组肌群数据</p> : (
          <div className="space-y-2">
            {stats.muscle_distribution.map((item) => (
              <div key={item.muscle_id}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="app-text">{item.label}</span>
                  <span className="app-text-muted">{Math.round(item.percent * 100)}%</span>
                </div>
                <div className="h-2 app-surface-muted rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${item.percent * 100}%`, backgroundColor: "var(--color-primary)" }} />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="app-surface rounded-2xl border shadow-sm p-4">
        <h2 className="text-sm font-bold app-text mb-3">身体指标</h2>
        {stats.body_summaries.length === 0 ? <p className="text-sm app-text-muted">本周期暂无身体记录</p> : (
          <div className="space-y-1">
            {groupBodySummaries(stats.body_summaries).map((row) => (
              row.type === "pair" ? (
                <BodySummaryRow key={row.key} label={row.label} left={row.left} right={row.right} />
              ) : (
                <BodySummaryRow key={row.item.key} label={row.item.label} right={row.item} />
              )
            ))}
          </div>
        )}
      </section>

      <section className="app-surface rounded-2xl border shadow-sm p-4">
        <h2 className="text-sm font-bold app-text mb-3">PR / RM 刷新</h2>
        <div className="grid grid-cols-2 gap-2 mb-3">
          <Metric label="真实 PR" value={stats.performance.true_pr_count} unit="项" />
          <Metric label="RPE 修正 RM" value={stats.performance.rpe_adjusted_rm_count} unit="项" />
        </div>
        {stats.performance.top_improvements.length > 0 && (
          <div className="app-surface-muted rounded-xl border app-border p-3 mb-3">
            <p className="text-xs font-semibold app-text-muted mb-2">刷新幅度最高</p>
            <div className="space-y-2">
              {stats.performance.top_improvements.map((item) => (
                <button key={item.record.id} className="w-full text-left" onClick={() => onOpenWorkout(item.record.source_workout_id)}>
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold app-text truncate">{item.record.exercise_name || "动作"} · {item.record.metric_label}</p>
                    <span className="text-xs font-bold app-primary-soft px-2 py-0.5 rounded-full shrink-0">+{Math.round(item.improvement_ratio * 100)}%</span>
                  </div>
                  <p className="text-xs app-text-muted">{formatPerformanceComparison(item.previous_value, item.record, stats.kpis.total_volume_unit)}</p>
                </button>
              ))}
            </div>
          </div>
        )}
        {stats.performance.recent_records.length === 0 ? <p className="text-sm app-text-muted">本周期暂无刷新记录</p> : (
          <div>
            {stats.performance.recent_records.map((record, index) => (
              <button key={record.id} className={`w-full text-left py-2 ${index > 0 ? "border-t app-border" : ""}`} onClick={() => onOpenWorkout(record.source_workout_id)}>
                <p className="text-sm font-semibold app-text truncate">{record.exercise_name || "动作"} · {record.metric_label}</p>
                <p className="text-xs app-text-muted">{formatPerformanceValue(record, stats.kpis.total_volume_unit)} · {record.achieved_at.slice(0, 10)}</p>
              </button>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function VolumeChart({ stats }: { stats: CalendarStats }) {
  if (stats.period !== "year") {
    return (
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={stats.volume_points}>
          <XAxis dataKey="label" tick={{ fill: "var(--color-text-secondary)", fontSize: 11 }} />
          <YAxis width={48} tickFormatter={(value) => formatOneDecimal(Number(value))} tick={{ fill: "var(--color-text-secondary)", fontSize: 11 }} />
          <Tooltip content={(props) => <VolumeTooltip active={props.active} datum={props.payload?.[0]?.payload} period={stats.period} unit={stats.kpis.total_volume_unit} />} />
          <Line type="monotone" dataKey="volume" stroke="var(--color-primary)" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    );
  }

  const chartData = buildYearVolumeChartData(stats);
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={chartData.interactivePoints}>
        <XAxis dataKey="label" interval={0} tick={{ fill: "var(--color-text-secondary)", fontSize: 11 }} />
        <YAxis width={48} domain={volumeAxisDomain(stats)} tickFormatter={(value) => formatOneDecimal(Number(value))} tick={{ fill: "var(--color-text-secondary)", fontSize: 11 }} />
        <Tooltip content={(props) => <VolumeTooltip active={props.active} datum={props.payload?.[0]?.payload} period={stats.period} unit={stats.kpis.total_volume_unit} />} />
        <Customized component={<YearVolumeAuxiliaryLine points={chartData.auxiliaryPoints} year={Number(stats.current.from.slice(0, 4))} />} />
        <Line type="monotone" dataKey="volume" stroke="var(--color-primary)" strokeWidth={2.5} dot={{ r: 2 }} />
      </LineChart>
    </ResponsiveContainer>
  );
}

function VolumeTooltip({ active, datum, period, unit }: { active?: boolean; datum?: { date?: string; volume?: number | null }; period: StatsPeriod; unit: CalendarStats["kpis"]["total_volume_unit"] }) {
  const tooltip = getVolumeTooltipContent(active, datum, period, unit);
  if (!tooltip) return null;
  return (
    <div style={CHART_TOOLTIP_CONTENT_STYLE}>
      <p style={CHART_TOOLTIP_LABEL_STYLE}>{tooltip.date}</p>
      <p style={CHART_TOOLTIP_ITEM_STYLE}>{tooltip.label}：{tooltip.value}</p>
    </div>
  );
}

export function buildYearVolumeChartData(stats: CalendarStats) {
  return {
    interactivePoints: stats.volume_points.map((point) => ({ date: point.date, label: point.label, volume: point.volume })),
    auxiliaryPoints: stats.volume_auxiliary_points.map((point) => ({ date: point.date, moving_average: point.moving_average })),
  };
}

function volumeAxisDomain(stats: CalendarStats): [number, number] {
  const values = [
    ...stats.volume_points.map((point) => point.volume),
    ...stats.volume_auxiliary_points.map((point) => point.moving_average),
  ].filter((value) => Number.isFinite(value));
  const max = Math.max(0, ...values);
  return [0, max > 0 ? max * 1.1 : 1];
}

export function getVolumeTooltipContent(active: boolean | undefined, datum: { date?: string; volume?: number | null } | undefined, period: StatsPeriod, unit: CalendarStats["kpis"]["total_volume_unit"]) {
  if (!active || datum?.date == null || datum.volume == null) return null;
  return {
    date: period === "year" ? datum.date.slice(0, 7) : datum.date,
    label: period === "year" ? "月日均容量" : "容量",
    value: formatVolume(datum.volume, unit),
  };
}

function YearVolumeAuxiliaryLine({ points, year, offset, yAxisMap }: {
  points: CalendarStats["volume_auxiliary_points"];
  year: number;
  offset?: { left: number; top: number; width: number; height: number };
  yAxisMap?: Record<string, { scale?: (value: number) => number }>;
}) {
  const yScale = Object.values(yAxisMap ?? {})[0]?.scale;
  if (!offset || !yScale || points.length === 0) return null;
  const yearStart = new Date(year, 0, 1).getTime();
  const yearEnd = new Date(year, 11, 31).getTime();
  const span = Math.max(1, yearEnd - yearStart);
  const path = points
    .map((point, index) => {
      const date = new Date(`${point.date}T00:00:00`).getTime();
      const x = offset.left + ((date - yearStart) / span) * offset.width;
      const y = yScale(point.moving_average);
      if (!Number.isFinite(x) || !Number.isFinite(y)) return "";
      return `${index === 0 ? "M" : "L"}${x},${y}`;
    })
    .filter(Boolean)
    .join(" ");
  if (!path) return null;
  return (
    <path
      d={path}
      fill="none"
      stroke="var(--color-text-secondary)"
      strokeWidth={1.25}
      strokeDasharray="4 4"
      strokeOpacity={0.55}
      pointerEvents="none"
    />
  );
}

function NoteList({ notes, onOpenManage }: { notes: CalendarDayNote[]; onOpenManage: () => void }) {
  return (
    <div className="app-surface rounded-2xl border app-border p-3 space-y-2">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-bold app-text-muted">生效备注</p>
        <button onClick={onOpenManage} className="text-xs font-semibold app-primary-soft px-2 py-0.5 rounded-full">管理</button>
      </div>
      {notes.map((note) => (
        <div key={note.id} className="app-surface-muted rounded-xl border app-border p-3">
          <p className="text-sm app-text whitespace-pre-wrap">{note.content}</p>
          <p className="text-xs app-text-muted mt-1">{noteRangeText(note)}</p>
        </div>
      ))}
    </div>
  );
}

function noteRangeText(note: CalendarDayNote): string {
  if (note.range_type === "single_day") return note.start_date;
  if (note.range_type === "open_ended") return `${note.start_date} 起`;
  return `${note.start_date} - ${note.end_date}`;
}

function CheckinGrid({ period, points }: { period: StatsPeriod; points: CalendarStats["checkins"] }) {
  if (period !== "year") {
    return (
      <div className="grid grid-cols-7 gap-1">
        {points.map((point) => <CheckinCell key={point.date} point={point} size="normal" />)}
      </div>
    );
  }
  const groups = groupCheckinsByMonth(points);
  return (
    <div className="space-y-1.5">
      {groups.map((group) => (
        <div key={group.month} className="grid items-center gap-2" style={{ gridTemplateColumns: "2rem minmax(0, 1fr)" }}>
          <span className="text-[10px] app-text-muted text-right">{Number(group.month.slice(5))}月</span>
          <div className="grid gap-0.5" style={{ gridTemplateColumns: "repeat(31, minmax(0, 1fr))" }}>
            {Array.from({ length: 31 }, (_, index) => {
              const point = group.byDay.get(index + 1);
              return point
                ? <CheckinCell key={point.date} point={point} size="compact" />
                : <div key={`${group.month}-${index + 1}`} className="h-2 rounded-[2px]" />;
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

function CheckinCell({ point, size }: { point: CalendarStats["checkins"][number]; size: "normal" | "compact" }) {
  return (
    <div
      className={`${size === "compact" ? "h-2 rounded-[2px]" : "aspect-square rounded-lg"} border app-border`}
      title={`${point.date} ${point.count} 次`}
      style={{ backgroundColor: point.intensity === 0 ? "var(--color-surface-2)" : point.intensity === 1 ? "var(--color-primary-soft)" : point.intensity === 2 ? "var(--color-primary)" : "var(--color-primary-hover)" }}
    />
  );
}

function groupCheckinsByMonth(points: CalendarStats["checkins"]) {
  const groups = new Map<string, Map<number, CalendarStats["checkins"][number]>>();
  for (const point of points) {
    const month = point.date.slice(0, 7);
    if (!groups.has(month)) groups.set(month, new Map());
    groups.get(month)!.set(Number(point.date.slice(8)), point);
  }
  return [...groups.entries()].map(([month, byDay]) => ({ month, byDay }));
}

type BodySummary = CalendarStats["body_summaries"][number];

const BODY_SUMMARY_PAIRS = [
  { key: "upperArm", label: "上臂围", left: "upperArmLeft", right: "upperArmRight" },
  { key: "forearm", label: "前臂围", left: "forearmLeft", right: "forearmRight" },
  { key: "thigh", label: "大腿围", left: "thighLeft", right: "thighRight" },
  { key: "calf", label: "小腿围", left: "calfLeft", right: "calfRight" },
] as const;

function groupBodySummaries(items: BodySummary[]) {
  const renderedPairs = new Set<string>();
  const byKey = new Map(items.map((item) => [item.key, item]));
  const pairByMember = new Map<string, typeof BODY_SUMMARY_PAIRS[number]>();
  for (const pair of BODY_SUMMARY_PAIRS) {
    pairByMember.set(pair.left, pair);
    pairByMember.set(pair.right, pair);
  }
  const rows: Array<
    | { type: "single"; item: BodySummary }
    | { type: "pair"; key: string; label: string; left: BodySummary | null; right: BodySummary | null }
  > = [];

  for (const item of items) {
    const pair = pairByMember.get(item.key);
    if (pair) {
      if (renderedPairs.has(pair.key)) continue;
      renderedPairs.add(pair.key);
      rows.push({
        type: "pair",
        key: pair.key,
        label: pair.label,
        left: byKey.get(pair.left) ?? null,
        right: byKey.get(pair.right) ?? null,
      });
      continue;
    }
    rows.push({ type: "single", item });
  }

  return rows;
}

function BodySummaryRow({ label, left, right }: { label: string; left?: BodySummary | null; right: BodySummary | null }) {
  return (
    <div className="grid grid-cols-3 items-center gap-x-1 py-1 text-sm leading-6">
      <span className="min-w-0 truncate app-text-muted">{label}</span>
      {left === undefined ? <span aria-hidden="true" /> : <BodySummaryValue side="左" item={left} align="center" />}
      <BodySummaryValue side={left === undefined ? null : "右"} item={right} align="right" />
    </div>
  );
}

function BodySummaryValue({ side, item, align }: { side: "左" | "右" | null; item: BodySummary | null; align: "center" | "right" }) {
  return (
    <span className={`min-w-0 flex items-baseline gap-1 ${align === "right" ? "justify-end text-right" : "justify-center text-center"}`}>
      {side && <span className="app-text-muted shrink-0">{side}</span>}
      <span className="min-w-0 truncate font-semibold app-text">{item ? formatBodySummary(item) : "—"}</span>
    </span>
  );
}

function formatBodySummary(item: CalendarStats["body_summaries"][number]): string {
  if (item.previous_value == null) return `${item.last_value} ${item.unit}`;
  return `${item.previous_value} → ${item.last_value} ${item.unit}`;
}

function formatSignedVolume(value: number, unit: CalendarStats["kpis"]["total_volume_unit"]): string {
  return `${value >= 0 ? "+" : ""}${formatVolume(value, unit)}`;
}

type PerformanceRecordForDisplay = CalendarStats["performance"]["recent_records"][number];

function formatPerformanceComparison(previousValue: number, record: PerformanceRecordForDisplay, displayUnit: CalendarStats["kpis"]["total_volume_unit"]): string {
  return `${formatPerformanceScalar(previousValue, record.unit, displayUnit)} → ${formatPerformanceValue(record, displayUnit)}`;
}

function formatPerformanceValue(record: PerformanceRecordForDisplay, displayUnit: CalendarStats["kpis"]["total_volume_unit"]): string {
  if (record.metric_type === "strength.rpe_adjusted_rm_mean" && record.rm) {
    const mean = convertWeight(record.rm.meanKg, "kg", displayUnit);
    const standardDeviation = convertWeight(record.rm.standardDeviationKg, "kg", displayUnit);
    return `${formatOneDecimal(mean)} ± ${formatOneDecimal(standardDeviation)} ${displayUnit}`;
  }
  return formatPerformanceScalar(record.value, record.unit, displayUnit);
}

function formatPerformanceScalar(value: number, unit: PerformanceRecordForDisplay["unit"], displayUnit: CalendarStats["kpis"]["total_volume_unit"]): string {
  if (unit === "kg_reps") return formatVolume(convertWeight(value, "kg", displayUnit), displayUnit);
  if (unit === "kg") return `${formatOneDecimal(convertWeight(value, "kg", displayUnit))} ${displayUnit}`;
  if (unit === "m_per_sec") return `${formatOneDecimal(value)} m/s`;
  if (unit === "sec") return `${formatOneDecimal(value)} s`;
  if (unit === "reps") return `${formatOneDecimal(value)} 次`;
  return `${formatOneDecimal(value)} ${unit}`;
}

function Kpi({ label, value, delta, deltaText, unit }: { label: string; value: string | number; delta?: number; deltaText?: string; unit: string }) {
  const renderedDelta = deltaText ?? (delta == null ? null : `${delta >= 0 ? "+" : ""}${Math.round(delta)}`);
  return (
    <div className="app-surface-muted rounded-xl border app-border p-3 min-w-0">
      <p className="text-lg font-bold app-text truncate">{value}{unit && <span className="text-xs font-normal app-text-muted ml-0.5">{unit}</span>}</p>
      <p className="text-xs app-text-muted mt-0.5">{label}{renderedDelta && <span className="ml-1">({renderedDelta})</span>}</p>
    </div>
  );
}

function Metric({ label, value, unit }: { label: string; value: number; unit: string }) {
  return (
    <div className="app-surface-muted rounded-xl border app-border p-3 text-center">
      <p className="text-xl font-bold app-text">{value}<span className="text-xs font-normal app-text-muted ml-0.5">{unit}</span></p>
      <p className="text-xs app-text-muted mt-0.5">{label}</p>
    </div>
  );
}

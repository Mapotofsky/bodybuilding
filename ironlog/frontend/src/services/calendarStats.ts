import { addDays, eachDayOfInterval, endOfMonth, endOfWeek, endOfYear, format, startOfMonth, startOfWeek, startOfYear, subDays, subMonths, subWeeks, subYears } from "date-fns";
import { resolveExerciseId } from "@/core/exerciseRedirects";
import type { ExerciseDoc, WorkoutDoc } from "@/core/models";
import { calculateWorkoutMetrics, formatVolume } from "@/core/workoutMetrics";
import { localRepository } from "@/repositories/localJsonRepository";
import { CATEGORY_LABELS, MUSCLE_GROUP_LABELS, type MuscleGroupId } from "@/types";
import { categoryColorKey, type CategoryColorKey } from "@/theme/categoryColors";
import { listEffectiveTimelineNotes, type TimelineNote } from "@/services/timelineNotes";
import { getPeriodBodyMetricSummary, type PeriodBodyMetricSummary } from "@/services/bodyMetrics";
import { getPeriodPerformanceSummary, type PerformanceSummary } from "@/services/performance";

export type StatsPeriod = "week" | "month" | "year";

export interface CalendarDayLabel {
  text: string;
  color_key: CategoryColorKey;
}

export interface CalendarWorkoutItem {
  id: string;
  date: string;
  template_name: string | null;
  labels: CalendarDayLabel[];
  summary: string;
}

export interface CalendarDayNote {
  id: string;
  content: string;
  range_type: TimelineNote["range_type"];
  start_date: string;
  end_date: string | null;
}

export interface CalendarDayOverview {
  date: string;
  workouts: CalendarWorkoutItem[];
  labels: CalendarDayLabel[];
  hidden_label_count: number;
  note_count: number;
  notes: CalendarDayNote[];
}

export interface StatsRange {
  from: string;
  to: string;
  label: string;
  is_current_incomplete: boolean;
}

export interface StatsBodyMetricSummary extends PeriodBodyMetricSummary {
  previous_value: number | null;
  previous_point_count: number;
}

export interface CalendarStats {
  period: StatsPeriod;
  current: StatsRange;
  previous: StatsRange;
  kpis: {
    workout_count: number;
    total_sets: number;
    total_volume: number;
    total_volume_unit: "kg" | "lb";
    duration_minutes: number;
  };
  deltas: {
    workout_count: number;
    total_sets: number;
    total_volume: number;
    duration_minutes: number;
  };
  volume_points: Array<{ date: string; label: string; volume: number; workouts: number }>;
  volume_auxiliary_points: Array<{ date: string; moving_average: number }>;
  checkins: Array<{ date: string; count: number; intensity: 0 | 1 | 2 | 3 }>;
  muscle_distribution: Array<{ muscle_id: MuscleGroupId | "other"; label: string; value: number; percent: number }>;
  body_summaries: StatsBodyMetricSummary[];
  performance: PerformanceSummary;
}

export async function getCalendarOverview(params: { from: string; to: string }): Promise<CalendarDayOverview[]> {
  const [snapshot, settings, notes] = await Promise.all([
    localRepository.getSnapshot(),
    localRepository.getSettings(),
    listEffectiveTimelineNotes({ from: params.from, to: params.to }),
  ]);
  const workouts = snapshot.workouts.filter((workout) => !workout.deletedAt && workout.date >= params.from && workout.date <= params.to);
  const exercises = snapshot.exercises;
  const templates = new Map(snapshot.templates.map((template) => [template.id, template]));
  const days = eachDayOfInterval({ start: parseDate(params.from), end: parseDate(params.to) }).map((date) => format(date, "yyyy-MM-dd"));
  const today = todayString();
  return days.map((date) => {
    const dayWorkouts = workouts.filter((workout) => workout.date === date);
    const dayNotes = notesForDate(notes, date, today);
    const workoutItems: CalendarWorkoutItem[] = dayWorkouts.map((workout) => {
      const template = workout.planTemplateId ? templates.get(workout.planTemplateId) : null;
      const categoryLabels = categoryLabelsForWorkout(workout, exercises);
      const labels = template
        ? [{ text: shortLabel(template.name), color_key: categoryColorKey(null) }]
        : categoryLabels;
      const metrics = calculateWorkoutMetrics(workout.exercises.map((exercise) => ({
        exerciseType: exercise.exerciseType,
        sets: exercise.sets,
      })), settings.weightUnit);
      return {
        id: workout.id,
        date: workout.date,
        template_name: template?.name || null,
        labels,
        summary: `${workout.exercises.length} 动作 · ${metrics.totalSets} 组${metrics.totalVolume > 0 ? ` · ${formatVolume(metrics.totalVolume, metrics.totalVolumeUnit)}` : ""}`,
      };
    });
    const labels = uniqueLabels(dayWorkouts.flatMap((workout) => categoryLabelsForWorkout(workout, exercises)));
    return {
      date,
      workouts: workoutItems,
      labels: labels.slice(0, 3),
      hidden_label_count: Math.max(0, labels.length - 3),
      note_count: dayNotes.length,
      notes: dayNotes,
    };
  });
}

export async function getCalendarStats(period: StatsPeriod, anchorDate: Date): Promise<CalendarStats> {
  const current = periodRange(period, anchorDate);
  const previous = previousRange(period, current.from);
  const [snapshot, settings, bodySummaries, previousBodySummaries, performance] = await Promise.all([
    localRepository.getSnapshot(),
    localRepository.getSettings(),
    getPeriodBodyMetricSummary(current),
    getPeriodBodyMetricSummary(previous),
    getPeriodPerformanceSummary(current),
  ]);
  const currentWorkouts = completedInRange(snapshot.workouts, current.from, current.to);
  const previousWorkouts = completedInRange(snapshot.workouts, previous.from, previous.to);
  const auxiliaryWorkouts = period === "year"
    ? completedInRange(snapshot.workouts, format(subDays(parseDate(current.from), 6), "yyyy-MM-dd"), current.to)
    : currentWorkouts;
  const kpis = aggregateWorkoutKpis(currentWorkouts, settings.weightUnit);
  const prevKpis = aggregateWorkoutKpis(previousWorkouts, settings.weightUnit);
  return {
    period,
    current,
    previous,
    kpis,
    deltas: {
      workout_count: kpis.workout_count - prevKpis.workout_count,
      total_sets: kpis.total_sets - prevKpis.total_sets,
      total_volume: kpis.total_volume - prevKpis.total_volume,
      duration_minutes: kpis.duration_minutes - prevKpis.duration_minutes,
    },
    volume_points: volumePoints(period, current, currentWorkouts, settings.weightUnit),
    volume_auxiliary_points: volumeAuxiliaryPoints(period, current, auxiliaryWorkouts, settings.weightUnit),
    checkins: checkinPoints(period, current, currentWorkouts),
    muscle_distribution: muscleDistribution(currentWorkouts, snapshot.exercises),
    body_summaries: attachPreviousBodySummaries(bodySummaries, previousBodySummaries),
    performance,
  };
}

function categoryLabelsForWorkout(workout: { exercises: Array<{ exerciseId: string }> }, exercises: ExerciseDoc[]): CalendarDayLabel[] {
  const labels: CalendarDayLabel[] = [];
  for (const item of workout.exercises) {
    const resolved = resolveExerciseId(item.exerciseId, exercises);
    const exercise = exercises.find((candidate) => candidate.id === (resolved.status === "resolved" ? resolved.resolvedId : item.exerciseId));
    if (!exercise) continue;
    labels.push({
      text: categoryShortLabel(exercise.category),
      color_key: categoryColorKey(exercise.category),
    });
  }
  return uniqueLabels(labels);
}

function notesForDate(notes: TimelineNote[], date: string, today: string): CalendarDayNote[] {
  if (date > today) return [];
  return notes
    .filter((note) => note.start_date <= date && (note.end_date ?? today) >= date)
    .map((note) => ({
      id: note.id,
      content: note.content,
      range_type: note.range_type,
      start_date: note.start_date,
      end_date: note.end_date,
    }));
}

function attachPreviousBodySummaries(current: PeriodBodyMetricSummary[], previous: PeriodBodyMetricSummary[]): StatsBodyMetricSummary[] {
  const previousByKey = new Map(previous.map((item) => [item.key, item]));
  return current.map((item) => {
    const previousItem = previousByKey.get(item.key);
    return {
      ...item,
      previous_value: previousItem?.last_value ?? null,
      previous_point_count: previousItem?.point_count ?? 0,
    };
  });
}

const CATEGORY_SHORT_LABELS: Record<string, string> = {
  chest: "胸部",
  back: "背部",
  legs: "腿部",
  shoulders: "肩部",
  arms: "手臂",
  core: "核心",
  cardio: "有氧",
  stretch: "拉伸",
};

function categoryShortLabel(category: string): string {
  return CATEGORY_SHORT_LABELS[category] || shortLabel(CATEGORY_LABELS[category] || category);
}

function uniqueLabels(labels: CalendarDayLabel[]): CalendarDayLabel[] {
  const seen = new Set<string>();
  const result: CalendarDayLabel[] = [];
  for (const label of labels) {
    const key = `${label.text}:${label.color_key}`;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(label);
  }
  return result;
}

function aggregateWorkoutKpis(workouts: WorkoutDoc[], weightUnit: "kg" | "lb") {
  const metrics = calculateWorkoutMetrics(workouts.flatMap((workout) => workout.exercises.map((exercise) => ({
    exerciseType: exercise.exerciseType,
    sets: exercise.sets,
  }))), weightUnit);
  const durationMinutes = workouts.reduce((sum, workout) => {
    if (!workout.startTime || !workout.endTime) return sum;
    return sum + Math.max(0, Math.round((new Date(workout.endTime).getTime() - new Date(workout.startTime).getTime()) / 60_000));
  }, 0);
  return {
    workout_count: workouts.length,
    total_sets: metrics.totalSets,
    total_volume: metrics.totalVolume,
    total_volume_unit: metrics.totalVolumeUnit,
    duration_minutes: durationMinutes,
  };
}

function volumePoints(period: StatsPeriod, range: StatsRange, workouts: WorkoutDoc[], weightUnit: "kg" | "lb"): CalendarStats["volume_points"] {
  if (period === "year") {
    return Array.from({ length: 12 }, (_, monthIndex) => {
      const monthStart = new Date(parseDate(range.from).getFullYear(), monthIndex, 1);
      const monthEnd = endOfMonth(monthStart);
      const from = format(monthStart, "yyyy-MM-dd");
      const to = format(monthEnd, "yyyy-MM-dd");
      const monthWorkouts = workouts.filter((workout) => workout.date >= from && workout.date <= to);
      const kpis = aggregateWorkoutKpis(monthWorkouts, weightUnit);
      return { date: from, label: `${monthIndex + 1}月`, volume: kpis.total_volume / monthEnd.getDate(), workouts: monthWorkouts.length };
    });
  }
  const days = eachDayOfInterval({ start: parseDate(range.from), end: parseDate(range.to) }).map((date) => format(date, "yyyy-MM-dd"));
  return days.map((date) => {
    const dayWorkouts = workouts.filter((workout) => workout.date === date);
    return {
      date,
      label: period === "week" ? date.slice(5) : String(Number(date.slice(8))),
      volume: aggregateWorkoutKpis(dayWorkouts, weightUnit).total_volume,
      workouts: dayWorkouts.length,
    };
  });
}

function volumeAuxiliaryPoints(period: StatsPeriod, range: StatsRange, workouts: WorkoutDoc[], weightUnit: "kg" | "lb"): CalendarStats["volume_auxiliary_points"] {
  if (period !== "year") return [];
  const sourceStart = format(subDays(parseDate(range.from), 6), "yyyy-MM-dd");
  const dates = eachDayOfInterval({ start: parseDate(sourceStart), end: parseDate(range.to) }).map((date) => format(date, "yyyy-MM-dd"));
  const dailyVolumes = new Map(dates.map((date) => {
    const dayWorkouts = workouts.filter((workout) => workout.date === date);
    return [date, aggregateWorkoutKpis(dayWorkouts, weightUnit).total_volume];
  }));
  return dates.slice(6).map((date, index) => {
    const windowStart = index;
    const movingAverage = dates
      .slice(windowStart, windowStart + 7)
      .reduce((sum, windowDate) => sum + (dailyVolumes.get(windowDate) ?? 0), 0) / 7;
    return { date, moving_average: movingAverage };
  });
}

function checkinPoints(_period: StatsPeriod, range: StatsRange, workouts: WorkoutDoc[]): CalendarStats["checkins"] {
  const days = eachDayOfInterval({ start: parseDate(range.from), end: parseDate(range.to) }).map((date) => format(date, "yyyy-MM-dd"));
  return days.map((date) => {
    const count = workouts.filter((workout) => workout.date === date).length;
    return { date, count, intensity: count === 0 ? 0 : count === 1 ? 1 : count === 2 ? 2 : 3 };
  });
}

function muscleDistribution(workouts: WorkoutDoc[], exercises: ExerciseDoc[]): CalendarStats["muscle_distribution"] {
  const weights = new Map<MuscleGroupId, number>();
  for (const workout of workouts) {
    for (const workoutExercise of workout.exercises) {
      const workingSetCount = workoutExercise.sets.filter((set) => !set.isWarmup).length;
      if (workingSetCount === 0) continue;
      const resolved = resolveExerciseId(workoutExercise.exerciseId, exercises);
      const exercise = exercises.find((item) => item.id === (resolved.status === "resolved" ? resolved.resolvedId : workoutExercise.exerciseId));
      if (!exercise) continue;
      for (const muscle of exercise.primaryMuscleGroupIds) weights.set(muscle, (weights.get(muscle) || 0) + workingSetCount);
      for (const muscle of exercise.secondaryMuscleGroupIds) weights.set(muscle, (weights.get(muscle) || 0) + workingSetCount * 0.5);
    }
  }
  const total = [...weights.values()].reduce((sum, value) => sum + value, 0);
  if (total === 0) return [];
  const sorted = [...weights.entries()].sort((left, right) => right[1] - left[1]);
  const top = sorted.slice(0, 8);
  const other = sorted.slice(8).reduce((sum, [, value]) => sum + value, 0);
  const result = top.map(([muscle, value]) => ({
    muscle_id: muscle,
    label: MUSCLE_GROUP_LABELS[muscle],
    value,
    percent: value / total,
  }));
  if (other > 0) result.push({ muscle_id: "other", label: "其他", value: other, percent: other / total });
  return result;
}

function completedInRange(workouts: WorkoutDoc[], from: string, to: string) {
  return workouts.filter((workout) => !workout.deletedAt && workout.endTime != null && workout.date >= from && workout.date <= to);
}

function periodRange(period: StatsPeriod, anchorDate: Date): StatsRange {
  const start = period === "week" ? startOfWeek(anchorDate, { weekStartsOn: 1 }) : period === "month" ? startOfMonth(anchorDate) : startOfYear(anchorDate);
  const end = period === "week" ? endOfWeek(anchorDate, { weekStartsOn: 1 }) : period === "month" ? endOfMonth(anchorDate) : endOfYear(anchorDate);
  const today = new Date();
  const clippedEnd = end > today ? today : end;
  return {
    from: format(start, "yyyy-MM-dd"),
    to: format(clippedEnd, "yyyy-MM-dd"),
    label: period === "week" ? `${format(start, "M/d")} - ${format(clippedEnd, "M/d")}` : period === "month" ? format(start, "yyyy年M月") : format(start, "yyyy年"),
    is_current_incomplete: clippedEnd < end,
  };
}

function previousRange(period: StatsPeriod, currentFrom: string): StatsRange {
  const currentStart = parseDate(currentFrom);
  const anchor = period === "week" ? subWeeks(currentStart, 1) : period === "month" ? subMonths(currentStart, 1) : subYears(currentStart, 1);
  const start = period === "week" ? startOfWeek(anchor, { weekStartsOn: 1 }) : period === "month" ? startOfMonth(anchor) : startOfYear(anchor);
  const end = period === "week" ? addDays(start, 6) : period === "month" ? endOfMonth(start) : endOfYear(start);
  return {
    from: format(start, "yyyy-MM-dd"),
    to: format(end, "yyyy-MM-dd"),
    label: period === "week" ? `${format(start, "M/d")} - ${format(end, "M/d")}` : period === "month" ? format(start, "yyyy年M月") : format(start, "yyyy年"),
    is_current_incomplete: false,
  };
}

function parseDate(value: string): Date {
  return new Date(`${value}T00:00:00`);
}

function shortLabel(value: string): string {
  return value.length > 4 ? value.slice(0, 4) : value;
}

function todayString(): string {
  return format(new Date(), "yyyy-MM-dd");
}

import { formatVolume } from "@/core/workoutMetrics";
import { getWorkoutPerformanceRecords } from "@/services/performance";
import { getWorkout, shareWorkout } from "@/services/workout";
import type { WorkoutExercise, WorkoutSet } from "@/types";

export interface WorkoutShareImage {
  data_url: string;
  width: number;
  height: number;
  file_name: string;
}

export async function prepareWorkoutShareImage(workoutId: string, options: { show_details: boolean }): Promise<WorkoutShareImage> {
  const [data, workout, performance] = await Promise.all([shareWorkout(workoutId), getWorkout(workoutId), getWorkoutPerformanceRecords(workoutId)]);
  const width = 1080;
  const lineHeight = 42;
  const detailLines = data.exercises.reduce((sum, _exercise, index) => sum + 1 + (options.show_details ? workout.exercises[index]?.sets.length || 0 : 0), 0);
  const performanceLines = performance.length > 0 ? Math.min(3, performance.length) + 1 : 0;
  const height = 360 + detailLines * lineHeight + performanceLines * lineHeight + (data.note ? 82 : 0);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("当前环境无法生成图片");
  const theme = themeColors();
  fill(ctx, 0, 0, width, height, theme.bg);
  fill(ctx, 48, 48, width - 96, height - 96, theme.surface, 28);
  ctx.fillStyle = theme.primary;
  ctx.font = "700 34px sans-serif";
  ctx.fillText("IronLog", 92, 112);
  ctx.fillStyle = theme.muted;
  ctx.font = "400 26px sans-serif";
  ctx.fillText(data.date, 92, 154);

  const metric = data.total_volume > 0
    ? formatVolume(data.total_volume, data.total_volume_unit)
    : data.total_distance_m > 0
    ? `${Math.round(data.total_distance_m)} m`
    : `${data.total_duration_sec} s`;
  const summary = [
    ["动作", String(data.exercise_count)],
    ["总组数", String(data.total_sets)],
    ["容量/距离", metric],
    ["时长", data.duration_minutes ? `${data.duration_minutes} 分钟` : "—"],
  ];
  let x = 92;
  for (const [label, value] of summary) {
    fill(ctx, x, 190, 205, 104, theme.surface2, 20);
    ctx.fillStyle = theme.text;
    ctx.font = "700 30px sans-serif";
    ctx.fillText(value, x + 24, 234);
    ctx.fillStyle = theme.muted;
    ctx.font = "400 22px sans-serif";
    ctx.fillText(label, x + 24, 266);
    x += 225;
  }

  let y = 345;
  if (performance.length > 0) {
    ctx.fillStyle = theme.primary;
    ctx.font = "700 26px sans-serif";
    ctx.fillText(`本次刷新 ${performance.length} 项记录`, 92, y);
    y += lineHeight;
    ctx.fillStyle = theme.text;
    ctx.font = "400 24px sans-serif";
    for (const record of performance.slice(0, 3)) {
      ctx.fillText(`• ${record.exercise_name || "动作"} ${record.metric_label}`, 108, y);
      y += lineHeight;
    }
  }

  ctx.fillStyle = theme.text;
  ctx.font = "700 28px sans-serif";
  ctx.fillText(options.show_details ? "训练明细" : "动作摘要", 92, y);
  y += lineHeight;
  ctx.font = "400 24px sans-serif";
  for (const [index, exercise] of data.exercises.entries()) {
    const value = exercise.type === "cardio"
      ? `${Math.round(exercise.distance_m)} m · ${exercise.duration_sec}s`
      : exercise.type === "static_hold"
      ? `${exercise.duration_sec}s`
      : exercise.type === "reps_only"
      ? `${exercise.reps} 次`
      : formatVolume(exercise.volume, data.total_volume_unit);
    ctx.fillStyle = theme.text;
    ctx.fillText(`${exercise.name}`, 92, y);
    ctx.fillStyle = theme.muted;
    ctx.fillText(`${exercise.sets} 组 · ${value}`, 650, y);
    y += lineHeight;
    if (options.show_details) {
      const fullExercise = workout.exercises[index];
      for (const set of fullExercise?.sets || []) {
        ctx.fillStyle = theme.muted;
        ctx.fillText(formatSetDetail(fullExercise, set), 116, y, width - 232);
        y += lineHeight;
      }
    }
  }
  if (data.note) {
    fill(ctx, 92, y, width - 184, 62, theme.surface2, 18);
    ctx.fillStyle = theme.text;
    ctx.font = "400 24px sans-serif";
    ctx.fillText(`备注：${data.note.slice(0, 42)}`, 116, y + 40);
  }
  return {
    data_url: canvas.toDataURL("image/png"),
    width,
    height,
    file_name: `ironlog-workout-${data.date}.png`,
  };
}

export async function dataUrlToFile(dataUrl: string, fileName: string): Promise<File> {
  const res = await fetch(dataUrl);
  const blob = await res.blob();
  return new File([blob], fileName, { type: "image/png" });
}

function themeColors() {
  const root = getComputedStyle(document.documentElement);
  return {
    bg: root.getPropertyValue("--color-bg").trim() || "#f1f5f9",
    surface: root.getPropertyValue("--color-surface").trim() || "#ffffff",
    surface2: root.getPropertyValue("--color-surface-2").trim() || "#f8fafc",
    text: root.getPropertyValue("--color-text").trim() || "#0f172a",
    muted: root.getPropertyValue("--color-text-secondary").trim() || "#64748b",
    primary: root.getPropertyValue("--color-primary").trim() || "#10b981",
  };
}

function fill(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, color: string, radius = 0) {
  ctx.fillStyle = color;
  if (radius <= 0) {
    ctx.fillRect(x, y, width, height);
    return;
  }
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, radius);
  ctx.fill();
}

function formatSetDetail(exercise: WorkoutExercise, set: WorkoutSet): string {
  const prefix = `#${set.set_number}${set.is_warmup ? " 热身" : ""}`;
  const suffix = [
    set.rpe == null ? null : `RPE ${set.rpe}`,
    set.rest_seconds == null ? null : `休 ${set.rest_seconds}s`,
    set.is_failure ? "力竭" : null,
  ].filter(Boolean).join(" · ");
  const main = exercise.exercise_type === "strength"
    ? `${formatNumber(set.weight)} ${set.unit} x ${formatNumber(set.reps)}`
    : exercise.exercise_type === "cardio"
    ? `${formatNumber(set.distance_m)} m · ${formatNumber(set.duration_sec)}s`
    : exercise.exercise_type === "static_hold"
    ? `${formatNumber(set.duration_sec)}s`
    : `${formatNumber(set.reps)} 次`;
  return `${prefix}  ${main}${suffix ? ` · ${suffix}` : ""}`;
}

function formatNumber(value: number | null | undefined): string {
  return value == null ? "-" : String(Math.round(value * 10) / 10);
}

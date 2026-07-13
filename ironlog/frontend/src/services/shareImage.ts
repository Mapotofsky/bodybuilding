import { formatVolume } from "@/core/workoutMetrics";
import { savePngImage } from "@/platform/shareImageSave";
import { getWorkoutPerformanceRecords } from "@/services/performance";
import { getWorkout, shareWorkout } from "@/services/workout";
import type { WorkoutExercise, WorkoutSet } from "@/types";
import { formatWorkoutPrimaryMetric } from "@/utils/workoutPresentation";

export interface WorkoutShareImage {
  data_url: string;
  width: number;
  height: number;
  file_name: string;
}

export async function prepareWorkoutShareImage(workoutId: string, options: { show_details: boolean }): Promise<WorkoutShareImage> {
  const [data, workout, performance] = await Promise.all([shareWorkout(workoutId), getWorkout(workoutId), getWorkoutPerformanceRecords(workoutId)]);
  const width = 1080;
  const lineHeight = 50;
  const detailLines = data.exercises.reduce((sum, _exercise, index) => sum + 1 + (options.show_details ? workout.exercises[index]?.sets.length || 0 : 0), 0);
  const performanceLines = performance.length > 0 ? Math.min(3, performance.length) + 1 : 0;
  const height = 430 + detailLines * lineHeight + performanceLines * lineHeight + (data.note ? 92 : 0);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("当前环境无法生成图片");
  const theme = themeColors();
  fill(ctx, 0, 0, width, height, theme.bg);
  fill(ctx, 48, 48, width - 96, height - 96, theme.surface, 28);
  fill(ctx, 48, 48, 14, height - 96, theme.primary, 7);
  drawPlateMark(ctx, 900, 112, theme);
  ctx.fillStyle = theme.muted;
  ctx.font = "600 21px sans-serif";
  ctx.fillText("IRONLOG  /  训练日志", 92, 96);
  ctx.fillStyle = theme.text;
  ctx.font = "800 48px sans-serif";
  ctx.fillText(data.date, 92, 154);
  ctx.fillStyle = theme.primary;
  fill(ctx, 92, 176, width - 184, 4, theme.primary, 2);

  const primaryMetric = formatWorkoutPrimaryMetric(data.exercises.map((exercise) => exercise.type), {
    totalSets: data.total_sets,
    totalVolume: data.total_volume,
    totalVolumeUnit: data.total_volume_unit,
    totalDistanceM: data.total_distance_m,
    totalDurationSec: data.total_duration_sec,
    totalReps: data.exercises.reduce((sum, exercise) => sum + exercise.reps, 0),
  });
  const summary = [
    ["动作", String(data.exercise_count)],
    ["总组数", String(data.total_sets)],
    [primaryMetric.label, primaryMetric.value],
    ["时长", data.duration_minutes ? `${data.duration_minutes} 分钟` : "—"],
  ];
  let x = 92;
  for (const [label, value] of summary) {
    fill(ctx, x, 204, 205, 104, theme.surface2, 18);
    ctx.fillStyle = theme.text;
    ctx.font = "750 28px sans-serif";
    ctx.fillText(value, x + 22, 248, 165);
    ctx.fillStyle = theme.muted;
    ctx.font = "400 22px sans-serif";
    ctx.fillText(label, x + 22, 280);
    x += 225;
  }

  let y = 364;
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
  for (const [index, exercise] of data.exercises.entries()) {
    const value = exercise.type === "cardio"
      ? `${Math.round(exercise.distance_m)} m · ${exercise.duration_sec}s`
      : exercise.type === "static_hold"
      ? `${exercise.duration_sec}s`
      : exercise.type === "reps_only"
      ? `${exercise.reps} 次`
      : formatVolume(exercise.volume, data.total_volume_unit);
    fill(ctx, 92, y - 35, width - 184, 44, theme.surface2, 14);
    fill(ctx, 106, y - 24, 22, 22, theme.primary, 11);
    ctx.fillStyle = theme.surface;
    ctx.font = "700 15px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(String(index + 1), 117, y - 8);
    ctx.textAlign = "left";
    ctx.fillStyle = theme.text;
    ctx.font = "600 23px sans-serif";
    ctx.fillText(`${exercise.name}`, 144, y - 7, 455);
    ctx.fillStyle = theme.muted;
    ctx.font = "400 21px sans-serif";
    ctx.fillText(`${exercise.sets} 组 · ${value}`, 650, y - 7, 310);
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

export async function saveWorkoutShareImage(image: WorkoutShareImage): Promise<"gallery" | "download"> {
  const result = await savePngImage(image.data_url, image.file_name);
  return result.destination;
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
    border: root.getPropertyValue("--color-border").trim() || "#e2e8f0",
  };
}

function drawPlateMark(ctx: CanvasRenderingContext2D, x: number, y: number, theme: ReturnType<typeof themeColors>) {
  ctx.save();
  ctx.strokeStyle = theme.border;
  ctx.lineWidth = 10;
  ctx.beginPath();
  ctx.arc(x, y, 44, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = theme.primary;
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.arc(x, y, 25, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = theme.primary;
  ctx.beginPath();
  ctx.arc(x, y, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
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

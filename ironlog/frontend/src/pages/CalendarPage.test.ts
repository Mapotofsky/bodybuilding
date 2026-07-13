import { describe, expect, it } from "vitest";
import type { CalendarStats } from "@/services/calendarStats";
import { buildYearVolumeChartData, formatDurationHours, formatSignedDurationHours, getVolumeTooltipContent } from "./CalendarPage";

describe("calendar year volume chart interaction", () => {
  it("shows training duration and its period delta in hours with one decimal", () => {
    expect(formatDurationHours(90)).toBe("1.5");
    expect(formatSignedDurationHours(30)).toBe("+0.5 小时");
    expect(formatSignedDurationHours(-30)).toBe("-0.5 小时");
  });

  it("formats tooltip dates by period", () => {
    expect(getVolumeTooltipContent(true, { date: "2025-01-02", volume: 12 }, "week", "kg")).toMatchObject({
      date: "2025-01-02",
      label: "容量",
    });
    expect(getVolumeTooltipContent(true, { date: "2025-01-02", volume: 12 }, "month", "kg")).toMatchObject({
      date: "2025-01-02",
      label: "容量",
    });
    expect(getVolumeTooltipContent(true, { date: "2025-01-01", volume: 12 }, "year", "kg")).toMatchObject({
      date: "2025-01",
      label: "月日均容量",
    });
  });

  it("exposes tooltips only for the twelve monthly daily-average points", () => {
    const stats = yearStats();
    const chartData = buildYearVolumeChartData(stats);
    const tooltipPoints = chartData.interactivePoints.filter((point) => getVolumeTooltipContent(true, point, "year", "kg") != null);
    const auxiliaryOnlyPoint = chartData.auxiliaryPoints.find((point) => point.date === "2025-01-02");

    expect(chartData.interactivePoints).toHaveLength(12);
    expect(chartData.auxiliaryPoints).toHaveLength(3);
    expect(chartData.auxiliaryPoints).not.toEqual(expect.arrayContaining([expect.objectContaining({ volume: expect.any(Number) })]));
    expect(tooltipPoints).toHaveLength(12);
    expect(getVolumeTooltipContent(true, auxiliaryOnlyPoint, "year", "kg")).toBeNull();
    expect(getVolumeTooltipContent(true, chartData.interactivePoints.find((point) => point.date === "2025-01-01"), "year", "kg")).toEqual({
      date: "2025-01",
      label: "月日均容量",
      value: "100.0 kg·次",
    });
  });
});

function yearStats(): CalendarStats {
  return {
    period: "year",
    current: { from: "2025-01-01", to: "2025-06-15", label: "2025年", is_current_incomplete: true },
    previous: { from: "2024-01-01", to: "2024-12-31", label: "2024年", is_current_incomplete: false },
    kpis: { workout_count: 1, total_sets: 1, total_volume: 3100, total_volume_unit: "kg", duration_minutes: 60 },
    deltas: { workout_count: 1, total_sets: 1, total_volume: 3100, duration_minutes: 30 },
    volume_points: Array.from({ length: 12 }, (_, index) => ({
      date: `2025-${String(index + 1).padStart(2, "0")}-01`,
      label: `${index + 1}月`,
      volume: index === 0 ? 100 : 0,
      workouts: index === 0 ? 1 : 0,
    })),
    volume_auxiliary_points: [
      { date: "2025-01-01", moving_average: 0 },
      { date: "2025-01-02", moving_average: 10 },
      { date: "2025-01-03", moving_average: 20 },
    ],
    checkins: [],
    muscle_distribution: [],
    body_summaries: [],
    performance: { true_pr_count: 0, rpe_adjusted_rm_count: 0, top_improvements: [], recent_records: [] },
  };
}

import { afterEach, describe, expect, it, vi } from "vitest";
import { makeEmptySnapshot } from "@/core/migrations";
import type { DataSnapshot, WorkoutDoc } from "@/core/models";
import { localRepository } from "@/repositories/localJsonRepository";

vi.mock("@/services/bodyMetrics", () => ({
  getPeriodBodyMetricSummary: vi.fn(async () => []),
}));

vi.mock("@/services/performance", () => ({
  getPeriodPerformanceSummary: vi.fn(async () => ({
    true_pr_count: 7,
    rpe_adjusted_rm_count: 3,
    top_improvements: [],
    recent_records: [],
  })),
}));

import { getCalendarStats } from "./calendarStats";

describe("calendar year volume series", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("uses every natural day as the monthly daily-average denominator", async () => {
    mockSnapshot([
      strengthWorkout("current-january", "2025-01-15", 3100),
    ]);

    const stats = await getCalendarStats("year", new Date("2025-06-15T12:00:00"));

    expect(stats.volume_points[0]).toMatchObject({ date: "2025-01-01", volume: 100 });
    expect(stats.kpis.total_volume).toBe(3100);
  });

  it("keeps the fixed seven-day moving average in a separate display-only series", async () => {
    mockSnapshot([
      strengthWorkout("previous-december", "2024-12-31", 700),
      strengthWorkout("previous-year", "2024-01-10", 1000),
      strengthWorkout("current-january", "2025-01-15", 3100),
    ]);

    const stats = await getCalendarStats("year", new Date("2025-06-15T12:00:00"));
    const januaryFirst = stats.volume_auxiliary_points.find((point) => point.date === "2025-01-01");
    const januaryFifteenth = stats.volume_auxiliary_points.find((point) => point.date === "2025-01-15");

    expect(januaryFirst?.moving_average).toBe(100);
    expect(januaryFifteenth?.moving_average).toBeCloseTo(3100 / 7);
    expect(stats.kpis.total_volume).toBe(3100);
    expect(stats.deltas.total_volume).toBe(1400);
    expect(stats.performance).toMatchObject({ true_pr_count: 7, rpe_adjusted_rm_count: 3 });
  });
});

describe("calendar period comparison", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("includes the missing training-duration difference beside the other KPI differences", async () => {
    mockSnapshot([
      strengthWorkout("previous-month", "2025-05-15", 100, 60),
      strengthWorkout("current-month", "2025-06-15", 100, 90),
    ]);

    const stats = await getCalendarStats("month", new Date("2025-06-20T12:00:00"));

    expect(stats.kpis.duration_minutes).toBe(90);
    expect(stats.deltas.duration_minutes).toBe(30);
  });
});

function mockSnapshot(workouts: WorkoutDoc[]): void {
  const snapshot: DataSnapshot = makeEmptySnapshot("calendar-stats-test");
  snapshot.workouts = workouts;
  snapshot.settings.weightUnit = "kg";
  vi.spyOn(localRepository, "getSnapshot").mockResolvedValue(snapshot);
  vi.spyOn(localRepository, "getSettings").mockResolvedValue(snapshot.settings);
}

function strengthWorkout(id: string, date: string, volume: number, durationMinutes = 60): WorkoutDoc {
  const timestamp = `${date}T08:00:00.000Z`;
  return {
    id,
    date,
    startTime: timestamp,
    endTime: new Date(new Date(timestamp).getTime() + durationMinutes * 60_000).toISOString(),
    planTemplateId: null,
    note: null,
    mood: null,
    exercises: [{
      id: `${id}-exercise`,
      exerciseId: "ex-bench-press",
      exerciseType: "strength",
      sortOrder: 0,
      supersetGroup: null,
      sets: [{
        id: `${id}-set`,
        setNumber: 1,
        weight: volume,
        reps: 1,
        unit: "kg",
        durationSec: null,
        distanceM: null,
        rpe: null,
        isWarmup: false,
        isFailure: false,
        restSeconds: null,
      }],
    }],
    createdAt: timestamp,
    updatedAt: timestamp,
    deletedAt: null,
    schemaVersion: 3,
  };
}

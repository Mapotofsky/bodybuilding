import { describe, expect, it, vi } from "vitest";
import { elapsedBetweenMs, elapsedSeconds, fromLocalDateTime, toLocalDateTime } from "./workoutTime";

describe("workout time boundaries", () => {
  it("round trips UTC instants in the device's east-eight local time, including midnight", () => {
    vi.stubEnv("TZ", "Asia/Shanghai");
    try {
      const start = "2026-08-21T14:55:19.000Z";
      const end = "2026-08-22T08:10:48.000Z";
      expect(toLocalDateTime(start)).toBe("2026-08-21T22:55");
      expect(toLocalDateTime(end)).toBe("2026-08-22T16:10");
      expect(fromLocalDateTime(toLocalDateTime(start), start)).toBe(start);
      expect(fromLocalDateTime(toLocalDateTime(end), end)).toBe(end);
      let reopened = start;
      for (let save = 0; save < 3; save += 1) reopened = fromLocalDateTime(toLocalDateTime(reopened), reopened)!;
      expect(reopened).toBe(start);
      expect(fromLocalDateTime("2026-08-22T00:05", start)).toBe("2026-08-21T16:05:00.000Z");
      expect(new Date(end).getTime() - new Date(start).getTime()).toBe(62_129_000);
    } finally { vi.unstubAllEnvs(); }
  });

  it("uses clock boundaries after paused callbacks and keeps rest seconds aligned with the stop time", () => {
    const start = "2026-08-29T06:25:19.000Z";
    const restStart = Date.parse(start) + 30_000;
    const afterBackground = restStart + 95_750;
    expect(elapsedSeconds(start, afterBackground)).toBe(125);
    expect(elapsedBetweenMs(restStart, afterBackground)).toBe(95);
    expect(new Date(afterBackground).getTime() - new Date(start).getTime()).toBe(125_750);
  });
});

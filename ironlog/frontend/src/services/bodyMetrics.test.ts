import { describe, expect, it } from "vitest";
import { deriveCurrentBodyMetrics } from "./bodyMetrics";
import { emptyBodyMeasurements } from "@/core/migrations";
import type { BodyMetricDoc } from "@/core/models";

describe("body metric derivation", () => {
  it("derives current values independently per metric", () => {
    const records: BodyMetricDoc[] = [
      metric("m1", "2026-06-01T08:00:00.000Z", { weightKg: 80 }),
      metric("m2", "2026-06-02T08:00:00.000Z", { waist: 86 }),
      metric("m3", "2026-06-03T08:00:00.000Z", { weightKg: 79 }),
    ];

    const current = deriveCurrentBodyMetrics(records, "kg");

    expect(current.weight.value).toBe(79);
    expect(current.weight.source_id).toBe("m3");
    expect(current.measurements_cm.waist.value).toBe(86);
    expect(current.measurements_cm.waist.source_id).toBe("m2");
  });

  it("ignores tombstones and future records", () => {
    const records: BodyMetricDoc[] = [
      { ...metric("old", "2026-06-01T08:00:00.000Z", { weightKg: 80 }), deletedAt: "2026-06-02T00:00:00.000Z" },
      metric("future", "2999-06-01T08:00:00.000Z", { weightKg: 70 }),
    ];

    expect(deriveCurrentBodyMetrics(records, "kg").weight.value).toBeNull();
  });
});

function metric(id: string, recordedAt: string, values: { weightKg?: number; waist?: number }): BodyMetricDoc {
  const measurements = emptyBodyMeasurements();
  measurements.waist = values.waist ?? null;
  return {
    id,
    recordedAt,
    heightCm: null,
    weightKg: values.weightKg ?? null,
    bodyFatPercent: null,
    measurementsCm: measurements,
    note: null,
    createdAt: recordedAt,
    updatedAt: recordedAt,
    deletedAt: null,
    schemaVersion: 4,
  };
}

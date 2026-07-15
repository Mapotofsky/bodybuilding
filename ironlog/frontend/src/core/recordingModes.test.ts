import { describe, expect, it } from "vitest";
import type { RecordingMode } from "./models";
import {
  effectiveLoadKg,
  getRecordingModeSpec,
  KG_PER_LB,
  RECORDING_MODE_SPECS,
  validateRecordingConfig,
} from "./recordingModes";

describe("recording mode registry", () => {
  it("defines one exhaustive, legal field specification for all six modes", () => {
    const modes: RecordingMode[] = [
      "weight_reps", "reps", "duration", "distance_duration", "weight_duration", "weight_distance_duration",
    ];
    expect(Object.keys(RECORDING_MODE_SPECS)).toEqual(modes);
    expect(new Set(modes.map((mode) => getRecordingModeSpec(mode))).size).toBe(6);
    expect(modes.map((mode) => ({
      mode,
      fields: getRecordingModeSpec(mode).fields,
      requiredAll: getRecordingModeSpec(mode).requiredAll,
      requiredOneOf: getRecordingModeSpec(mode).requiredOneOf,
      loadBases: getRecordingModeSpec(mode).allowedLoadBases,
      loadDirections: getRecordingModeSpec(mode).allowedLoadDirections,
      rates: getRecordingModeSpec(mode).supportedRateMetrics,
    }))).toEqual([
      { mode: "weight_reps", fields: ["weight", "reps"], requiredAll: ["weight", "reps"], requiredOneOf: [], loadBases: ["total", "per_hand"], loadDirections: ["higher_better", "lower_better"], rates: ["none"] },
      { mode: "reps", fields: ["reps"], requiredAll: ["reps"], requiredOneOf: [], loadBases: [], loadDirections: [], rates: ["none"] },
      { mode: "duration", fields: ["durationSec"], requiredAll: ["durationSec"], requiredOneOf: [], loadBases: [], loadDirections: [], rates: ["none"] },
      { mode: "distance_duration", fields: ["distanceM", "durationSec"], requiredAll: [], requiredOneOf: [["distanceM", "durationSec"]], loadBases: [], loadDirections: [], rates: ["none", "distance_per_time"] },
      { mode: "weight_duration", fields: ["weight", "durationSec"], requiredAll: ["weight", "durationSec"], requiredOneOf: [], loadBases: ["total", "per_hand"], loadDirections: ["higher_better", "lower_better"], rates: ["none"] },
      { mode: "weight_distance_duration", fields: ["weight", "distanceM", "durationSec"], requiredAll: ["weight"], requiredOneOf: [["distanceM", "durationSec"]], loadBases: ["total", "per_hand"], loadDirections: ["higher_better", "lower_better"], rates: ["none", "distance_per_time", "load_distance_per_time"] },
    ]);
    expect(() => getRecordingModeSpec("unknown" as RecordingMode)).toThrow("记录方式无效");
  });

  it("rejects incompatible load and rate combinations", () => {
    expect(() => validateRecordingConfig({ recordingMode: "reps", loadBasis: "total", loadDirection: null, rateMetric: "none" })).toThrow();
    expect(() => validateRecordingConfig({ recordingMode: "weight_reps", loadBasis: null, loadDirection: "higher_better", rateMetric: "none" })).toThrow();
    expect(() => validateRecordingConfig({ recordingMode: "weight_duration", loadBasis: "total", loadDirection: "higher_better", rateMetric: "distance_per_time" })).toThrow();
    expect(() => validateRecordingConfig({ recordingMode: "distance_duration", loadBasis: null, loadDirection: null, rateMetric: "load_distance_per_time" })).toThrow();
  });

  it("applies unit conversion before the explicit per-hand multiplier and ignores equipment", () => {
    expect(effectiveLoadKg(20, "kg", "total")).toBe(20);
    expect(effectiveLoadKg(20, "kg", "per_hand")).toBe(40);
    expect(effectiveLoadKg(20 / KG_PER_LB, "lb", "per_hand")).toBeCloseTo(40, 8);
  });
});

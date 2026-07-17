import { describe, expect, it } from "vitest";
import type { RecordingMode } from "./models";
import {
  getRecordingModeSpec,
  isCountBasis,
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
    expect(() => validateRecordingConfig({ recordingMode: "reps", loadBasis: "total", countBasis: "whole_set", loadDirection: null, rateMetric: "none" })).toThrow();
    expect(() => validateRecordingConfig({ recordingMode: "weight_reps", loadBasis: null, countBasis: "whole_set", loadDirection: "higher_better", rateMetric: "none" })).toThrow();
    expect(() => validateRecordingConfig({ recordingMode: "weight_duration", loadBasis: "total", countBasis: "whole_set", loadDirection: "higher_better", rateMetric: "distance_per_time" })).toThrow();
    expect(() => validateRecordingConfig({ recordingMode: "distance_duration", loadBasis: null, countBasis: "whole_set", loadDirection: null, rateMetric: "load_distance_per_time" })).toThrow();
  });

  it("requires one explicit count basis for every recording mode", () => {
    expect(isCountBasis("whole_set")).toBe(true);
    expect(isCountBasis("per_side")).toBe(true);
    expect(isCountBasis("per_hand")).toBe(false);
    expect(() => validateRecordingConfig({
      recordingMode: "weight_reps",
      loadBasis: "per_hand",
      countBasis: "per_hand" as never,
      loadDirection: "higher_better",
      rateMetric: "none",
    })).toThrow("计数口径");
  });
});

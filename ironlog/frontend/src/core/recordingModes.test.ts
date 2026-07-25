import { describe, expect, it } from "vitest";
import type { RecordingMode } from "./models";
import {
  getRecordingModeSpec,
  isCountBasis,
  RECORDING_MODE_SPECS,
  validateRecordingConfig,
  validateWorkoutSetForMode,
} from "./recordingModes";

describe("recording mode registry", () => {
  it("defines one exhaustive, legal field specification for all seven modes", () => {
    const modes: RecordingMode[] = [
      "weight_reps", "reps", "reps_duration", "duration", "distance_duration", "weight_duration", "weight_distance_duration",
    ];
    expect(Object.keys(RECORDING_MODE_SPECS)).toEqual(modes);
    expect(new Set(modes.map((mode) => getRecordingModeSpec(mode))).size).toBe(7);
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
      { mode: "reps_duration", fields: ["reps", "durationSec"], requiredAll: ["durationSec"], requiredOneOf: [], loadBases: [], loadDirections: [], rates: ["none", "reps_per_time"] },
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
    expect(() => validateRecordingConfig({ recordingMode: "distance_duration", loadBasis: null, countBasis: "whole_set", loadDirection: null, rateMetric: "distance_per_time", contextKind: "resistance_level" })).toThrow("不能启用竞速指标");
    expect(() => validateRecordingConfig({ recordingMode: "reps", loadBasis: null, countBasis: "whole_set", loadDirection: null, rateMetric: "none", contextKind: "resistance_level" })).toThrow("距离 / 时间");
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

  it("validates optional steps and mutually exclusive context values", () => {
    const stepmill = validateRecordingConfig({
      recordingMode: "reps_duration",
      loadBasis: null,
      countBasis: "whole_set",
      loadDirection: null,
      rateMetric: "reps_per_time",
      contextKind: "none",
    });
    expect(() => validateWorkoutSetForMode({ reps: null, durationSec: 600, contextValue: null }, stepmill, "complete")).not.toThrow();
    expect(() => validateWorkoutSetForMode({ reps: 300, durationSec: null, contextValue: null }, stepmill, "complete")).toThrow("时长不能为空");

    const resistance = validateRecordingConfig({ ...stepmill, recordingMode: "distance_duration", rateMetric: "none", contextKind: "resistance_level" });
    expect(() => validateWorkoutSetForMode({ distanceM: 1000, contextValue: 0 }, resistance, "complete")).not.toThrow();
    expect(() => validateWorkoutSetForMode({ distanceM: 1000, contextValue: 7.5 }, resistance, "complete")).not.toThrow();
    expect(() => validateWorkoutSetForMode({ distanceM: 1000, contextValue: 200.1 }, resistance, "complete")).toThrow("0 到 200");

    const incline = validateRecordingConfig({ ...resistance, rateMetric: "distance_per_time", contextKind: "incline_percent" });
    expect(() => validateWorkoutSetForMode({ distanceM: 1000, contextValue: -1 }, incline, "complete")).toThrow("0% 到 100%");
    expect(() => validateWorkoutSetForMode({ distanceM: 1000, contextValue: 5 }, { ...incline, contextKind: "none" }, "complete")).toThrow("不能记录阻力或坡度");
  });
});

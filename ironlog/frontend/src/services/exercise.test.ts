import { describe, expect, it } from "vitest";
import { makeEmptySnapshot } from "@/core/migrations";
import { toExercise } from "./localMappers";
import { primaryExerciseStat, validateCreateExerciseInput, validateUpdateExerciseInput } from "./exercise";

describe("exercise service contract", () => {
  it("selects the same primary record for assisted, weighted and rep exercises", () => {
    const base = {
      best_load: 20, best_set_volume: 200, best_reps: 12,
      best_distance_m: null, best_duration_sec: null, best_speed_mps: null,
      best_load_distance_kg_m: null, best_load_duration_kg_sec: null,
      best_load_distance_rate_kg_mps: null, load_basis: "total" as const,
      count_basis: "whole_set" as const, load_direction: "higher_better" as const,
      display_unit: "kg" as const,
    };
    expect(primaryExerciseStat(base)).toEqual({ label: "最大重量", value: "20 kg" });
    expect(primaryExerciseStat({ ...base, load_direction: "lower_better" })).toEqual({ label: "最低辅助重量", value: "20 kg" });
    expect(primaryExerciseStat({ ...base, best_load: null, best_set_volume: null })).toEqual({ label: "最大次数", value: "12 次" });
    expect(primaryExerciseStat({ ...base, best_load: null, best_set_volume: null, best_reps: null })).toBeNull();
  });
  it("requires the complete recording contract, equipment, and description on create and strips unknown provenance", () => {
    const valid = {
      name: " 自定义动作 ", category: "core" as const, recording_mode: "reps" as const,
      load_basis: null, count_basis: "whole_set" as const, load_direction: null, rate_metric: "none" as const,
      context_kind: "none" as const,
      equipment: "trap_bar" as const, description: null, primary_muscle_group_ids: ["core" as const], secondary_muscle_group_ids: [],
      provenance: { source: "forbidden", sourceId: "1", sourceRevision: "1" },
    };
    const result = validateCreateExerciseInput(valid);
    expect(result).toMatchObject({ name: "自定义动作", recordingMode: "reps", loadBasis: null, countBasis: "whole_set", equipment: "trap_bar", description: null });
    expect(Object.prototype.hasOwnProperty.call(result, "provenance")).toBe(false);
    expect(() => validateCreateExerciseInput({ ...valid, recording_mode: undefined } as never)).toThrow("必须明确提交");
    expect(() => validateCreateExerciseInput({ ...valid, equipment: undefined } as never)).toThrow("必须明确提交");
    expect(() => validateCreateExerciseInput({ ...valid, description: undefined } as never)).toThrow("必须明确提交");
  });

  it("uses undefined as no change and null as explicit clear on update", () => {
    const current = { ...makeEmptySnapshot("device-test").exercises[0], isCustom: true };
    const omitted = validateUpdateExerciseInput({ name: "改名", equipment: undefined, description: undefined }, current);
    expect(omitted).toEqual({ name: "改名" });
    const cleared = validateUpdateExerciseInput({ equipment: null, description: null }, current);
    expect(cleared).toEqual({ equipment: null, description: null });
  });

  it("maps page DTOs through a provenance-free whitelist", () => {
    const doc = makeEmptySnapshot("device-test").exercises[0];
    const pageDto = toExercise(doc);
    expect(pageDto.equipment).toBe(doc.equipment);
    expect(Object.prototype.hasOwnProperty.call(pageDto, "provenance")).toBe(false);
  });
});

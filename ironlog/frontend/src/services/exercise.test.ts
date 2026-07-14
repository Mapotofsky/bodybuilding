import { describe, expect, it } from "vitest";
import { makeEmptySnapshot } from "@/core/migrations";
import { toExercise } from "./localMappers";
import { validateCreateExerciseInput, validateUpdateExerciseInput } from "./exercise";

describe("exercise service contract", () => {
  it("requires type, equipment, and description on create and strips unknown provenance", () => {
    const valid = {
      name: " 自定义动作 ", category: "core" as const, type: "reps_only" as const,
      equipment: null, description: null, primary_muscle_group_ids: ["core" as const], secondary_muscle_group_ids: [],
      provenance: { source: "forbidden", sourceId: "1", sourceRevision: "1" },
    };
    const result = validateCreateExerciseInput(valid);
    expect(result).toMatchObject({ name: "自定义动作", type: "reps_only", equipment: null, description: null });
    expect(Object.prototype.hasOwnProperty.call(result, "provenance")).toBe(false);
    expect(() => validateCreateExerciseInput({ ...valid, type: undefined } as never)).toThrow("必须明确提交");
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

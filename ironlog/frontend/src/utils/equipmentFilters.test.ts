import { describe, expect, it } from "vitest";
import type { EquipmentId } from "@/types";
import { countEquipmentUsage, frequentlyUsedEquipmentIds, hasOtherEquipmentOption, matchesEquipmentFilter } from "./equipmentFilters";

function exercise(equipment: EquipmentId | null) {
  return { equipment };
}

describe("equipment filter options", () => {
  it("shows only equipment used by more than two exercises and groups low-frequency equipment as other", () => {
    const exercises = [
      exercise("barbell"), exercise("barbell"), exercise("barbell"),
      exercise("dumbbell"), exercise("dumbbell"),
      exercise("kettlebell"),
      exercise("other"),
      exercise(null),
    ];
    const counts = countEquipmentUsage(exercises);

    expect(frequentlyUsedEquipmentIds(counts, ["barbell", "dumbbell", "kettlebell", "other"])).toEqual(["barbell"]);
    expect(hasOtherEquipmentOption(counts)).toBe(true);
    expect(exercises.filter((item) => matchesEquipmentFilter(item, "other", counts))).toEqual([
      exercise("dumbbell"), exercise("dumbbell"), exercise("kettlebell"), exercise("other"),
    ]);
  });

  it("does not offer other when every configured equipment is used more than twice", () => {
    const counts = countEquipmentUsage([exercise("barbell"), exercise("barbell"), exercise("barbell")]);

    expect(hasOtherEquipmentOption(counts)).toBe(false);
    expect(matchesEquipmentFilter(exercise(null), "other", counts)).toBe(false);
  });
});

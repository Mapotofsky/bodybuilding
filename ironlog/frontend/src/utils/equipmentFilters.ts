import type { EquipmentId } from "@/types";

export interface EquipmentSelection {
  equipment: EquipmentId | null;
}

export function countEquipmentUsage(exercises: readonly EquipmentSelection[]): Map<EquipmentId, number> {
  const counts = new Map<EquipmentId, number>();
  for (const exercise of exercises) {
    if (exercise.equipment !== null) counts.set(exercise.equipment, (counts.get(exercise.equipment) ?? 0) + 1);
  }
  return counts;
}

export function frequentlyUsedEquipmentIds(counts: ReadonlyMap<EquipmentId, number>, equipmentIds: readonly EquipmentId[]): EquipmentId[] {
  return equipmentIds.filter((equipment) => equipment !== "other" && (counts.get(equipment) ?? 0) > 2);
}

export function hasOtherEquipmentOption(counts: ReadonlyMap<EquipmentId, number>): boolean {
  return [...counts].some(([equipment, count]) => equipment === "other" || count <= 2);
}

export function matchesEquipmentFilter(exercise: EquipmentSelection, filter: EquipmentId | "", counts: ReadonlyMap<EquipmentId, number>): boolean {
  if (!filter) return true;
  if (filter !== "other") return exercise.equipment === filter;
  return exercise.equipment !== null && (exercise.equipment === "other" || (counts.get(exercise.equipment) ?? 0) <= 2);
}

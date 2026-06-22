import type { ExerciseDoc } from "./models";

export type ExerciseResolution =
  | { status: "resolved"; resolvedId: string }
  | { status: "unresolved"; reason: "missing" | "deleted_without_replacement" | "missing_target" | "cycle" | "max_depth" };

const MAX_REDIRECT_DEPTH = 32;

/** Resolves a directed deleted-exercise replacement chain without mutating historical IDs. */
export function resolveExerciseId(id: string, exercises: readonly ExerciseDoc[]): ExerciseResolution {
  const byId = new Map(exercises.map((exercise) => [exercise.id, exercise]));
  const visited = new Set<string>();
  let currentId = id;

  for (let depth = 0; depth < MAX_REDIRECT_DEPTH; depth += 1) {
    if (visited.has(currentId)) return { status: "unresolved", reason: "cycle" };
    visited.add(currentId);
    const current = byId.get(currentId);
    if (!current) return { status: "unresolved", reason: depth === 0 ? "missing" : "missing_target" };
    if (!current.deletedAt) return { status: "resolved", resolvedId: current.id };
    if (!current.replacedByExerciseId) return { status: "unresolved", reason: "deleted_without_replacement" };
    currentId = current.replacedByExerciseId;
  }
  return { status: "unresolved", reason: "max_depth" };
}

export function resolvesToExerciseId(sourceId: string, targetId: string, exercises: readonly ExerciseDoc[]): boolean {
  const result = resolveExerciseId(sourceId, exercises);
  return result.status === "resolved" && result.resolvedId === targetId;
}

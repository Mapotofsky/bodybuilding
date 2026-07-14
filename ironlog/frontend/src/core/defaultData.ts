import { DEFAULT_EXERCISE_SEEDS } from "./defaultExercises.generated";
import { CURRENT_SCHEMA_VERSION, type ExerciseDoc } from "./models";

const seedTime = "2026-01-01T00:00:00.000Z";

export const DEFAULT_EXERCISES: ExerciseDoc[] = DEFAULT_EXERCISE_SEEDS.map((seed) => ({
  ...seed,
  primaryMuscleGroupIds: [...seed.primaryMuscleGroupIds],
  secondaryMuscleGroupIds: [...seed.secondaryMuscleGroupIds],
  isCustom: false,
  replacedByExerciseId: null,
  createdAt: seedTime,
  updatedAt: seedTime,
  deletedAt: null,
  schemaVersion: CURRENT_SCHEMA_VERSION,
}));

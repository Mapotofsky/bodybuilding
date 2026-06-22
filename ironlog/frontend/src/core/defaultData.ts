import { CURRENT_SCHEMA_VERSION, type ExerciseDoc, type ExerciseType } from "./models";
import { nowIso } from "./id";

const seedTime = "2026-01-01T00:00:00.000Z";

function exercise(id: string, name: string, category: string, type: ExerciseType, description: string | null = null): ExerciseDoc {
  return {
    id,
    name,
    category,
    type,
    description,
    metValue: null,
    isCustom: false,
    replacedByExerciseId: null,
    createdAt: seedTime,
    updatedAt: seedTime,
    deletedAt: null,
    schemaVersion: CURRENT_SCHEMA_VERSION,
  };
}

export const DEFAULT_EXERCISES: ExerciseDoc[] = [
  exercise("ex-bench-press", "杠铃卧推", "chest", "strength"),
  exercise("ex-incline-db-press", "上斜哑铃卧推", "chest", "strength"),
  exercise("ex-push-up", "俯卧撑", "chest", "strength"),
  exercise("ex-pull-up", "引体向上", "back", "strength"),
  exercise("ex-lat-pulldown", "高位下拉", "back", "strength"),
  exercise("ex-barbell-row", "杠铃划船", "back", "strength"),
  exercise("ex-squat", "深蹲", "legs", "strength"),
  exercise("ex-leg-press", "腿举", "legs", "strength"),
  exercise("ex-romanian-deadlift", "罗马尼亚硬拉", "legs", "strength"),
  exercise("ex-overhead-press", "站姿推举", "shoulders", "strength"),
  exercise("ex-lateral-raise", "哑铃侧平举", "shoulders", "strength"),
  exercise("ex-face-pull", "面拉", "shoulders", "strength"),
  exercise("ex-barbell-curl", "杠铃弯举", "arms", "strength"),
  exercise("ex-triceps-pushdown", "绳索下压", "arms", "strength"),
  exercise("ex-plank", "平板支撑", "core", "static_hold"),
  exercise("ex-deadlift", "硬拉", "compound", "strength"),
  exercise("ex-running", "跑步", "cardio", "cardio"),
  exercise("ex-cat-cow-stretch", "猫式伸展", "stretch", "reps_only"),
];

export function makeSeedTimestamp(): string {
  return nowIso();
}

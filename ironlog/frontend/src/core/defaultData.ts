import { CURRENT_SCHEMA_VERSION, type ExerciseDoc } from "./models";
import { nowIso } from "./id";

const seedTime = "2026-01-01T00:00:00.000Z";

function exercise(id: string, name: string, category: string, description: string | null = null): ExerciseDoc {
  return {
    id,
    name,
    category,
    type: "strength",
    description,
    metValue: null,
    isCustom: false,
    createdAt: seedTime,
    updatedAt: seedTime,
    deletedAt: null,
    schemaVersion: CURRENT_SCHEMA_VERSION,
  };
}

export const DEFAULT_EXERCISES: ExerciseDoc[] = [
  exercise("ex-bench-press", "杠铃卧推", "chest"),
  exercise("ex-incline-db-press", "上斜哑铃卧推", "chest"),
  exercise("ex-push-up", "俯卧撑", "chest"),
  exercise("ex-pull-up", "引体向上", "back"),
  exercise("ex-lat-pulldown", "高位下拉", "back"),
  exercise("ex-barbell-row", "杠铃划船", "back"),
  exercise("ex-squat", "深蹲", "legs"),
  exercise("ex-leg-press", "腿举", "legs"),
  exercise("ex-romanian-deadlift", "罗马尼亚硬拉", "legs"),
  exercise("ex-overhead-press", "站姿推举", "shoulders"),
  exercise("ex-lateral-raise", "哑铃侧平举", "shoulders"),
  exercise("ex-face-pull", "面拉", "shoulders"),
  exercise("ex-barbell-curl", "杠铃弯举", "arms"),
  exercise("ex-triceps-pushdown", "绳索下压", "arms"),
  exercise("ex-plank", "平板支撑", "core"),
  exercise("ex-deadlift", "硬拉", "compound"),
  exercise("ex-running", "跑步", "cardio"),
];

export function makeSeedTimestamp(): string {
  return nowIso();
}

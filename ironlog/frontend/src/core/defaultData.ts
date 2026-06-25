import { CURRENT_SCHEMA_VERSION, type ExerciseDoc, type ExerciseType, type MuscleGroupId } from "./models";
import { nowIso } from "./id";

const seedTime = "2026-01-01T00:00:00.000Z";

function exercise(
  id: string,
  name: string,
  category: string,
  type: ExerciseType,
  primaryMuscleGroupIds: MuscleGroupId[],
  secondaryMuscleGroupIds: MuscleGroupId[] = [],
  description: string | null = null
): ExerciseDoc {
  return {
    id,
    name,
    category,
    type,
    description,
    primaryMuscleGroupIds,
    secondaryMuscleGroupIds,
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
  exercise("ex-bench-press", "杠铃卧推", "chest", "strength", ["chest"], ["triceps", "shoulders"], "仰卧稳定肩胛，握距略宽于肩，杠铃下放至胸前后向上推起。"),
  exercise("ex-incline-db-press", "上斜哑铃卧推", "chest", "strength", ["chest"], ["shoulders", "triceps"], "坐在上斜凳上保持背部贴合，哑铃从胸侧向上推至手臂接近伸直。"),
  exercise("ex-push-up", "俯卧撑", "chest", "strength", ["chest"], ["triceps", "core"], "身体保持直线，屈肘下降至胸部接近地面，再推回起始位置。"),
  exercise("ex-pull-up", "引体向上", "back", "strength", ["back"], ["biceps", "forearms"], "悬垂起始，肩背发力将身体拉至下巴接近横杠，再控制下降。"),
  exercise("ex-lat-pulldown", "高位下拉", "back", "strength", ["back"], ["biceps"], "坐稳并固定大腿，将握把下拉至上胸附近，再控制回到伸展位置。"),
  exercise("ex-barbell-row", "杠铃划船", "back", "strength", ["back"], ["biceps", "core"], "髋部折叠并保持躯干稳定，将杠铃拉向下腹后控制下放。"),
  exercise("ex-squat", "深蹲", "legs", "strength", ["quadriceps", "glutes"], ["hamstrings", "core"], "站距自然，屈髋屈膝下蹲至可控深度，再蹬地站起。"),
  exercise("ex-leg-press", "腿举", "legs", "strength", ["quadriceps"], ["glutes", "hamstrings"], "背部贴稳靠垫，屈膝下放踏板后用腿部推回，膝盖方向与脚尖一致。"),
  exercise("ex-romanian-deadlift", "罗马尼亚硬拉", "legs", "strength", ["hamstrings", "glutes"], ["back", "core"], "保持背部中立，髋部向后折叠让杠铃沿腿部下放，再伸髋站起。"),
  exercise("ex-overhead-press", "站姿推举", "shoulders", "strength", ["shoulders"], ["triceps", "core"], "站姿收紧躯干，将杠铃从肩前推至头顶，再控制回到肩前。"),
  exercise("ex-lateral-raise", "哑铃侧平举", "shoulders", "strength", ["shoulders"], [], "手持哑铃从身体两侧抬至肩高附近，保持动作受控后下放。"),
  exercise("ex-face-pull", "面拉", "shoulders", "strength", ["shoulders"], ["back"], "绳索高度约在脸部，向面部方向拉动并让肘部打开，控制回放。"),
  exercise("ex-barbell-curl", "杠铃弯举", "arms", "strength", ["biceps"], ["forearms"], "上臂相对固定，屈肘将杠铃举起后控制下放。"),
  exercise("ex-triceps-pushdown", "绳索下压", "arms", "strength", ["triceps"], ["forearms"], "肘部靠近身体，向下伸肘压下绳索，再控制回到起始位置。"),
  exercise("ex-plank", "平板支撑", "core", "static_hold", ["core"], ["shoulders", "glutes"], "前臂支撑地面，身体保持直线并维持稳定呼吸。"),
  exercise("ex-deadlift", "硬拉", "compound", "strength", ["glutes", "hamstrings"], ["back", "quadriceps", "core"], "站在杠铃中线附近，保持背部中立，伸膝伸髋将杠铃拉起。"),
  exercise("ex-running", "跑步", "cardio", "cardio", ["full_body"], ["calves", "quadriceps", "hamstrings"], "按计划速度完成跑步，记录距离和用时。"),
  exercise("ex-cat-cow-stretch", "猫式伸展", "stretch", "reps_only", ["core"], ["back"], "四点支撑位交替拱背和伸展脊柱，动作保持缓慢可控。"),
];

export function makeSeedTimestamp(): string {
  return nowIso();
}

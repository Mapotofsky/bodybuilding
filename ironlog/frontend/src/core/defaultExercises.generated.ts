// 此文件由 scripts/exerciseCatalog.mjs 生成，禁止手改。
// candidates sha256: 84b2d8f25116ba064c3b900f4b04f58782dc66383d4168591ea01a2fe9595286
// upstream revision: 118e4bd6b14da6df0e36605d7169b65db18389a4
import type { DefaultExerciseSeed } from "./models";

export const DEFAULT_EXERCISE_SEEDS: DefaultExerciseSeed[] = [
  {
    "id": "ex-bench-press",
    "name": "杠铃卧推",
    "category": "chest",
    "recordingMode": "weight_reps",
    "loadBasis": "total",
    "countBasis": "whole_set",
    "loadDirection": "higher_better",
    "rateMetric": "none",
    "contextKind": "none",
    "equipment": "barbell",
    "description": "平躺在长凳上，双脚平放在地上，背部紧贴长凳。\n\n正手握住杠铃，握距略宽于肩宽。\n\n将杠铃从架子上提起，并将其直接放在胸部上方，双臂完全伸展。\n\n将杠铃慢慢降低到胸部，保持肘部内收。\n\n当杠铃触及胸部时暂停片刻。\n\n伸展双臂，将杠铃推回到起始位置。\n\n重复所需的重复次数。",
    "primaryMuscleGroupIds": [
      "chest"
    ],
    "secondaryMuscleGroupIds": [
      "triceps",
      "shoulders"
    ],
    "provenance": {
      "source": "hasaneyldrm/exercises-dataset",
      "sourceId": "0025",
      "sourceRevision": "118e4bd6b14da6df0e36605d7169b65db18389a4"
    }
  },
  {
    "id": "ex-incline-db-press",
    "name": "上斜哑铃卧推",
    "category": "chest",
    "recordingMode": "weight_reps",
    "loadBasis": "per_hand",
    "countBasis": "whole_set",
    "loadDirection": "higher_better",
    "rateMetric": "none",
    "contextKind": "none",
    "equipment": "dumbbell",
    "description": "将长凳调整到适合自己的上斜角度。\n\n坐在长凳上，双脚平放在地上，背部紧贴长凳。\n\n双手各握一个哑铃，掌心向前，将哑铃举至肩高。\n\n慢慢将哑铃降低到胸部两侧，肘部保持在舒适角度。\n\n将哑铃推回起始位置，手臂接近伸直。\n\n重复所需的次数。",
    "primaryMuscleGroupIds": [
      "chest"
    ],
    "secondaryMuscleGroupIds": [
      "shoulders",
      "triceps"
    ],
    "provenance": {
      "source": "hasaneyldrm/exercises-dataset",
      "sourceId": "0314",
      "sourceRevision": "118e4bd6b14da6df0e36605d7169b65db18389a4"
    }
  },
  {
    "id": "ex-push-up",
    "name": "俯卧撑",
    "category": "chest",
    "recordingMode": "reps",
    "loadBasis": null,
    "countBasis": "whole_set",
    "loadDirection": null,
    "rateMetric": "none",
    "contextKind": "none",
    "equipment": "body_weight",
    "description": "从高位平板支撑开始，双手分开略宽于肩宽，双脚并拢。\n\n弯曲肘部，调动核心力量，将身体压向地面，保持身体呈一条直线。\n\n当你的胸部刚好高于地面时，暂停片刻，然后伸直手臂，将自己推回起始位置。\n\n重复所需的重复次数。",
    "primaryMuscleGroupIds": [
      "chest"
    ],
    "secondaryMuscleGroupIds": [
      "triceps",
      "shoulders",
      "core"
    ],
    "provenance": {
      "source": "hasaneyldrm/exercises-dataset",
      "sourceId": "0662",
      "sourceRevision": "118e4bd6b14da6df0e36605d7169b65db18389a4"
    }
  },
  {
    "id": "ex-machine-chest-press",
    "name": "器械胸推",
    "category": "chest",
    "recordingMode": "weight_reps",
    "loadBasis": "total",
    "countBasis": "whole_set",
    "loadDirection": "higher_better",
    "rateMetric": "none",
    "contextKind": "none",
    "equipment": "machine",
    "description": "调整座椅高度，将自己放在器械上，背部平放在靠垫上。\n\n正手握住把手，肘部保持在舒适角度。\n\n呼气并向前推动把手，直到手臂接近伸直。\n\n动作结束时短暂停顿，然后吸气并慢慢回到起始位置。\n\n重复所需的次数。",
    "primaryMuscleGroupIds": [
      "chest"
    ],
    "secondaryMuscleGroupIds": [
      "triceps",
      "shoulders"
    ],
    "provenance": {
      "source": "hasaneyldrm/exercises-dataset",
      "sourceId": "0576",
      "sourceRevision": "118e4bd6b14da6df0e36605d7169b65db18389a4"
    }
  },
  {
    "id": "ex-chest-dip",
    "name": "双杠臂屈伸（偏胸）",
    "category": "chest",
    "recordingMode": "reps",
    "loadBasis": null,
    "countBasis": "whole_set",
    "loadDirection": null,
    "rateMetric": "none",
    "contextKind": "none",
    "equipment": "body_weight",
    "description": "双臂伸直支撑在双杠上，躯干略微前倾。\n\n弯曲肘部，受控降低身体至肩部感觉舒适的深度。\n\n伸直手臂，将身体推回起始位置。\n\n重复所需的次数。",
    "primaryMuscleGroupIds": [
      "chest"
    ],
    "secondaryMuscleGroupIds": [
      "triceps",
      "shoulders"
    ],
    "provenance": {
      "source": "hasaneyldrm/exercises-dataset",
      "sourceId": "0251",
      "sourceRevision": "118e4bd6b14da6df0e36605d7169b65db18389a4"
    }
  },
  {
    "id": "ex-seated-dumbbell-shoulder-press",
    "name": "坐姿哑铃推举",
    "category": "shoulders",
    "recordingMode": "weight_reps",
    "loadBasis": "per_hand",
    "countBasis": "whole_set",
    "loadDirection": "higher_better",
    "rateMetric": "none",
    "contextKind": "none",
    "equipment": "dumbbell",
    "description": "坐在长凳上，每只手各拿一个哑铃，放在大腿上。\n\n将哑铃举至肩高，手掌朝前。\n\n向上推哑铃，直到手臂完全伸过头顶。\n\n在顶部停顿片刻，然后慢慢将哑铃放回肩部高度。\n\n重复所需的重复次数。",
    "primaryMuscleGroupIds": [
      "shoulders"
    ],
    "secondaryMuscleGroupIds": [
      "triceps",
      "back"
    ],
    "provenance": {
      "source": "hasaneyldrm/exercises-dataset",
      "sourceId": "0405",
      "sourceRevision": "118e4bd6b14da6df0e36605d7169b65db18389a4"
    }
  },
  {
    "id": "ex-lateral-raise",
    "name": "哑铃侧平举",
    "category": "shoulders",
    "recordingMode": "weight_reps",
    "loadBasis": "per_hand",
    "countBasis": "whole_set",
    "loadDirection": "higher_better",
    "rateMetric": "none",
    "contextKind": "none",
    "equipment": "dumbbell",
    "description": "双脚分开与肩同宽站立，双手各握一个哑铃，手掌朝向身体。\n\n保持背部挺直并启动核心肌群。\n\n将手臂向两侧抬起，直到与地板平行，保持肘部稍微弯曲。\n\n在顶部暂停片刻，然后慢慢将手臂放回起始位置。\n\n重复所需的重复次数。",
    "primaryMuscleGroupIds": [
      "shoulders"
    ],
    "secondaryMuscleGroupIds": [
      "back"
    ],
    "provenance": {
      "source": "hasaneyldrm/exercises-dataset",
      "sourceId": "0334",
      "sourceRevision": "118e4bd6b14da6df0e36605d7169b65db18389a4"
    }
  },
  {
    "id": "ex-dumbbell-reverse-fly",
    "name": "哑铃反向飞鸟",
    "category": "shoulders",
    "recordingMode": "weight_reps",
    "loadBasis": "per_hand",
    "countBasis": "whole_set",
    "loadDirection": "higher_better",
    "rateMetric": "none",
    "contextKind": "none",
    "equipment": "dumbbell",
    "description": "双脚分开与肩同宽站立，每只手各握一个哑铃。\n\n稍微弯曲膝盖，髋部向前转动，保持背部挺直。\n\n将双臂伸直在身前，手掌相对。\n\n保持肘部轻微弯曲，将手臂向两侧抬起，直到与地面平行。\n\n在顶部暂停片刻，然后慢慢将手臂放回起始位置。\n\n重复所需的重复次数。",
    "primaryMuscleGroupIds": [
      "shoulders"
    ],
    "secondaryMuscleGroupIds": [
      "back"
    ],
    "provenance": {
      "source": "hasaneyldrm/exercises-dataset",
      "sourceId": "0383",
      "sourceRevision": "118e4bd6b14da6df0e36605d7169b65db18389a4"
    }
  },
  {
    "id": "ex-barbell-row",
    "name": "杠铃俯身划船",
    "category": "back",
    "recordingMode": "weight_reps",
    "loadBasis": "total",
    "countBasis": "whole_set",
    "loadDirection": "higher_better",
    "rateMetric": "none",
    "contextKind": "none",
    "equipment": "barbell",
    "description": "站立，双脚分开与肩同宽，膝盖稍微弯曲。\n\n臀部向前弯曲，同时保持背部挺直、挺胸。\n\n正手握住杠铃，双手间距略宽于肩宽。\n\n通过收缩肩胛骨并挤压背部肌肉，将杠铃拉向下胸部。\n\n在顶部停顿片刻，然后慢慢将杠铃放回起始位置。\n\n重复所需的重复次数。",
    "primaryMuscleGroupIds": [
      "back"
    ],
    "secondaryMuscleGroupIds": [
      "biceps",
      "forearms"
    ],
    "provenance": {
      "source": "hasaneyldrm/exercises-dataset",
      "sourceId": "0027",
      "sourceRevision": "118e4bd6b14da6df0e36605d7169b65db18389a4"
    }
  },
  {
    "id": "ex-one-arm-dumbbell-row",
    "name": "单臂哑铃划船",
    "category": "back",
    "recordingMode": "weight_reps",
    "loadBasis": "total",
    "countBasis": "per_side",
    "loadDirection": "higher_better",
    "rateMetric": "none",
    "contextKind": "none",
    "equipment": "dumbbell",
    "description": "双脚分开与肩同宽站立，一手握住哑铃，手掌朝向身体。\n\n稍微弯曲膝盖，髋部向前转动，保持背部挺直，核心肌群参与。\n\n让哑铃垂直垂向地板，手臂完全伸展。\n\n将哑铃向上拉向胸部，保持肘部靠近身体并将肩胛骨挤压在一起。\n\n在顶部停顿片刻，然后慢慢将哑铃放回起始位置。\n\n重复所需的重复次数，然后换边。",
    "primaryMuscleGroupIds": [
      "back"
    ],
    "secondaryMuscleGroupIds": [
      "biceps",
      "forearms"
    ],
    "provenance": {
      "source": "hasaneyldrm/exercises-dataset",
      "sourceId": "0292",
      "sourceRevision": "118e4bd6b14da6df0e36605d7169b65db18389a4"
    }
  },
  {
    "id": "ex-seated-cable-row",
    "name": "坐姿绳索划船",
    "category": "back",
    "recordingMode": "weight_reps",
    "loadBasis": "total",
    "countBasis": "whole_set",
    "loadDirection": "higher_better",
    "rateMetric": "none",
    "contextKind": "none",
    "equipment": "cable",
    "description": "坐在电缆划船机上，双脚平放在脚踏板上，膝盖稍微弯曲。\n\n正手握住手柄，保持背部挺直，肩膀放松。\n\n将手柄拉向身体，将肩胛骨挤压在一起。\n\n在动作的最高点暂停片刻，然后慢慢松开手柄回到起始位置。\n\n重复所需的重复次数。",
    "primaryMuscleGroupIds": [
      "back"
    ],
    "secondaryMuscleGroupIds": [
      "biceps",
      "forearms"
    ],
    "provenance": {
      "source": "hasaneyldrm/exercises-dataset",
      "sourceId": "0861",
      "sourceRevision": "118e4bd6b14da6df0e36605d7169b65db18389a4"
    }
  },
  {
    "id": "ex-pull-up",
    "name": "正握引体向上",
    "category": "back",
    "recordingMode": "reps",
    "loadBasis": null,
    "countBasis": "whole_set",
    "loadDirection": null,
    "rateMetric": "none",
    "contextKind": "none",
    "equipment": "body_weight",
    "description": "悬挂在引体向上杆上，手掌背向自己，手臂完全伸展。\n\n启动你的核心并将肩胛骨挤压在一起。\n\n弯曲肘部并将胸部拉向杠铃杆，将身体向上拉向杠铃杆。\n\n在动作的最高点暂停，然后慢慢降低身体回到起始位置。\n\n重复所需的重复次数。",
    "primaryMuscleGroupIds": [
      "back"
    ],
    "secondaryMuscleGroupIds": [
      "biceps",
      "forearms"
    ],
    "provenance": {
      "source": "hasaneyldrm/exercises-dataset",
      "sourceId": "0652",
      "sourceRevision": "118e4bd6b14da6df0e36605d7169b65db18389a4"
    }
  },
  {
    "id": "ex-lat-pulldown",
    "name": "高位下拉",
    "category": "back",
    "recordingMode": "weight_reps",
    "loadBasis": "total",
    "countBasis": "whole_set",
    "loadDirection": "higher_better",
    "rateMetric": "none",
    "contextKind": "none",
    "equipment": "cable",
    "description": "调整拉索下拉机，使座椅处于舒适的高度并固定护膝。\n\n坐在座位上，背部挺直，双脚平放在地面上。\n\n正手握住电缆杆，握距略宽于肩宽。\n\n稍微向后倾斜并启动你的核心。\n\n将电缆杆向下拉向胸部，将肩胛骨挤压在一起。\n\n在动作底部暂停片刻，然后慢慢松开杠铃回到起始位置。\n\n重复所需的重复次数。",
    "primaryMuscleGroupIds": [
      "back"
    ],
    "secondaryMuscleGroupIds": [
      "biceps",
      "forearms"
    ],
    "provenance": {
      "source": "hasaneyldrm/exercises-dataset",
      "sourceId": "0198",
      "sourceRevision": "118e4bd6b14da6df0e36605d7169b65db18389a4"
    }
  },
  {
    "id": "ex-deadlift",
    "name": "杠铃硬拉",
    "category": "legs",
    "recordingMode": "weight_reps",
    "loadBasis": "total",
    "countBasis": "whole_set",
    "loadDirection": "higher_better",
    "rateMetric": "none",
    "contextKind": "none",
    "equipment": "barbell",
    "description": "双脚分开与肩同宽站立，杠铃放在你面前的地面上。\n\n弯曲膝盖并以臀部为铰链，降低躯干，正手握住杠铃，双手分开略宽于肩宽。\n\n当你通过脚后跟将杠铃抬离地面时，保持背部挺直，胸部抬起，伸展臀部和膝盖。\n\n当你站直时，挤压你的臀部并保持你的核心参与。\n\n弯曲臀部和膝盖，将杠铃放回地面，保持背部挺直。\n\n重复所需的重复次数。",
    "primaryMuscleGroupIds": [
      "glutes"
    ],
    "secondaryMuscleGroupIds": [
      "hamstrings",
      "back"
    ],
    "provenance": {
      "source": "hasaneyldrm/exercises-dataset",
      "sourceId": "0032",
      "sourceRevision": "118e4bd6b14da6df0e36605d7169b65db18389a4"
    }
  },
  {
    "id": "ex-romanian-deadlift",
    "name": "杠铃罗马尼亚硬拉",
    "category": "legs",
    "recordingMode": "weight_reps",
    "loadBasis": "total",
    "countBasis": "whole_set",
    "loadDirection": "higher_better",
    "rateMetric": "none",
    "contextKind": "none",
    "equipment": "barbell",
    "description": "站立，双脚分开与肩同宽，脚趾指向前方。\n\n正手握住杠铃，双手分开略宽于肩宽。\n\n弯曲臀部，保持背部挺直，膝盖稍微弯曲。\n\n将杠铃向地面降低，使其靠近身体。\n\n当你降低杠铃时，感受腿筋的拉伸。\n\n一旦感觉到腿筋拉伸，就将臀部向前推并站直。\n\n在动作的最高点挤压臀部。\n\n将杠铃放回起始位置，然后重复所需的重复次数。",
    "primaryMuscleGroupIds": [
      "glutes"
    ],
    "secondaryMuscleGroupIds": [
      "hamstrings",
      "back"
    ],
    "provenance": {
      "source": "hasaneyldrm/exercises-dataset",
      "sourceId": "0085",
      "sourceRevision": "118e4bd6b14da6df0e36605d7169b65db18389a4"
    }
  },
  {
    "id": "ex-barbell-back-squat",
    "name": "杠铃深蹲",
    "category": "legs",
    "recordingMode": "weight_reps",
    "loadBasis": "total",
    "countBasis": "whole_set",
    "loadDirection": "higher_better",
    "rateMetric": "none",
    "contextKind": "none",
    "equipment": "barbell",
    "description": "站立，双脚分开与肩同宽，脚趾稍微向外。\n\n将杠铃放在上背部，将其放在斜方肌或三角肌后束上。\n\n当你开始降低身体时，启动你的核心并保持胸部挺直。\n\n弯曲膝盖和臀部，向后和向下推臀部，就像坐在椅子上一样。\n\n放低身体，直到大腿与地面平行或稍低于地面。\n\n保持膝盖与脚趾对齐，并将重量放在脚后跟上。\n\n通过脚后跟站起来，伸展臀部和膝盖。\n\n重复所需的重复次数。",
    "primaryMuscleGroupIds": [
      "quadriceps",
      "glutes"
    ],
    "secondaryMuscleGroupIds": [
      "hamstrings",
      "calves",
      "core"
    ],
    "provenance": {
      "source": "hasaneyldrm/exercises-dataset",
      "sourceId": "0043",
      "sourceRevision": "118e4bd6b14da6df0e36605d7169b65db18389a4"
    }
  },
  {
    "id": "ex-dumbbell-goblet-squat",
    "name": "哑铃高脚杯深蹲",
    "category": "legs",
    "recordingMode": "weight_reps",
    "loadBasis": "total",
    "countBasis": "whole_set",
    "loadDirection": "higher_better",
    "rateMetric": "none",
    "contextKind": "none",
    "equipment": "dumbbell",
    "description": "双脚分开与肩同宽站立，双手握住哑铃垂直放在胸前。\n\n保持胸部挺直，核心收紧，通过向后推臀部并弯曲膝盖，将身体降低至蹲姿。\n\n继续降低，直到大腿与地面平行，或者尽可能低。\n\n在底部停顿片刻，然后推动脚后跟回到起始位置。\n\n重复所需的重复次数。",
    "primaryMuscleGroupIds": [
      "quadriceps",
      "glutes"
    ],
    "secondaryMuscleGroupIds": [
      "hamstrings",
      "calves"
    ],
    "provenance": {
      "source": "hasaneyldrm/exercises-dataset",
      "sourceId": "1760",
      "sourceRevision": "118e4bd6b14da6df0e36605d7169b65db18389a4"
    }
  },
  {
    "id": "ex-leg-press",
    "name": "45 度腿举",
    "category": "legs",
    "recordingMode": "weight_reps",
    "loadBasis": "total",
    "countBasis": "whole_set",
    "loadDirection": "higher_better",
    "rateMetric": "none",
    "contextKind": "none",
    "equipment": "machine",
    "description": "调整 45 度腿举机的座椅，使双脚放在踏板上时膝盖处于舒适角度。\n\n坐在器械上，背部平放在靠垫上，双脚约与肩同宽放在踏板上。\n\n握住座椅两侧的把手以保持稳定。\n\n推动踏板伸展双腿，膝盖接近伸直但不要锁死。\n\n在顶部短暂停顿，然后慢慢弯曲膝盖，将踏板放回起始位置。\n\n重复所需的次数。",
    "primaryMuscleGroupIds": [
      "quadriceps",
      "glutes"
    ],
    "secondaryMuscleGroupIds": [
      "hamstrings",
      "calves"
    ],
    "provenance": {
      "source": "hasaneyldrm/exercises-dataset",
      "sourceId": "1463",
      "sourceRevision": "118e4bd6b14da6df0e36605d7169b65db18389a4"
    }
  },
  {
    "id": "ex-machine-leg-extension",
    "name": "器械腿屈伸",
    "category": "legs",
    "recordingMode": "weight_reps",
    "loadBasis": "total",
    "countBasis": "whole_set",
    "loadDirection": "higher_better",
    "rateMetric": "none",
    "contextKind": "none",
    "equipment": "machine",
    "description": "调整机器的座椅高度和靠背以适合您的身体。\n\n坐在机器上，背部靠在靠背上，双脚放在脚垫上。\n\n抓住手柄或侧杆以保持稳定性。\n\n伸直膝盖，举起重物，向前伸展双腿。\n\n在顶部暂停片刻，然后慢慢将重量放回起始位置。\n\n重复所需的重复次数。",
    "primaryMuscleGroupIds": [
      "quadriceps"
    ],
    "secondaryMuscleGroupIds": [],
    "provenance": {
      "source": "hasaneyldrm/exercises-dataset",
      "sourceId": "0585",
      "sourceRevision": "118e4bd6b14da6df0e36605d7169b65db18389a4"
    }
  },
  {
    "id": "ex-seated-leg-curl",
    "name": "坐姿腿弯举",
    "category": "legs",
    "recordingMode": "weight_reps",
    "loadBasis": "total",
    "countBasis": "whole_set",
    "loadDirection": "higher_better",
    "rateMetric": "none",
    "contextKind": "none",
    "equipment": "machine",
    "description": "调整器械以适合自己的身体，然后坐稳并让背部靠在靠垫上。\n\n将小腿放在带衬垫的杠杆上，并按器械结构固定大腿。\n\n抓住器械两侧的把手以保持稳定。\n\n保持大腿不动，呼气并屈膝，将滚垫向下、向后拉至可控范围。\n\n在腿后侧充分收缩时短暂停顿。\n\n吸气并受控伸膝，让滚垫回到起始位置。\n\n重复所需的次数。",
    "primaryMuscleGroupIds": [
      "hamstrings"
    ],
    "secondaryMuscleGroupIds": [
      "calves"
    ],
    "provenance": {
      "source": "hasaneyldrm/exercises-dataset",
      "sourceId": "0599",
      "sourceRevision": "118e4bd6b14da6df0e36605d7169b65db18389a4"
    }
  },
  {
    "id": "ex-dumbbell-lunge",
    "name": "哑铃前弓步",
    "category": "legs",
    "recordingMode": "weight_reps",
    "loadBasis": "per_hand",
    "countBasis": "per_side",
    "loadDirection": "higher_better",
    "rateMetric": "none",
    "contextKind": "none",
    "equipment": "dumbbell",
    "description": "双脚分开与肩同宽站立，每只手各握一个哑铃。\n\n右脚向前迈出一步，将身体降低至弓步位置。\n\n降低身体时保持背部挺直、挺胸。\n\n推动右脚跟回到起始位置。\n\n左腿重复上述动作。\n\n交替腿进行所需的重复次数。",
    "primaryMuscleGroupIds": [
      "quadriceps",
      "glutes"
    ],
    "secondaryMuscleGroupIds": [
      "hamstrings",
      "calves"
    ],
    "provenance": {
      "source": "hasaneyldrm/exercises-dataset",
      "sourceId": "0336",
      "sourceRevision": "118e4bd6b14da6df0e36605d7169b65db18389a4"
    }
  },
  {
    "id": "ex-dumbbell-bulgarian-split-squat",
    "name": "哑铃保加利亚分腿蹲",
    "category": "legs",
    "recordingMode": "weight_reps",
    "loadBasis": "per_hand",
    "countBasis": "per_side",
    "loadDirection": "higher_better",
    "rateMetric": "none",
    "contextKind": "none",
    "equipment": "dumbbell",
    "description": "双脚分开与肩同宽站立，每只手各握一个哑铃。\n\n一只脚向前迈出一步，调整双脚的位置，使前脚平放在地面上，后脚抬高在长凳或台阶上。\n\n弯曲前膝盖和臀部，降低身体，保持后膝盖稍微弯曲，后脚跟离开地面。\n\n继续降低，直到大腿前部与地面平行，然后通过前脚跟推回到起始位置。\n\n重复所需的重复次数，然后换腿并重复。",
    "primaryMuscleGroupIds": [
      "quadriceps",
      "glutes"
    ],
    "secondaryMuscleGroupIds": [
      "hamstrings",
      "calves"
    ],
    "provenance": {
      "source": "hasaneyldrm/exercises-dataset",
      "sourceId": "0410",
      "sourceRevision": "118e4bd6b14da6df0e36605d7169b65db18389a4"
    }
  },
  {
    "id": "ex-dumbbell-step-up",
    "name": "哑铃登台阶",
    "category": "legs",
    "recordingMode": "weight_reps",
    "loadBasis": "per_hand",
    "countBasis": "per_side",
    "loadDirection": "higher_better",
    "rateMetric": "none",
    "contextKind": "none",
    "equipment": "dumbbell",
    "description": "站在长凳或台阶前，每只手各握一个哑铃，手掌朝向身体。\n\n将右脚放在长凳或台阶上，确保整个脚与表面接触。\n\n推动右脚跟，将身体抬起到长凳或台阶上，伸直右腿。\n\n将左脚放在长凳或台阶上，完全直立。\n\n左脚向后退一步，然后是右脚，回到起始位置。\n\n重复所需的重复次数，然后换腿。",
    "primaryMuscleGroupIds": [
      "quadriceps",
      "glutes"
    ],
    "secondaryMuscleGroupIds": [
      "hamstrings",
      "calves"
    ],
    "provenance": {
      "source": "hasaneyldrm/exercises-dataset",
      "sourceId": "0431",
      "sourceRevision": "118e4bd6b14da6df0e36605d7169b65db18389a4"
    }
  },
  {
    "id": "ex-bodyweight-split-squat",
    "name": "自重分腿蹲",
    "category": "legs",
    "recordingMode": "reps",
    "loadBasis": null,
    "countBasis": "per_side",
    "loadDirection": null,
    "rateMetric": "none",
    "contextKind": "none",
    "equipment": "body_weight",
    "description": "双脚分开与肩同宽站立。\n\n一只脚向前迈出一步，并将其放在另一只脚前面约两英尺处。\n\n弯曲膝盖和臀部，降低身体，保持背部挺直。\n\n继续降低，直到前大腿与地面平行，后膝盖悬停在地面上方。\n\n暂停片刻，然后推动前脚跟回到起始位置。\n\n重复所需的重复次数，然后换腿并重复。",
    "primaryMuscleGroupIds": [
      "quadriceps",
      "glutes"
    ],
    "secondaryMuscleGroupIds": [
      "hamstrings",
      "calves"
    ],
    "provenance": {
      "source": "hasaneyldrm/exercises-dataset",
      "sourceId": "2368",
      "sourceRevision": "118e4bd6b14da6df0e36605d7169b65db18389a4"
    }
  },
  {
    "id": "ex-barbell-glute-bridge",
    "name": "杠铃臀桥",
    "category": "legs",
    "recordingMode": "weight_reps",
    "loadBasis": "total",
    "countBasis": "whole_set",
    "loadDirection": "higher_better",
    "rateMetric": "none",
    "contextKind": "none",
    "equipment": "barbell",
    "description": "首先平躺在地上，膝盖弯曲，双脚平放在地板上。\n\n将杠铃放在臀部上，用双手牢牢握住它。\n\n锻炼臀部和核心肌肉，然后将臀部抬离地面，直到身体从膝盖到肩膀形成一条直线。\n\n在顶部暂停片刻，挤压臀部。\n\n慢慢地将臀部放回起始位置。\n\n重复所需的重复次数。",
    "primaryMuscleGroupIds": [
      "glutes"
    ],
    "secondaryMuscleGroupIds": [
      "hamstrings",
      "back"
    ],
    "provenance": {
      "source": "hasaneyldrm/exercises-dataset",
      "sourceId": "1409",
      "sourceRevision": "118e4bd6b14da6df0e36605d7169b65db18389a4"
    }
  },
  {
    "id": "ex-kettlebell-swing",
    "name": "壶铃摆动",
    "category": "legs",
    "recordingMode": "weight_reps",
    "loadBasis": "total",
    "countBasis": "whole_set",
    "loadDirection": "higher_better",
    "rateMetric": "none",
    "contextKind": "none",
    "equipment": "kettlebell",
    "description": "双脚约与肩同宽站立，脚尖稍微向外。\n\n双手握住壶铃置于身体前方。\n\n膝盖微屈并以髋部为轴，将臀部向后推。\n\n让壶铃在两腿之间向后摆动，保持背部中立。\n\n快速伸髋，利用髋部产生的动量带动壶铃摆至胸部或肩部附近，不要主动用手臂抬起。\n\n控制壶铃在双腿之间回摆，然后重复所需的次数。",
    "primaryMuscleGroupIds": [
      "glutes"
    ],
    "secondaryMuscleGroupIds": [
      "hamstrings",
      "core"
    ],
    "provenance": {
      "source": "hasaneyldrm/exercises-dataset",
      "sourceId": "0549",
      "sourceRevision": "118e4bd6b14da6df0e36605d7169b65db18389a4"
    }
  },
  {
    "id": "ex-machine-standing-calf-raise",
    "name": "器械站姿提踵",
    "category": "legs",
    "recordingMode": "weight_reps",
    "loadBasis": "total",
    "countBasis": "whole_set",
    "loadDirection": "higher_better",
    "rateMetric": "none",
    "contextKind": "none",
    "equipment": "machine",
    "description": "将机器调整到您的高度，双脚分开与肩同宽站立。\n\n将肩膀放在护垫下方，并握住手柄以保持稳定。\n\n伸展脚踝，将脚后跟尽可能抬高。\n\n在顶部停顿片刻，然后慢慢降低脚后跟回到起始位置。\n\n重复所需的重复次数。",
    "primaryMuscleGroupIds": [
      "calves"
    ],
    "secondaryMuscleGroupIds": [],
    "provenance": {
      "source": "hasaneyldrm/exercises-dataset",
      "sourceId": "0605",
      "sourceRevision": "118e4bd6b14da6df0e36605d7169b65db18389a4"
    }
  },
  {
    "id": "ex-bodyweight-standing-calf-raise",
    "name": "自重站姿提踵",
    "category": "legs",
    "recordingMode": "reps",
    "loadBasis": null,
    "countBasis": "whole_set",
    "loadDirection": null,
    "rateMetric": "none",
    "contextKind": "none",
    "equipment": "body_weight",
    "description": "双脚分开与肩同宽站立，脚趾指向前方。\n\n将手放在墙壁或稳定的表面上以保持平衡。\n\n慢慢地将脚后跟抬离地面，将身体重量转移到脚掌上。\n\n在顶部停顿片刻，然后慢慢降低脚后跟回到起始位置。\n\n重复所需的重复次数。",
    "primaryMuscleGroupIds": [
      "calves"
    ],
    "secondaryMuscleGroupIds": [],
    "provenance": {
      "source": "hasaneyldrm/exercises-dataset",
      "sourceId": "1373",
      "sourceRevision": "118e4bd6b14da6df0e36605d7169b65db18389a4"
    }
  },
  {
    "id": "ex-farmer-walk",
    "name": "农夫行走",
    "category": "legs",
    "recordingMode": "weight_distance_duration",
    "loadBasis": "per_hand",
    "countBasis": "whole_set",
    "loadDirection": "higher_better",
    "rateMetric": "load_distance_per_time",
    "contextKind": "none",
    "equipment": "dumbbell",
    "description": "站直，双手各握一个哑铃，手掌朝向身体两侧。\n\n保持背部挺直，肩膀向后。\n\n向前迈出小步，控制住，保持直立姿势。\n\n继续步行所需的距离或时间。\n\n最后，停止行走并小心地将哑铃降低到身体两侧。",
    "primaryMuscleGroupIds": [
      "quadriceps"
    ],
    "secondaryMuscleGroupIds": [
      "calves",
      "forearms",
      "core"
    ],
    "provenance": {
      "source": "hasaneyldrm/exercises-dataset",
      "sourceId": "2133",
      "sourceRevision": "118e4bd6b14da6df0e36605d7169b65db18389a4"
    }
  },
  {
    "id": "ex-barbell-curl",
    "name": "杠铃弯举",
    "category": "arms",
    "recordingMode": "weight_reps",
    "loadBasis": "total",
    "countBasis": "whole_set",
    "loadDirection": "higher_better",
    "rateMetric": "none",
    "contextKind": "none",
    "equipment": "barbell",
    "description": "站直，双脚约与肩同宽，反手握住杠铃，掌心朝前。\n\n保持肘部靠近躯干和上臂稳定，呼气并弯举杠铃。\n\n继续抬高杠铃，直到二头肌充分收缩。\n\n在顶部短暂停顿。\n\n吸气并慢慢将杠铃放回起始位置。\n\n重复所需的次数。",
    "primaryMuscleGroupIds": [
      "biceps"
    ],
    "secondaryMuscleGroupIds": [
      "forearms"
    ],
    "provenance": {
      "source": "hasaneyldrm/exercises-dataset",
      "sourceId": "0031",
      "sourceRevision": "118e4bd6b14da6df0e36605d7169b65db18389a4"
    }
  },
  {
    "id": "ex-dumbbell-hammer-curl",
    "name": "哑铃锤式弯举",
    "category": "arms",
    "recordingMode": "weight_reps",
    "loadBasis": "per_hand",
    "countBasis": "whole_set",
    "loadDirection": "higher_better",
    "rateMetric": "none",
    "contextKind": "none",
    "equipment": "dumbbell",
    "description": "站直，双手各持一个哑铃，掌心始终朝向躯干。\n\n保持肘部靠近躯干和上臂稳定。\n\n呼气并屈肘举起哑铃，同时保持中立握法。\n\n在二头肌充分收缩时短暂停顿。\n\n吸气并慢慢将哑铃放回起始位置。\n\n重复所需的次数。",
    "primaryMuscleGroupIds": [
      "biceps"
    ],
    "secondaryMuscleGroupIds": [
      "forearms"
    ],
    "provenance": {
      "source": "hasaneyldrm/exercises-dataset",
      "sourceId": "0313",
      "sourceRevision": "118e4bd6b14da6df0e36605d7169b65db18389a4"
    }
  },
  {
    "id": "ex-triceps-pushdown",
    "name": "绳索三头下压",
    "category": "arms",
    "recordingMode": "weight_reps",
    "loadBasis": "total",
    "countBasis": "whole_set",
    "loadDirection": "higher_better",
    "rateMetric": "none",
    "contextKind": "none",
    "equipment": "cable",
    "description": "将绳索附件连接到缆绳机上的高滑轮上。\n\n面向机器站立，双脚分开与肩同宽，膝盖稍微弯曲。\n\n正手握住绳子，手掌相对。\n\n在整个练习过程中，保持肘部靠近身体两侧，上臂保持静止。\n\n呼气并伸展肘部将绳子向下推，直到手臂完全伸展。\n\n暂停片刻，然后吸气，并让肘部弯曲，慢慢回到起始位置。\n\n重复所需的重复次数。",
    "primaryMuscleGroupIds": [
      "triceps"
    ],
    "secondaryMuscleGroupIds": [
      "forearms"
    ],
    "provenance": {
      "source": "hasaneyldrm/exercises-dataset",
      "sourceId": "0200",
      "sourceRevision": "118e4bd6b14da6df0e36605d7169b65db18389a4"
    }
  },
  {
    "id": "ex-rope-overhead-triceps-extension",
    "name": "绳索过顶臂屈伸",
    "category": "arms",
    "recordingMode": "weight_reps",
    "loadBasis": "total",
    "countBasis": "whole_set",
    "loadDirection": "higher_better",
    "rateMetric": "none",
    "contextKind": "none",
    "equipment": "cable",
    "description": "将绳索连接到高处的缆绳机上。\n\n背对机器站立，双脚与肩同宽。\n\n双手抓住绳子，掌心相对，将双手举过头顶。\n\n保持上臂靠近头部，肘部向前。\n\n弯曲肘部，慢慢将绳子降低到头后。\n\n暂停片刻，然后将手臂伸回到起始位置。\n\n重复所需的重复次数。",
    "primaryMuscleGroupIds": [
      "triceps"
    ],
    "secondaryMuscleGroupIds": [
      "shoulders"
    ],
    "provenance": {
      "source": "hasaneyldrm/exercises-dataset",
      "sourceId": "0194",
      "sourceRevision": "118e4bd6b14da6df0e36605d7169b65db18389a4"
    }
  },
  {
    "id": "ex-dumbbell-seated-triceps-extension",
    "name": "坐姿哑铃过顶臂屈伸",
    "category": "arms",
    "recordingMode": "weight_reps",
    "loadBasis": "total",
    "countBasis": "whole_set",
    "loadDirection": "higher_better",
    "rateMetric": "none",
    "contextKind": "none",
    "equipment": "dumbbell",
    "description": "坐在长凳上，背部挺直，双脚平放在地上。\n\n双手握住哑铃，双臂伸直举过头顶。\n\n弯曲肘部，将哑铃放在脑后，保持上臂靠近耳朵。\n\n暂停片刻，然后伸直手臂，回到起始位置。\n\n重复所需的重复次数。",
    "primaryMuscleGroupIds": [
      "triceps"
    ],
    "secondaryMuscleGroupIds": [
      "shoulders"
    ],
    "provenance": {
      "source": "hasaneyldrm/exercises-dataset",
      "sourceId": "2188",
      "sourceRevision": "118e4bd6b14da6df0e36605d7169b65db18389a4"
    }
  },
  {
    "id": "ex-dead-bug",
    "name": "死虫式",
    "category": "core",
    "recordingMode": "reps",
    "loadBasis": null,
    "countBasis": "per_side",
    "loadDirection": null,
    "rateMetric": "none",
    "contextKind": "none",
    "equipment": "body_weight",
    "description": "平躺，双臂伸向天花板。\n\n弯曲膝盖，将双腿抬离地面，使臀部和膝盖形成 90 度角。\n\n接合你的核心和下背部，将你的下背部压入地面。\n\n慢慢地将右臂和左腿放低至地面，保持它们伸直并悬停在地板上方。\n\n暂停片刻，然后回到起始位置。\n\n用左臂和右腿重复该动作。\n\n继续交替进行所需的重复次数。",
    "primaryMuscleGroupIds": [
      "core"
    ],
    "secondaryMuscleGroupIds": [
      "back"
    ],
    "provenance": {
      "source": "hasaneyldrm/exercises-dataset",
      "sourceId": "0276",
      "sourceRevision": "118e4bd6b14da6df0e36605d7169b65db18389a4"
    }
  },
  {
    "id": "ex-band-pallof-press",
    "name": "弹力带帕洛夫推举",
    "category": "core",
    "recordingMode": "reps",
    "loadBasis": null,
    "countBasis": "per_side",
    "loadDirection": null,
    "rateMetric": "none",
    "contextKind": "none",
    "equipment": "band",
    "description": "将带子固定在腰部高度的坚固锚点上。\n\n垂直于锚点站立，双脚分开与肩同宽。\n\n用双手抓住带子手柄并远离锚点以在带子中产生张力。\n\n将双手放在胸前，保持肘部弯曲并靠近身体。\n\n调动你的核心并保持稳定的姿势。\n\n将手臂伸直至前方，将弹力带推离身体。\n\n保持伸展姿势几秒钟，专注于保持核心紧张。\n\n慢慢地将双手放回胸前，抵抗弹力带的拉力。\n\n重复所需的重复次数。",
    "primaryMuscleGroupIds": [
      "core"
    ],
    "secondaryMuscleGroupIds": [
      "glutes"
    ],
    "provenance": {
      "source": "hasaneyldrm/exercises-dataset",
      "sourceId": "0979",
      "sourceRevision": "118e4bd6b14da6df0e36605d7169b65db18389a4"
    }
  },
  {
    "id": "ex-kneeling-cable-crunch",
    "name": "跪姿绳索卷腹",
    "category": "core",
    "recordingMode": "weight_reps",
    "loadBasis": "total",
    "countBasis": "whole_set",
    "loadDirection": "higher_better",
    "rateMetric": "none",
    "contextKind": "none",
    "equipment": "cable",
    "description": "将绳索手柄连接到高滑轮上，然后面向远离机器的方向跪下。\n\n双手握住绳柄，将其放在脑后，肘部向两侧伸出。\n\n保持臀部不动，弯曲腰部并将躯干向大腿方向挤压。\n\n在底部停顿片刻，然后慢慢回到起始位置。\n\n重复所需的重复次数。",
    "primaryMuscleGroupIds": [
      "core"
    ],
    "secondaryMuscleGroupIds": [],
    "provenance": {
      "source": "hasaneyldrm/exercises-dataset",
      "sourceId": "0175",
      "sourceRevision": "118e4bd6b14da6df0e36605d7169b65db18389a4"
    }
  },
  {
    "id": "ex-ab-wheel-rollout",
    "name": "健腹轮滚动",
    "category": "core",
    "recordingMode": "reps",
    "loadBasis": null,
    "countBasis": "whole_set",
    "loadDirection": null,
    "rateMetric": "none",
    "contextKind": "none",
    "equipment": "ab_wheel",
    "description": "跪在地板上，将滚轮放在您面前。\n\n将双手放在滚轮的手柄上，并将手臂伸直至前方。\n\n调动你的核心肌肉，慢慢向前滚动轮子，保持背部挺直，腹肌紧张。\n\n继续向前滚动，直到身体完全伸展并且手臂举过头顶。\n\n暂停片刻，然后慢慢地将轮子向膝盖方向滚动，保持控制并保持腹肌接合。\n\n重复所需的重复次数。",
    "primaryMuscleGroupIds": [
      "core"
    ],
    "secondaryMuscleGroupIds": [
      "back"
    ],
    "provenance": {
      "source": "hasaneyldrm/exercises-dataset",
      "sourceId": "0857",
      "sourceRevision": "118e4bd6b14da6df0e36605d7169b65db18389a4"
    }
  },
  {
    "id": "ex-side-plank",
    "name": "侧平板支撑",
    "category": "core",
    "recordingMode": "duration",
    "loadBasis": null,
    "countBasis": "per_side",
    "loadDirection": null,
    "rateMetric": "none",
    "contextKind": "none",
    "equipment": "body_weight",
    "description": "侧躺，双腿伸展并叠放在一起。\n\n将前臂放在肩膀正下方的地面上，肘部弯曲成 90 度角。\n\n启动你的核心并将臀部抬离地面，从头到脚形成一条直线。\n\n保持此位置所需的时间。\n\n将臀部放低至起始位置。\n\n在另一侧重复。",
    "primaryMuscleGroupIds": [
      "core"
    ],
    "secondaryMuscleGroupIds": [
      "glutes"
    ],
    "provenance": {
      "source": "hasaneyldrm/exercises-dataset",
      "sourceId": "0705",
      "sourceRevision": "118e4bd6b14da6df0e36605d7169b65db18389a4"
    }
  },
  {
    "id": "ex-running",
    "name": "跑步",
    "category": "cardio",
    "recordingMode": "distance_duration",
    "loadBasis": null,
    "countBasis": "whole_set",
    "loadDirection": null,
    "rateMetric": "distance_per_time",
    "contextKind": "none",
    "equipment": "body_weight",
    "description": "选择安全路线或跑步区域。\n\n保持躯干放松和稳定，以自然步幅完成计划距离或时间。\n\n结束前逐步减速。",
    "primaryMuscleGroupIds": [
      "full_body"
    ],
    "secondaryMuscleGroupIds": [
      "quadriceps",
      "hamstrings",
      "calves"
    ],
    "provenance": {
      "source": "hasaneyldrm/exercises-dataset",
      "sourceId": "0685",
      "sourceRevision": "118e4bd6b14da6df0e36605d7169b65db18389a4"
    }
  },
  {
    "id": "ex-stationary-bike",
    "name": "固定自行车",
    "category": "cardio",
    "recordingMode": "distance_duration",
    "loadBasis": null,
    "countBasis": "whole_set",
    "loadDirection": null,
    "rateMetric": "none",
    "contextKind": "resistance_level",
    "equipment": "stationary_bike",
    "description": "调整座椅高度和位置以确保正确对齐。\n\n将脚放在踏板上，并用带子（如果有）将其固定。\n\n以舒适的速度开始踩踏板。\n\n保持稳定的节奏并根据需要增加阻力。\n\n调动核心肌肉以保持稳定性和正确的姿势。\n\n继续踩踏板达到所需的锻炼时间。\n\n逐渐减小阻力并减速，然后完全停止。\n\n锻炼后伸展双腿并放松。",
    "primaryMuscleGroupIds": [
      "full_body"
    ],
    "secondaryMuscleGroupIds": [
      "quadriceps",
      "hamstrings",
      "calves"
    ],
    "provenance": {
      "source": "hasaneyldrm/exercises-dataset",
      "sourceId": "2138",
      "sourceRevision": "118e4bd6b14da6df0e36605d7169b65db18389a4"
    }
  },
  {
    "id": "ex-jump-rope",
    "name": "跳绳",
    "category": "cardio",
    "recordingMode": "reps",
    "loadBasis": null,
    "countBasis": "whole_set",
    "loadDirection": null,
    "rateMetric": "none",
    "contextKind": "none",
    "equipment": "jump_rope",
    "description": "双手握住跳绳的手柄，掌心向内。\n\n站立，双脚分开与肩同宽，膝盖稍微弯曲。\n\n将绳子甩过头顶，当绳子靠近你的脚时跳过它。\n\n轻轻地用脚掌着地，当绳子再次绕回时重复跳跃。\n\n继续跳跃所需的持续时间或重复次数。",
    "primaryMuscleGroupIds": [
      "full_body"
    ],
    "secondaryMuscleGroupIds": [
      "calves",
      "quadriceps",
      "hamstrings",
      "glutes"
    ],
    "provenance": {
      "source": "hasaneyldrm/exercises-dataset",
      "sourceId": "2612",
      "sourceRevision": "118e4bd6b14da6df0e36605d7169b65db18389a4"
    }
  },
  {
    "id": "ex-elliptical-trainer",
    "name": "椭圆机",
    "category": "cardio",
    "recordingMode": "distance_duration",
    "loadBasis": null,
    "countBasis": "whole_set",
    "loadDirection": null,
    "rateMetric": "none",
    "contextKind": "resistance_level",
    "equipment": "elliptical",
    "description": "将椭圆机的阻力水平和倾斜度调整到您想要的设置。\n\n踩上机器的踏板并轻轻握住手柄。\n\n首先用脚向下压，然后将手柄拉向身体。\n\n继续这个动作，交替推和拉，以模拟行走或跑步动作。\n\n在整个练习过程中保持稳定的步伐并保持核心参与。\n\n继续进行有氧运动所需的持续时间。\n\n下车前逐渐降低机器的强度和速度。",
    "primaryMuscleGroupIds": [
      "full_body"
    ],
    "secondaryMuscleGroupIds": [
      "quadriceps",
      "hamstrings",
      "glutes",
      "calves"
    ],
    "provenance": {
      "source": "hasaneyldrm/exercises-dataset",
      "sourceId": "2141",
      "sourceRevision": "118e4bd6b14da6df0e36605d7169b65db18389a4"
    }
  },
  {
    "id": "ex-cable-standing-fly",
    "name": "站姿绳索夹胸",
    "category": "chest",
    "recordingMode": "weight_reps",
    "loadBasis": "total",
    "countBasis": "whole_set",
    "loadDirection": "higher_better",
    "rateMetric": "none",
    "contextKind": "none",
    "equipment": "cable",
    "description": "将手柄连接到胸部高度的电缆上。\n\n双脚分开与肩同宽站立，背对缆绳机。\n\n正手握住手柄，手掌朝前。\n\n稍微向前一步以在缆绳中产生张力。\n\n在整个练习过程中保持核心参与并保持背部挺直。\n\n肘部稍微弯曲，慢慢地将双臂向前并拢在胸前。\n\n在运动的最高点挤压胸部肌肉。\n\n慢慢扭转动作，将手臂恢复到起始位置。\n\n重复所需的重复次数。",
    "primaryMuscleGroupIds": [
      "chest"
    ],
    "secondaryMuscleGroupIds": [
      "shoulders",
      "triceps"
    ],
    "provenance": {
      "source": "hasaneyldrm/exercises-dataset",
      "sourceId": "0227",
      "sourceRevision": "118e4bd6b14da6df0e36605d7169b65db18389a4"
    }
  },
  {
    "id": "ex-assisted-pull-up",
    "name": "辅助引体向上",
    "category": "back",
    "recordingMode": "weight_reps",
    "loadBasis": "total",
    "countBasis": "whole_set",
    "loadDirection": "lower_better",
    "rateMetric": "none",
    "contextKind": "none",
    "equipment": "machine",
    "description": "将机器调整至您所需的体重和高度设置。\n\n正手握住手柄，握距略宽于肩宽。\n\n双臂完全伸展，双脚离开地面。\n\n收紧背部肌肉，将身体拉向手柄，保持肘部靠近身体。\n\n继续拉，直到下巴位于手柄上方。\n\n在顶部停顿片刻，然后慢慢将身体放回起始位置。\n\n重复所需的重复次数。",
    "primaryMuscleGroupIds": [
      "back"
    ],
    "secondaryMuscleGroupIds": [
      "biceps",
      "forearms"
    ],
    "provenance": {
      "source": "hasaneyldrm/exercises-dataset",
      "sourceId": "0017",
      "sourceRevision": "118e4bd6b14da6df0e36605d7169b65db18389a4"
    }
  },
  {
    "id": "ex-incline-barbell-bench-press",
    "name": "上斜杠铃卧推",
    "category": "chest",
    "recordingMode": "weight_reps",
    "loadBasis": "total",
    "countBasis": "whole_set",
    "loadDirection": "higher_better",
    "rateMetric": "none",
    "contextKind": "none",
    "equipment": "barbell",
    "description": "设置一个 45 度角的上斜凳。\n\n躺在长凳上，双脚平放在地上。\n\n正手握住杠铃，握距略宽于肩宽。\n\n松开杠铃并将其缓慢降低至胸部，保持肘部呈 45 度角。\n\n在底部停顿片刻，然后将杠铃推回到起始位置。\n\n重复所需的重复次数。",
    "primaryMuscleGroupIds": [
      "chest"
    ],
    "secondaryMuscleGroupIds": [
      "shoulders",
      "triceps"
    ],
    "provenance": {
      "source": "hasaneyldrm/exercises-dataset",
      "sourceId": "0047",
      "sourceRevision": "118e4bd6b14da6df0e36605d7169b65db18389a4"
    }
  },
  {
    "id": "ex-seated-barbell-overhead-press",
    "name": "坐姿杠铃推举",
    "category": "shoulders",
    "recordingMode": "weight_reps",
    "loadBasis": "total",
    "countBasis": "whole_set",
    "loadDirection": "higher_better",
    "rateMetric": "none",
    "contextKind": "none",
    "equipment": "barbell",
    "description": "坐在长凳上，背部挺直，双脚平放在地上。\n\n正手握住杠铃，杠铃间距略宽于肩宽。\n\n将杠铃从架子上提起，并将其置于与肩同高的位置，肘部弯曲，手掌朝前。\n\n充分伸展双臂，将杠铃压过头顶。\n\n在顶部停顿片刻，然后慢慢将杠铃放回肩部水平。\n\n重复所需的重复次数。",
    "primaryMuscleGroupIds": [
      "shoulders"
    ],
    "secondaryMuscleGroupIds": [
      "triceps",
      "back"
    ],
    "provenance": {
      "source": "hasaneyldrm/exercises-dataset",
      "sourceId": "0091",
      "sourceRevision": "118e4bd6b14da6df0e36605d7169b65db18389a4"
    }
  },
  {
    "id": "ex-machine-shoulder-press",
    "name": "器械肩推",
    "category": "shoulders",
    "recordingMode": "weight_reps",
    "loadBasis": "total",
    "countBasis": "whole_set",
    "loadDirection": "higher_better",
    "rateMetric": "none",
    "contextKind": "none",
    "equipment": "machine",
    "description": "调整座椅高度并将自己放在机器上，背部靠在靠背上。\n\n正手握住手柄，并将双手置于肩部水平。\n\n向上推动手柄，直到手臂完全伸展，但不要锁住肘部。\n\n在顶部暂停片刻，然后慢慢将手柄放回起始位置。\n\n重复所需的重复次数。",
    "primaryMuscleGroupIds": [
      "shoulders"
    ],
    "secondaryMuscleGroupIds": [
      "triceps",
      "chest"
    ],
    "provenance": {
      "source": "hasaneyldrm/exercises-dataset",
      "sourceId": "0603",
      "sourceRevision": "118e4bd6b14da6df0e36605d7169b65db18389a4"
    }
  },
  {
    "id": "ex-chin-up",
    "name": "反握引体向上",
    "category": "back",
    "recordingMode": "reps",
    "loadBasis": null,
    "countBasis": "whole_set",
    "loadDirection": null,
    "rateMetric": "none",
    "contextKind": "none",
    "equipment": "body_weight",
    "description": "悬挂在引体向上杆上，手掌朝向自己，双手与肩同宽。\n\n启动核心肌群，将身体拉向杠铃杆，以胸部为主导。\n\n继续拉，直到下巴位于杠铃上方。\n\n在顶部停顿片刻，然后慢慢将身体放回起始位置。\n\n重复所需的重复次数。",
    "primaryMuscleGroupIds": [
      "back"
    ],
    "secondaryMuscleGroupIds": [
      "biceps",
      "forearms"
    ],
    "provenance": {
      "source": "hasaneyldrm/exercises-dataset",
      "sourceId": "1326",
      "sourceRevision": "118e4bd6b14da6df0e36605d7169b65db18389a4"
    }
  },
  {
    "id": "ex-inverted-row",
    "name": "自重反向划船",
    "category": "back",
    "recordingMode": "reps",
    "loadBasis": null,
    "countBasis": "whole_set",
    "loadDirection": null,
    "rateMetric": "none",
    "contextKind": "none",
    "equipment": "body_weight",
    "description": "在腰部高度设置一个杠铃或使用悬挂训练器。\n\n面向杠铃或悬吊训练器站立，双脚分开与肩同宽。\n\n正手握住杠铃或手柄，握距略宽于肩宽。\n\n向后倾斜，保持身体挺直，脚后跟着地。\n\n将胸部拉向杠铃或手柄，将肩胛骨挤压在一起。\n\n在顶部停顿片刻，然后慢慢降低回到起始位置。\n\n重复所需的重复次数。",
    "primaryMuscleGroupIds": [
      "back"
    ],
    "secondaryMuscleGroupIds": [
      "biceps",
      "forearms"
    ],
    "provenance": {
      "source": "hasaneyldrm/exercises-dataset",
      "sourceId": "0499",
      "sourceRevision": "118e4bd6b14da6df0e36605d7169b65db18389a4"
    }
  },
  {
    "id": "ex-straight-arm-cable-pulldown",
    "name": "直臂绳索下拉",
    "category": "back",
    "recordingMode": "weight_reps",
    "loadBasis": "total",
    "countBasis": "whole_set",
    "loadDirection": "higher_better",
    "rateMetric": "none",
    "contextKind": "none",
    "equipment": "cable",
    "description": "将直杆连接到缆绳机的高滑轮上。\n\n面向机器站立，双脚分开与肩同宽。\n\n正手握住杠铃，保持手臂伸直，手掌朝下。\n\n收紧背阔肌并将杠铃向下拉向大腿，在整个运动过程中保持手臂伸直。\n\n在底部暂停片刻，然后慢慢地将杠铃返回到起始位置。\n\n重复所需的重复次数。",
    "primaryMuscleGroupIds": [
      "back"
    ],
    "secondaryMuscleGroupIds": [
      "shoulders",
      "biceps"
    ],
    "provenance": {
      "source": "hasaneyldrm/exercises-dataset",
      "sourceId": "0238",
      "sourceRevision": "118e4bd6b14da6df0e36605d7169b65db18389a4"
    }
  },
  {
    "id": "ex-barbell-front-squat",
    "name": "杠铃前蹲",
    "category": "legs",
    "recordingMode": "weight_reps",
    "loadBasis": "total",
    "countBasis": "whole_set",
    "loadDirection": "higher_better",
    "rateMetric": "none",
    "contextKind": "none",
    "equipment": "barbell",
    "description": "首先站立，双脚分开与肩同宽，脚趾稍微向外。\n\n将杠铃放在肩膀前面，将其放在锁骨和肩膀上。\n\n当你将身体降低到蹲姿时，收紧核心并保持挺胸，将臀部向后推并弯曲膝盖。\n\n降低直到大腿与地面平行，或者尽可能降低到您能舒服的高度。\n\n在底部停顿片刻，然后推动脚后跟回到起始位置。\n\n重复所需的重复次数。",
    "primaryMuscleGroupIds": [
      "quadriceps",
      "glutes"
    ],
    "secondaryMuscleGroupIds": [
      "hamstrings",
      "calves",
      "core"
    ],
    "provenance": {
      "source": "hasaneyldrm/exercises-dataset",
      "sourceId": "0042",
      "sourceRevision": "118e4bd6b14da6df0e36605d7169b65db18389a4"
    }
  },
  {
    "id": "ex-dumbbell-romanian-deadlift",
    "name": "哑铃罗马尼亚硬拉",
    "category": "legs",
    "recordingMode": "weight_reps",
    "loadBasis": "per_hand",
    "countBasis": "whole_set",
    "loadDirection": "higher_better",
    "rateMetric": "none",
    "contextKind": "none",
    "equipment": "dumbbell",
    "description": "双脚分开与肩同宽站立，双手各握一个哑铃，正握。\n\n保持背部挺直，核心收紧，以臀部为铰链，将哑铃向地面降低，让膝盖稍微弯曲。\n\n降低哑铃，直到感觉到腿筋拉伸，然后推动脚后跟并收紧臀肌，回到起始位置。\n\n重复所需的重复次数。",
    "primaryMuscleGroupIds": [
      "glutes"
    ],
    "secondaryMuscleGroupIds": [
      "hamstrings",
      "back"
    ],
    "provenance": {
      "source": "hasaneyldrm/exercises-dataset",
      "sourceId": "1459",
      "sourceRevision": "118e4bd6b14da6df0e36605d7169b65db18389a4"
    }
  },
  {
    "id": "ex-lying-leg-curl",
    "name": "俯卧腿弯举",
    "category": "legs",
    "recordingMode": "weight_reps",
    "loadBasis": "total",
    "countBasis": "whole_set",
    "loadDirection": "higher_better",
    "rateMetric": "none",
    "contextKind": "none",
    "equipment": "machine",
    "description": "调整机器以适合您的身体并选择所需的重量。\n\n面朝下躺在机器上，双腿伸直，脚跟靠在带衬垫的杠杆上。\n\n抓住机器的手柄或侧面以保持稳定性。\n\n保持上半身静止，呼气并尽可能向上弯曲双腿，但不要将臀部抬离垫子。\n\n挤压腿筋时，保持收缩位置短暂停顿。\n\n吸气并缓慢地将控制杆降低回起始位置。\n\n重复所需的重复次数。",
    "primaryMuscleGroupIds": [
      "hamstrings"
    ],
    "secondaryMuscleGroupIds": [
      "calves"
    ],
    "provenance": {
      "source": "hasaneyldrm/exercises-dataset",
      "sourceId": "0586",
      "sourceRevision": "118e4bd6b14da6df0e36605d7169b65db18389a4"
    }
  },
  {
    "id": "ex-machine-seated-calf-raise",
    "name": "器械坐姿提踵",
    "category": "legs",
    "recordingMode": "weight_reps",
    "loadBasis": "total",
    "countBasis": "whole_set",
    "loadDirection": "higher_better",
    "rateMetric": "none",
    "contextKind": "none",
    "equipment": "machine",
    "description": "调整座椅高度，使膝盖稍微弯曲，双脚平放在踏板上。\n\n将脚趾放在踏板上，脚跟悬在踏板边缘。\n\n抓住把手或座椅侧面以保持稳定性。\n\n推动脚掌，将脚后跟尽可能抬高。\n\n在顶部停顿片刻，然后慢慢降低脚后跟回到起始位置。\n\n重复所需的重复次数。",
    "primaryMuscleGroupIds": [
      "calves"
    ],
    "secondaryMuscleGroupIds": [],
    "provenance": {
      "source": "hasaneyldrm/exercises-dataset",
      "sourceId": "0594",
      "sourceRevision": "118e4bd6b14da6df0e36605d7169b65db18389a4"
    }
  },
  {
    "id": "ex-machine-hip-abduction",
    "name": "器械髋外展",
    "category": "legs",
    "recordingMode": "weight_reps",
    "loadBasis": "total",
    "countBasis": "whole_set",
    "loadDirection": "higher_better",
    "rateMetric": "none",
    "contextKind": "none",
    "equipment": "machine",
    "description": "调整座椅高度，使膝盖成 90 度角。\n\n坐在机器上，背部靠在靠背上，双脚放在脚踏板上。\n\n将手放在侧手柄上以保持稳定性。\n\n启动外展肌并慢慢将双腿分开，远离身体中线。\n\n动作结束时暂停片刻，然后慢慢将双腿放回到起始位置。\n\n重复所需的重复次数。",
    "primaryMuscleGroupIds": [
      "abductors"
    ],
    "secondaryMuscleGroupIds": [
      "glutes",
      "hamstrings"
    ],
    "provenance": {
      "source": "hasaneyldrm/exercises-dataset",
      "sourceId": "0597",
      "sourceRevision": "118e4bd6b14da6df0e36605d7169b65db18389a4"
    }
  },
  {
    "id": "ex-machine-hip-adduction",
    "name": "器械髋内收",
    "category": "legs",
    "recordingMode": "weight_reps",
    "loadBasis": "total",
    "countBasis": "whole_set",
    "loadDirection": "higher_better",
    "rateMetric": "none",
    "contextKind": "none",
    "equipment": "machine",
    "description": "调整座椅高度并将自己放在机器上，背部靠在靠背上。\n\n将脚放在脚踏板上并抓住手柄以保持稳定。\n\n收紧内收肌，慢慢将双腿并拢，挤压大腿内侧。\n\n在收缩高峰时暂停片刻，然后慢慢回到起始位置。\n\n重复所需的重复次数。",
    "primaryMuscleGroupIds": [
      "adductors"
    ],
    "secondaryMuscleGroupIds": [
      "hamstrings",
      "glutes"
    ],
    "provenance": {
      "source": "hasaneyldrm/exercises-dataset",
      "sourceId": "0598",
      "sourceRevision": "118e4bd6b14da6df0e36605d7169b65db18389a4"
    }
  },
  {
    "id": "ex-barbell-wrist-curl",
    "name": "杠铃腕弯举",
    "category": "arms",
    "recordingMode": "weight_reps",
    "loadBasis": "total",
    "countBasis": "whole_set",
    "loadDirection": "higher_better",
    "rateMetric": "none",
    "contextKind": "none",
    "equipment": "barbell",
    "description": "坐在长凳上，双脚平放在地面上，前臂放在大腿上，反握杠铃。\n\n让杠铃向下滚动到指尖，保持手腕伸直。\n\n弯曲手腕，慢慢地将杠铃向上卷向前臂。\n\n在顶部停顿片刻，然后慢慢将杠铃放回起始位置。\n\n重复所需的重复次数。",
    "primaryMuscleGroupIds": [
      "forearms"
    ],
    "secondaryMuscleGroupIds": [
      "biceps"
    ],
    "provenance": {
      "source": "hasaneyldrm/exercises-dataset",
      "sourceId": "0126",
      "sourceRevision": "118e4bd6b14da6df0e36605d7169b65db18389a4"
    }
  },
  {
    "id": "ex-weighted-russian-twist",
    "name": "负重俄罗斯转体",
    "category": "core",
    "recordingMode": "weight_reps",
    "loadBasis": "total",
    "countBasis": "whole_set",
    "loadDirection": "higher_better",
    "rateMetric": "none",
    "contextKind": "none",
    "equipment": "external_weight",
    "description": "坐在地上，膝盖弯曲，双脚平放在地板上。\n\n双手握住重物球或健身球放在胸前。\n\n稍微向后倾斜，保持背部挺直，核心肌群参与。\n\n在可控范围内慢慢将躯干向右转动，将重物移向身体右侧。\n\n短暂停顿，然后在可控范围内将躯干向左转动，将重物移向身体左侧。\n\n继续交替完成计划次数；左右各转一次算 1 次。",
    "primaryMuscleGroupIds": [
      "core"
    ],
    "secondaryMuscleGroupIds": [
      "back"
    ],
    "provenance": {
      "source": "hasaneyldrm/exercises-dataset",
      "sourceId": "0846",
      "sourceRevision": "118e4bd6b14da6df0e36605d7169b65db18389a4"
    }
  },
  {
    "id": "ex-bench-hyperextension",
    "name": "罗马椅背伸",
    "category": "back",
    "recordingMode": "reps",
    "loadBasis": null,
    "countBasis": "whole_set",
    "loadDirection": null,
    "rateMetric": "none",
    "contextKind": "none",
    "equipment": "body_weight",
    "description": "调整过度伸展凳，使臀部舒适地放在垫子上，并且双脚固定。\n\n双臂交叉放在胸前或将双手放在脑后。\n\n慢慢地将上半身降低到地面，同时保持背部挺直。\n\n在底部停顿片刻，然后抬起上半身，直到与双腿成一直线。\n\n重复所需的重复次数。",
    "primaryMuscleGroupIds": [
      "back"
    ],
    "secondaryMuscleGroupIds": [
      "glutes",
      "hamstrings"
    ],
    "provenance": {
      "source": "hasaneyldrm/exercises-dataset",
      "sourceId": "0488",
      "sourceRevision": "118e4bd6b14da6df0e36605d7169b65db18389a4"
    }
  },
  {
    "id": "ex-burpee",
    "name": "波比跳",
    "category": "cardio",
    "recordingMode": "reps",
    "loadBasis": null,
    "countBasis": "whole_set",
    "loadDirection": null,
    "rateMetric": "none",
    "contextKind": "none",
    "equipment": "body_weight",
    "description": "从站立位置开始，双脚分开与肩同宽。\n\n弯曲膝盖并将双手放在身前的地板上，将身体降低至蹲姿。\n\n将脚踢回到俯卧撑位置。\n\n进行俯卧撑，保持身体呈一条直线。\n\n将双脚跳回蹲姿。\n\n爆发性地跳起，将双臂举过头顶。\n\n轻轻落地并立即回到蹲姿，开始下一次重复。",
    "primaryMuscleGroupIds": [
      "full_body"
    ],
    "secondaryMuscleGroupIds": [
      "quadriceps",
      "hamstrings",
      "calves",
      "shoulders",
      "chest"
    ],
    "provenance": {
      "source": "hasaneyldrm/exercises-dataset",
      "sourceId": "1160",
      "sourceRevision": "118e4bd6b14da6df0e36605d7169b65db18389a4"
    }
  },
  {
    "id": "ex-mountain-climber",
    "name": "登山跑",
    "category": "cardio",
    "recordingMode": "reps",
    "loadBasis": null,
    "countBasis": "whole_set",
    "loadDirection": null,
    "rateMetric": "none",
    "contextKind": "none",
    "equipment": "body_weight",
    "description": "从高平板支撑位置开始，双手直接放在肩膀下方，身体呈一条直线。\n\n启动你的核心并将你的右膝盖靠近你的胸部，然后快速切换并将你的左膝盖靠近你的胸部。\n\n继续以跑步动作交替双腿，保持臀部较低，核心肌群参与。\n\n在整个练习过程中保持稳定的节奏和均匀的呼吸。\n\n重复所需的重复次数。",
    "primaryMuscleGroupIds": [
      "full_body"
    ],
    "secondaryMuscleGroupIds": [
      "core",
      "shoulders",
      "triceps"
    ],
    "provenance": {
      "source": "hasaneyldrm/exercises-dataset",
      "sourceId": "0630",
      "sourceRevision": "118e4bd6b14da6df0e36605d7169b65db18389a4"
    }
  },
  {
    "id": "ex-stepmill",
    "name": "爬楼机",
    "category": "cardio",
    "recordingMode": "reps_duration",
    "loadBasis": null,
    "countBasis": "whole_set",
    "loadDirection": null,
    "rateMetric": "reps_per_time",
    "contextKind": "none",
    "equipment": "stepmill",
    "description": "将爬楼机调整到舒适的强度。\n\n踏上机器，可轻扶扶手以保持稳定。\n\n开始登阶时双腿交替踏上连续循环的阶梯。\n\n保持躯干直立并收紧核心。\n\n继续完成计划时间或步数。\n\n结束前逐渐降低强度或速度。",
    "primaryMuscleGroupIds": [
      "full_body"
    ],
    "secondaryMuscleGroupIds": [
      "quadriceps",
      "hamstrings",
      "glutes",
      "calves"
    ],
    "provenance": {
      "source": "hasaneyldrm/exercises-dataset",
      "sourceId": "2311",
      "sourceRevision": "118e4bd6b14da6df0e36605d7169b65db18389a4"
    }
  },
  {
    "id": "ex-dumbbell-bench-press",
    "name": "哑铃卧推",
    "category": "chest",
    "recordingMode": "weight_reps",
    "loadBasis": "per_hand",
    "countBasis": "whole_set",
    "loadDirection": "higher_better",
    "rateMetric": "none",
    "contextKind": "none",
    "equipment": "dumbbell",
    "description": "平躺在长凳上，双脚平放在地上，背部紧贴长凳。\n\n双手各握一个哑铃，手掌朝前，双臂伸至胸部上方。\n\n慢慢将哑铃降低到胸部两侧，肘部保持在舒适角度。\n\n短暂停顿，然后将哑铃推回起始位置，手臂接近伸直。\n\n重复所需的次数。",
    "primaryMuscleGroupIds": [
      "chest"
    ],
    "secondaryMuscleGroupIds": [
      "triceps",
      "shoulders"
    ],
    "provenance": {
      "source": "hasaneyldrm/exercises-dataset",
      "sourceId": "0289",
      "sourceRevision": "118e4bd6b14da6df0e36605d7169b65db18389a4"
    }
  },
  {
    "id": "ex-dumbbell-fly",
    "name": "哑铃飞鸟",
    "category": "chest",
    "recordingMode": "weight_reps",
    "loadBasis": "per_hand",
    "countBasis": "whole_set",
    "loadDirection": "higher_better",
    "rateMetric": "none",
    "contextKind": "none",
    "equipment": "dumbbell",
    "description": "平躺在长凳上，双手各握一个哑铃，手掌相对。\n\n将手臂伸直越过胸部，肘部稍微弯曲。\n\n保持肘部轻微弯曲，将手臂以宽弧线向两侧放低，直到感觉到胸部有拉伸感。\n\n暂停片刻，然后反转动作，将哑铃拉回到起始位置。\n\n重复所需的重复次数。",
    "primaryMuscleGroupIds": [
      "chest"
    ],
    "secondaryMuscleGroupIds": [
      "shoulders"
    ],
    "provenance": {
      "source": "hasaneyldrm/exercises-dataset",
      "sourceId": "0308",
      "sourceRevision": "118e4bd6b14da6df0e36605d7169b65db18389a4"
    }
  },
  {
    "id": "ex-machine-chest-fly",
    "name": "蝴蝶机夹胸",
    "category": "chest",
    "recordingMode": "weight_reps",
    "loadBasis": "total",
    "countBasis": "whole_set",
    "loadDirection": "higher_better",
    "rateMetric": "none",
    "contextKind": "none",
    "equipment": "machine",
    "description": "调整座椅高度并坐在器械上，背部靠在垫子上。\n\n正手握住把手，肘部保持轻微弯曲。\n\n呼气并将双臂向胸前合拢。\n\n短暂停顿，收缩胸部肌肉。\n\n吸气并慢慢回到起始位置，让胸部肌肉受控伸展。\n\n重复所需的次数。",
    "primaryMuscleGroupIds": [
      "chest"
    ],
    "secondaryMuscleGroupIds": [
      "shoulders"
    ],
    "provenance": {
      "source": "hasaneyldrm/exercises-dataset",
      "sourceId": "0596",
      "sourceRevision": "118e4bd6b14da6df0e36605d7169b65db18389a4"
    }
  },
  {
    "id": "ex-machine-reverse-fly",
    "name": "蝴蝶机反向飞鸟",
    "category": "shoulders",
    "recordingMode": "weight_reps",
    "loadBasis": "total",
    "countBasis": "whole_set",
    "loadDirection": "higher_better",
    "rateMetric": "none",
    "contextKind": "none",
    "equipment": "machine",
    "description": "调整座椅高度，将自己放在机器上，胸部靠在垫子上，双脚平放在地板上。\n\n正手握住手柄，并保持手臂稍微弯曲。\n\n呼气并将肩胛骨挤压在一起，同时向后和向外拉动手柄，使其远离身体。\n\n在收缩峰值时停顿片刻，然后吸气，慢慢回到起始位置。\n\n重复所需的重复次数。",
    "primaryMuscleGroupIds": [
      "shoulders"
    ],
    "secondaryMuscleGroupIds": [
      "back"
    ],
    "provenance": {
      "source": "hasaneyldrm/exercises-dataset",
      "sourceId": "0602",
      "sourceRevision": "118e4bd6b14da6df0e36605d7169b65db18389a4"
    }
  },
  {
    "id": "ex-dumbbell-reverse-lunge",
    "name": "哑铃后撤弓步",
    "category": "legs",
    "recordingMode": "weight_reps",
    "loadBasis": "per_hand",
    "countBasis": "per_side",
    "loadDirection": "higher_better",
    "rateMetric": "none",
    "contextKind": "none",
    "equipment": "dumbbell",
    "description": "双脚约与肩同宽站立，每只手各握一个哑铃。\n\n一脚向后迈出，将身体降低至弓步位置。\n\n弯曲前膝，将身体降低至可控深度，保持前膝与脚尖方向一致。\n\n短暂停顿，然后由前脚发力回到起始位置。\n\n换另一侧重复。",
    "primaryMuscleGroupIds": [
      "quadriceps",
      "glutes"
    ],
    "secondaryMuscleGroupIds": [
      "hamstrings",
      "calves"
    ],
    "provenance": {
      "source": "hasaneyldrm/exercises-dataset",
      "sourceId": "0381",
      "sourceRevision": "118e4bd6b14da6df0e36605d7169b65db18389a4"
    }
  },
  {
    "id": "ex-barbell-zercher-squat",
    "name": "杠铃泽奇深蹲",
    "category": "legs",
    "recordingMode": "weight_reps",
    "loadBasis": "total",
    "countBasis": "whole_set",
    "loadDirection": "higher_better",
    "rateMetric": "none",
    "contextKind": "none",
    "equipment": "barbell",
    "description": "双脚约与肩同宽站立，脚尖稍微外翻。\n\n将杠铃放在肘窝，双手握住杠铃以保持稳定。\n\n收紧核心并保持胸部抬起，屈髋屈膝降低至蹲姿。\n\n保持膝盖与脚尖方向一致。\n\n在深蹲底部短暂停顿，然后双脚稳定发力回到起始位置。\n\n重复所需的次数。",
    "primaryMuscleGroupIds": [
      "quadriceps",
      "glutes"
    ],
    "secondaryMuscleGroupIds": [
      "hamstrings",
      "calves",
      "core"
    ],
    "provenance": {
      "source": "hasaneyldrm/exercises-dataset",
      "sourceId": "0127",
      "sourceRevision": "118e4bd6b14da6df0e36605d7169b65db18389a4"
    }
  },
  {
    "id": "ex-dumbbell-arnold-press",
    "name": "阿诺德推举",
    "category": "shoulders",
    "recordingMode": "weight_reps",
    "loadBasis": "per_hand",
    "countBasis": "whole_set",
    "loadDirection": "higher_better",
    "rateMetric": "none",
    "contextKind": "none",
    "equipment": "dumbbell",
    "description": "坐在有背部支撑的长凳上，双手各握一个哑铃置于肩前，掌心朝向身体，肘部弯曲。\n\n向上推举哑铃，同时转动前臂，使掌心逐渐朝前。\n\n手臂接近伸直时短暂停顿。\n\n慢慢反转动作，将哑铃放回起始位置。\n\n重复所需的次数。",
    "primaryMuscleGroupIds": [
      "shoulders"
    ],
    "secondaryMuscleGroupIds": [
      "triceps",
      "chest"
    ],
    "provenance": {
      "source": "hasaneyldrm/exercises-dataset",
      "sourceId": "2137",
      "sourceRevision": "118e4bd6b14da6df0e36605d7169b65db18389a4"
    }
  },
  {
    "id": "ex-dumbbell-front-raise",
    "name": "哑铃前平举",
    "category": "shoulders",
    "recordingMode": "weight_reps",
    "loadBasis": "per_hand",
    "countBasis": "whole_set",
    "loadDirection": "higher_better",
    "rateMetric": "none",
    "contextKind": "none",
    "equipment": "dumbbell",
    "description": "双脚约与肩同宽站立，双手各握一个哑铃，掌心朝向大腿。\n\n保持躯干稳定和肘部微屈，呼气并将哑铃举至身前肩高附近。\n\n在顶部短暂停顿。\n\n吸气并慢慢将哑铃放回起始位置。\n\n重复所需的次数。",
    "primaryMuscleGroupIds": [
      "shoulders"
    ],
    "secondaryMuscleGroupIds": [
      "back"
    ],
    "provenance": {
      "source": "hasaneyldrm/exercises-dataset",
      "sourceId": "0310",
      "sourceRevision": "118e4bd6b14da6df0e36605d7169b65db18389a4"
    }
  },
  {
    "id": "ex-cable-one-arm-lateral-raise",
    "name": "单臂绳索侧平举",
    "category": "shoulders",
    "recordingMode": "weight_reps",
    "loadBasis": "total",
    "countBasis": "per_side",
    "loadDirection": "higher_better",
    "rateMetric": "none",
    "contextKind": "none",
    "equipment": "cable",
    "description": "将滑轮调至低位，面向绳索机站立。\n\n单手握住把手并调整站位，使绳索在起始位置保持张力。\n\n保持躯干稳定和肘部微屈，慢慢将手臂向侧方抬至肩高附近。\n\n在顶部短暂停顿，然后慢慢将手臂放回起始位置。\n\n重复所需的次数，然后换边。",
    "primaryMuscleGroupIds": [
      "shoulders"
    ],
    "secondaryMuscleGroupIds": [
      "back"
    ],
    "provenance": {
      "source": "hasaneyldrm/exercises-dataset",
      "sourceId": "0192",
      "sourceRevision": "118e4bd6b14da6df0e36605d7169b65db18389a4"
    }
  },
  {
    "id": "ex-floor-crunch",
    "name": "卷腹",
    "category": "core",
    "recordingMode": "reps",
    "loadBasis": null,
    "countBasis": "whole_set",
    "loadDirection": null,
    "rateMetric": "none",
    "contextKind": "none",
    "equipment": "body_weight",
    "description": "平躺，膝盖弯曲，双脚平放在地上。\n\n双手轻放在头部两侧，肘部朝外，不要用手拉颈部。\n\n收紧腹部，将肩胛骨抬离地面，使胸廓卷向骨盆。\n\n在顶部短暂停顿，然后慢慢将肩膀放回起始位置。\n\n重复所需的次数。",
    "primaryMuscleGroupIds": [
      "core"
    ],
    "secondaryMuscleGroupIds": [],
    "provenance": {
      "source": "hasaneyldrm/exercises-dataset",
      "sourceId": "0274",
      "sourceRevision": "118e4bd6b14da6df0e36605d7169b65db18389a4"
    }
  },
  {
    "id": "ex-hanging-straight-leg-raise",
    "name": "悬垂直腿举腿",
    "category": "core",
    "recordingMode": "reps",
    "loadBasis": null,
    "countBasis": "whole_set",
    "loadDirection": null,
    "rateMetric": "none",
    "contextKind": "none",
    "equipment": "body_weight",
    "description": "正握悬挂在横杠上，双臂伸展。\n\n收紧核心并保持躯干稳定，将伸直的双腿抬到身体前方。\n\n继续抬至可控且舒适的高度，避免摆动借力。\n\n在顶部短暂停顿，然后慢慢将双腿放回起始位置。\n\n重复所需的次数。",
    "primaryMuscleGroupIds": [
      "core"
    ],
    "secondaryMuscleGroupIds": [],
    "provenance": {
      "source": "hasaneyldrm/exercises-dataset",
      "sourceId": "0472",
      "sourceRevision": "118e4bd6b14da6df0e36605d7169b65db18389a4"
    }
  },
  {
    "id": "ex-machine-hack-squat",
    "name": "哈克深蹲",
    "category": "legs",
    "recordingMode": "weight_reps",
    "loadBasis": "total",
    "countBasis": "whole_set",
    "loadDirection": "higher_better",
    "rateMetric": "none",
    "contextKind": "none",
    "equipment": "machine",
    "description": "将哈克深蹲机调整到适合自己身高的位置，让背部稳定贴住靠垫。\n\n双脚约与肩同宽站在踏板上，脚尖稍微向外。\n\n握住把手以保持稳定。\n\n弯曲膝盖和臀部，将身体降低至可控深度，保持膝盖与脚尖方向一致。\n\n短暂停顿，然后双脚稳定发力将身体推回起始位置。\n\n重复所需的次数。",
    "primaryMuscleGroupIds": [
      "quadriceps",
      "glutes"
    ],
    "secondaryMuscleGroupIds": [
      "hamstrings",
      "calves"
    ],
    "provenance": {
      "source": "hasaneyldrm/exercises-dataset",
      "sourceId": "0743",
      "sourceRevision": "118e4bd6b14da6df0e36605d7169b65db18389a4"
    }
  },
  {
    "id": "ex-dumbbell-single-leg-deadlift",
    "name": "哑铃单腿硬拉",
    "category": "legs",
    "recordingMode": "weight_reps",
    "loadBasis": "total",
    "countBasis": "per_side",
    "loadDirection": "higher_better",
    "rateMetric": "none",
    "contextKind": "none",
    "equipment": "dumbbell",
    "description": "双脚约与髋同宽站立，单手握住哑铃。\n\n将体重转移到支撑腿，另一只脚稍微抬离地面。\n\n保持背部中立和支撑膝微屈，将髋部向后移动并降低哑铃。\n\n同时将非支撑腿向后伸展，躯干在可控范围内前倾。\n\n短暂停顿，然后收紧臀肌和腿后侧，伸髋回到起始位置。\n\n重复所需的次数，然后换边。",
    "primaryMuscleGroupIds": [
      "glutes",
      "hamstrings"
    ],
    "secondaryMuscleGroupIds": [
      "back"
    ],
    "provenance": {
      "source": "hasaneyldrm/exercises-dataset",
      "sourceId": "1757",
      "sourceRevision": "118e4bd6b14da6df0e36605d7169b65db18389a4"
    }
  },
  {
    "id": "ex-trap-bar-deadlift",
    "name": "六角杠硬拉",
    "category": "legs",
    "recordingMode": "weight_reps",
    "loadBasis": "total",
    "countBasis": "whole_set",
    "loadDirection": "higher_better",
    "rateMetric": "none",
    "contextKind": "none",
    "equipment": "trap_bar",
    "description": "站在六角杠中央，双脚约与髋同宽。\n\n屈髋屈膝降低身体，握住两侧把手。\n\n保持背部中立和躯干稳定，伸展臀部和膝盖，将六角杠提离地面。\n\n站稳后短暂停顿。\n\n受控屈髋屈膝，将六角杠放回地面。\n\n重复所需的次数。",
    "primaryMuscleGroupIds": [
      "glutes",
      "quadriceps"
    ],
    "secondaryMuscleGroupIds": [
      "hamstrings",
      "back"
    ],
    "provenance": {
      "source": "hasaneyldrm/exercises-dataset",
      "sourceId": "0811",
      "sourceRevision": "118e4bd6b14da6df0e36605d7169b65db18389a4"
    }
  },
  {
    "id": "ex-barbell-preacher-curl",
    "name": "杠铃牧师凳弯举",
    "category": "arms",
    "recordingMode": "weight_reps",
    "loadBasis": "total",
    "countBasis": "whole_set",
    "loadDirection": "higher_better",
    "rateMetric": "none",
    "contextKind": "none",
    "equipment": "barbell",
    "description": "坐在牧师凳上，上臂放在垫子上，胸部靠在支撑物上。\n\n反手握住杠铃，握距略宽于肩宽。\n\n保持上臂静止，呼气并将杠铃向上弯向肩膀。\n\n在顶部暂停片刻，挤压你的二头肌。\n\n吸气并慢慢将杠铃放回起始位置。\n\n重复所需的重复次数。",
    "primaryMuscleGroupIds": [
      "biceps"
    ],
    "secondaryMuscleGroupIds": [
      "forearms"
    ],
    "provenance": {
      "source": "hasaneyldrm/exercises-dataset",
      "sourceId": "0070",
      "sourceRevision": "118e4bd6b14da6df0e36605d7169b65db18389a4"
    }
  },
  {
    "id": "ex-barbell-lying-triceps-extension",
    "name": "杠铃仰卧臂屈伸",
    "category": "arms",
    "recordingMode": "weight_reps",
    "loadBasis": "total",
    "countBasis": "whole_set",
    "loadDirection": "higher_better",
    "rateMetric": "none",
    "contextKind": "none",
    "equipment": "barbell",
    "description": "平躺在长凳上，双脚平放在地上。\n\n正手握住杠铃，双手约与肩同宽，将手臂伸至胸部上方。\n\n保持上臂相对稳定，弯曲肘部，慢慢将杠铃降低到前额上方。\n\n短暂停顿，然后伸肘将杠铃推回起始位置。\n\n重复所需的次数。",
    "primaryMuscleGroupIds": [
      "triceps"
    ],
    "secondaryMuscleGroupIds": [
      "shoulders"
    ],
    "provenance": {
      "source": "hasaneyldrm/exercises-dataset",
      "sourceId": "0060",
      "sourceRevision": "118e4bd6b14da6df0e36605d7169b65db18389a4"
    }
  },
  {
    "id": "ex-incline-treadmill-walk",
    "name": "跑步机爬坡走",
    "category": "cardio",
    "recordingMode": "distance_duration",
    "loadBasis": null,
    "countBasis": "whole_set",
    "loadDirection": null,
    "rateMetric": "distance_per_time",
    "contextKind": "incline_percent",
    "equipment": "machine",
    "description": "将跑步机坡度调整到计划强度。\n\n站在跑步机上，以舒适步幅开始行走。\n\n保持躯干稳定和背部自然直立。\n\n继续在坡度跑步机上行走，完成计划距离或时间。\n\n结束前逐渐降低坡度和速度，然后停止。",
    "primaryMuscleGroupIds": [
      "full_body"
    ],
    "secondaryMuscleGroupIds": [
      "quadriceps",
      "hamstrings",
      "calves"
    ],
    "provenance": {
      "source": "hasaneyldrm/exercises-dataset",
      "sourceId": "3666",
      "sourceRevision": "118e4bd6b14da6df0e36605d7169b65db18389a4"
    }
  },
  {
    "id": "ex-standing-cable-chest-press",
    "name": "站姿绳索胸前推",
    "category": "chest",
    "recordingMode": "weight_reps",
    "loadBasis": "total",
    "countBasis": "whole_set",
    "loadDirection": "higher_better",
    "rateMetric": "none",
    "contextKind": "none",
    "equipment": "cable",
    "description": "将绳索机调整至胸部高度并安装把手。\n\n背对器械站立，向前迈一步，使绳索保持张力。\n\n双脚踩稳并收紧核心，将双手置于胸前。\n\n向前推动把手，直到手臂接近伸直。\n\n短暂停顿，然后慢慢将双手放回起始位置。\n\n重复所需的次数。",
    "primaryMuscleGroupIds": [
      "chest"
    ],
    "secondaryMuscleGroupIds": [
      "triceps",
      "shoulders"
    ],
    "provenance": {
      "source": "hasaneyldrm/exercises-dataset",
      "sourceId": "0151",
      "sourceRevision": "118e4bd6b14da6df0e36605d7169b65db18389a4"
    }
  },
  {
    "id": "ex-kettlebell-renegade-row",
    "name": "壶铃交替俯卧撑位划船",
    "category": "back",
    "recordingMode": "weight_reps",
    "loadBasis": "per_hand",
    "countBasis": "per_side",
    "loadDirection": "higher_better",
    "rateMetric": "none",
    "contextKind": "none",
    "equipment": "kettlebell",
    "description": "从高位平板支撑开始，双手各握一个等重壶铃，双脚分开站稳。\n\n收紧核心，保持身体从头到脚跟接近一条直线。\n\n将一个壶铃拉向肋侧，保持肘部靠近身体并避免躯干旋转。\n\n受控将壶铃放回起始位置，然后换另一只手臂。\n\n继续交替完成每侧计划次数。",
    "primaryMuscleGroupIds": [
      "back"
    ],
    "secondaryMuscleGroupIds": [
      "core",
      "shoulders"
    ],
    "provenance": {
      "source": "hasaneyldrm/exercises-dataset",
      "sourceId": "0521",
      "sourceRevision": "118e4bd6b14da6df0e36605d7169b65db18389a4"
    }
  },
  {
    "id": "ex-overhead-press",
    "name": "站姿杠铃推举（实力推）",
    "category": "shoulders",
    "recordingMode": "weight_reps",
    "loadBasis": "total",
    "countBasis": "whole_set",
    "loadDirection": "higher_better",
    "rateMetric": "none",
    "contextKind": "none",
    "equipment": "barbell",
    "description": "双脚站稳，正握杠铃置于肩前。\n\n收紧臀部和核心，保持膝盖伸展，不用屈膝借力。\n\n将杠铃向上推过头顶。\n\n手臂接近伸直时短暂停顿。\n\n受控将杠铃下放至肩前，重复所需的次数。",
    "primaryMuscleGroupIds": [
      "shoulders"
    ],
    "secondaryMuscleGroupIds": [
      "triceps",
      "core"
    ]
  },
  {
    "id": "ex-face-pull",
    "name": "绳索面拉",
    "category": "shoulders",
    "recordingMode": "weight_reps",
    "loadBasis": "total",
    "countBasis": "whole_set",
    "loadDirection": "higher_better",
    "rateMetric": "none",
    "contextKind": "none",
    "equipment": "cable",
    "description": "将绳索固定在面部或略高的位置。\n\n双手握住绳端并向后站，使绳索保持张力。\n\n保持躯干稳定，肘部向外抬起。\n\n将绳索拉向眉眼两侧，同时让肩部外旋。\n\n短暂停顿后受控伸臂返回，重复所需的次数。",
    "primaryMuscleGroupIds": [
      "shoulders"
    ],
    "secondaryMuscleGroupIds": [
      "back"
    ]
  },
  {
    "id": "ex-trap-bar-farmer-walk",
    "name": "六角杠农夫行走",
    "category": "legs",
    "recordingMode": "weight_distance_duration",
    "loadBasis": "total",
    "countBasis": "whole_set",
    "loadDirection": "higher_better",
    "rateMetric": "load_distance_per_time",
    "contextKind": "none",
    "equipment": "trap_bar",
    "description": "站在六角杠中央，屈髋屈膝握住两侧把手。\n\n保持背部中立，伸膝伸髋站起。\n\n保持躯干稳定，以可控步幅完成计划距离或时间。\n\n停稳后受控放下六角杠。\n\n重量填写整根六角杠与全部杠铃片的总重量。",
    "primaryMuscleGroupIds": [
      "quadriceps"
    ],
    "secondaryMuscleGroupIds": [
      "calves",
      "forearms",
      "core"
    ]
  },
  {
    "id": "ex-single-arm-farmer-walk",
    "name": "单侧农夫行走（手提箱行走）",
    "category": "legs",
    "recordingMode": "weight_distance_duration",
    "loadBasis": "total",
    "countBasis": "per_side",
    "loadDirection": "higher_better",
    "rateMetric": "load_distance_per_time",
    "contextKind": "none",
    "equipment": "dumbbell",
    "description": "单手持一只哑铃置于身体一侧。\n\n保持躯干直立，避免向负重侧侧屈或旋转。\n\n以可控步幅完成计划距离或时间。\n\n停稳后受控放下哑铃，然后换侧。\n\n重量填写单只哑铃的实际重量，距离和用时按每侧填写。",
    "primaryMuscleGroupIds": [
      "quadriceps"
    ],
    "secondaryMuscleGroupIds": [
      "calves",
      "forearms",
      "core"
    ]
  },
  {
    "id": "ex-copenhagen-side-plank",
    "name": "哥本哈根支撑",
    "category": "core",
    "recordingMode": "duration",
    "loadBasis": null,
    "countBasis": "per_side",
    "loadDirection": null,
    "rateMetric": "none",
    "contextKind": "none",
    "equipment": "body_weight",
    "description": "侧卧，将上侧小腿或膝部支撑在稳固长凳上。\n\n将支撑侧前臂置于肩膀正下方。\n\n收紧核心并抬起髋部，使身体保持稳定成一线。\n\n下侧腿可以离地，按计划时间保持。\n\n受控放下后换侧，并选择自己能够控制的杠杆长度和保持时间。",
    "primaryMuscleGroupIds": [
      "core",
      "adductors"
    ],
    "secondaryMuscleGroupIds": [
      "glutes"
    ]
  }
];

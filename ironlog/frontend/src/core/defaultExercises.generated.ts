// 此文件由 scripts/exerciseCatalog.mjs 生成，禁止手改。
// candidates sha256: d4450eecd1367848e1034d92ac3c52a27af2b751ef317b0c1e6834e1d658ba57
// upstream revision: 118e4bd6b14da6df0e36605d7169b65db18389a4
import type { DefaultExerciseSeed } from "./models";

export const DEFAULT_EXERCISE_SEEDS: DefaultExerciseSeed[] = [
  {
    "id": "ex-bench-press",
    "name": "杠铃卧推",
    "category": "chest",
    "recordingMode": "weight_reps",
    "loadBasis": "total",
    "loadDirection": "higher_better",
    "rateMetric": "none",
    "equipment": "barbell",
    "description": "仰卧稳住肩胛和双脚，正握杠铃下放至胸部，再伸肘推回；全程控制下放。",
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
    "loadDirection": "higher_better",
    "rateMetric": "none",
    "equipment": "dumbbell",
    "description": "将长凳调至上斜位，背部贴垫，哑铃从上胸两侧向上推起，再受控下放。",
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
    "loadDirection": null,
    "rateMetric": "none",
    "equipment": "body_weight",
    "description": "双手略宽于肩，身体保持直线；屈肘下降至胸部接近地面，再推回起始位。",
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
    "loadDirection": "higher_better",
    "rateMetric": "none",
    "equipment": "machine",
    "description": "调好座椅，使把手与胸部大致同高；背部贴垫向前推至手臂接近伸直，再受控返回。",
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
    "loadDirection": null,
    "rateMetric": "none",
    "equipment": "body_weight",
    "description": "双臂支撑双杠，躯干略前倾；屈肘受控下降至肩部可控深度，再推起。",
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
    "loadDirection": "higher_better",
    "rateMetric": "none",
    "equipment": "dumbbell",
    "description": "坐姿背部稳定，哑铃由肩侧向上推至手臂接近伸直，再受控回到肩侧。",
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
    "loadDirection": "higher_better",
    "rateMetric": "none",
    "equipment": "dumbbell",
    "description": "保持躯干稳定，手臂微屈，将哑铃向两侧抬至肩高附近，再缓慢下放。",
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
    "loadDirection": "higher_better",
    "rateMetric": "none",
    "equipment": "dumbbell",
    "description": "髋部折叠并保持背部中立，双臂微屈，将哑铃向两侧打开，再缓慢回落。",
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
    "loadDirection": "higher_better",
    "rateMetric": "none",
    "equipment": "barbell",
    "description": "屈髋俯身并保持背部中立，将杠铃拉向下胸或上腹，再受控下放。",
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
    "loadBasis": "per_hand",
    "loadDirection": "higher_better",
    "rateMetric": "none",
    "equipment": "dumbbell",
    "description": "一手支撑并保持躯干稳定，另一手将哑铃拉向髋侧，再缓慢下放至手臂伸展。",
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
    "loadDirection": "higher_better",
    "rateMetric": "none",
    "equipment": "cable",
    "description": "坐稳并保持躯干中立，将把手拉向腹部，肩胛向后收，再受控伸臂返回。",
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
    "loadDirection": null,
    "rateMetric": "none",
    "equipment": "body_weight",
    "description": "正握悬垂，先稳定肩胛，再将身体拉至下巴接近横杠，随后受控下降。",
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
    "loadDirection": "higher_better",
    "rateMetric": "none",
    "equipment": "cable",
    "description": "坐稳并固定大腿，将横杆下拉至上胸附近，保持躯干稳定，再缓慢回到手臂伸展位。",
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
    "loadDirection": "higher_better",
    "rateMetric": "none",
    "equipment": "barbell",
    "description": "杠铃位于足中上方，屈髋屈膝握杠，保持背部中立，伸膝伸髋站起，再受控回落。",
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
    "loadDirection": "higher_better",
    "rateMetric": "none",
    "equipment": "barbell",
    "description": "膝盖微屈，保持背部中立并将髋部后移，让杠铃贴近腿部下放，再伸髋站起。",
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
    "loadDirection": "higher_better",
    "rateMetric": "none",
    "equipment": "barbell",
    "description": "杠铃稳定置于上背，脚距自然；屈髋屈膝下蹲至可控深度，膝盖与脚尖方向一致，再站起。",
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
    "loadDirection": "higher_better",
    "rateMetric": "none",
    "equipment": "dumbbell",
    "description": "双手托住哑铃置于胸前，保持躯干稳定，屈髋屈膝下蹲至可控深度，再蹬地站起。",
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
    "loadDirection": "higher_better",
    "rateMetric": "none",
    "equipment": "machine",
    "description": "背部贴稳靠垫，双脚置于踏板；屈膝受控下放，再推至双腿接近伸直，避免锁死膝盖。",
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
    "loadDirection": "higher_better",
    "rateMetric": "none",
    "equipment": "machine",
    "description": "调好座椅和滚垫，使膝关节对齐机器转轴；伸膝抬起负重，再缓慢回到起始位。",
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
    "loadDirection": "higher_better",
    "rateMetric": "none",
    "equipment": "machine",
    "description": "调好座椅和腿垫，固定大腿；屈膝拉动负重至可控范围，再缓慢伸膝返回。",
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
    "loadDirection": "higher_better",
    "rateMetric": "none",
    "equipment": "dumbbell",
    "description": "双手持哑铃站立，一脚向前迈出并屈膝下降，前膝与脚尖方向一致，再由前脚发力返回。",
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
    "loadDirection": "higher_better",
    "rateMetric": "none",
    "equipment": "dumbbell",
    "description": "后脚放在长凳或台阶上，前脚稳定；屈髋屈膝下降至可控深度，再由前脚发力站起。",
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
    "loadDirection": "higher_better",
    "rateMetric": "none",
    "equipment": "dumbbell",
    "description": "双手持哑铃，一脚踏稳台阶，主要由踏台腿发力站上平台，再受控下台并换侧。",
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
    "loadDirection": null,
    "rateMetric": "none",
    "equipment": "body_weight",
    "description": "前后分腿站立，保持躯干稳定；屈膝下降至后膝接近地面，再由前脚发力站起并换侧。",
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
    "loadDirection": "higher_better",
    "rateMetric": "none",
    "equipment": "barbell",
    "description": "仰卧屈膝，杠铃稳放在髋部；收紧核心并伸髋至躯干与大腿接近一线，再受控下放。",
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
    "loadDirection": "higher_better",
    "rateMetric": "none",
    "equipment": "kettlebell",
    "description": "双手握壶铃，屈髋后摆，随后快速伸髋让壶铃摆至胸前附近；手臂保持放松并控制回摆。",
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
    "loadDirection": "higher_better",
    "rateMetric": "none",
    "equipment": "machine",
    "description": "前脚掌稳踩踏板，膝盖保持自然；抬高脚跟至小腿充分收缩，再缓慢下降。",
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
    "loadDirection": null,
    "rateMetric": "none",
    "equipment": "body_weight",
    "description": "双脚自然站立，可扶住稳定物保持平衡；抬高脚跟至小腿收缩，再缓慢下降。",
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
    "loadDirection": "higher_better",
    "rateMetric": "load_distance_per_time",
    "equipment": "dumbbell",
    "description": "站直，双手各持一只哑铃，收紧核心并保持躯干稳定；以可控步幅完成计划距离或时间，避免身体左右倾斜，结束后受控放下哑铃。",
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
    "loadDirection": "higher_better",
    "rateMetric": "none",
    "equipment": "barbell",
    "description": "站姿保持上臂相对固定，屈肘将杠铃举至可控高度，再缓慢下放。",
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
    "loadDirection": "higher_better",
    "rateMetric": "none",
    "equipment": "dumbbell",
    "description": "掌心相对握住哑铃，保持上臂稳定，屈肘举起哑铃，再受控下放。",
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
    "loadDirection": "higher_better",
    "rateMetric": "none",
    "equipment": "cable",
    "description": "将绳索连接高位滑轮，肘部贴近身体，伸肘向下压并在底部展开绳端，再受控返回。",
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
    "loadDirection": "higher_better",
    "rateMetric": "none",
    "equipment": "cable",
    "description": "背对高位滑轮，双手握绳并保持上臂稳定；伸肘将绳索推向前上方，再受控屈肘返回。",
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
    "loadDirection": "higher_better",
    "rateMetric": "none",
    "equipment": "dumbbell",
    "description": "坐稳后双手托住哑铃置于头后，保持上臂靠近耳侧，伸肘举起，再受控下放。",
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
    "loadDirection": null,
    "rateMetric": "none",
    "equipment": "body_weight",
    "description": "仰卧抬起双腿和双臂，保持腰背稳定；交替伸展对侧手臂和腿，再回到起始位。",
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
    "loadDirection": null,
    "rateMetric": "none",
    "equipment": "band",
    "description": "将弹力带固定在身体侧方，双手置于胸前；保持躯干不旋转，将双手向前推出再收回。",
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
    "loadDirection": "higher_better",
    "rateMetric": "none",
    "equipment": "cable",
    "description": "跪在高位滑轮前，绳索置于头侧；保持髋部相对稳定，收腹使躯干向下卷曲，再受控还原。",
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
    "loadDirection": null,
    "rateMetric": "none",
    "equipment": "ab_wheel",
    "description": "跪姿双手握轮，收紧核心并缓慢向前滚至可控范围，再用核心带动回到起始位。",
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
    "loadDirection": null,
    "rateMetric": "none",
    "equipment": "body_weight",
    "description": "侧卧并以前臂支撑，抬起臀部使身体从头到脚接近一条直线，按计划时间保持后换侧。",
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
    "loadDirection": null,
    "rateMetric": "distance_per_time",
    "equipment": "body_weight",
    "description": "选择安全路线或跑步区域。\n保持躯干放松和稳定，以自然步幅完成计划距离或时间。\n结束前逐步减速。",
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
    "loadDirection": null,
    "rateMetric": "distance_per_time",
    "equipment": "stationary_bike",
    "description": "调好座椅并固定双脚，以计划阻力和节奏踩踏；记录持续时间，逐步减速后结束。",
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
    "loadDirection": null,
    "rateMetric": "none",
    "equipment": "jump_rope",
    "description": "双手握绳，膝盖微屈，以脚掌轻柔落地并保持稳定节奏；按计划次数完成。",
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
    "loadDirection": null,
    "rateMetric": "distance_per_time",
    "equipment": "elliptical",
    "description": "调好阻力和坡度，双脚稳踩踏板并配合推拉手柄，以稳定节奏完成计划时间。",
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
    "loadDirection": "higher_better",
    "rateMetric": "none",
    "equipment": "cable",
    "description": "双侧滑轮调至合适高度，躯干稳定，双臂保持微屈向胸前合拢，再缓慢打开。",
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
    "loadDirection": "lower_better",
    "rateMetric": "none",
    "equipment": "machine",
    "description": "在辅助器械上选定合适辅助量，稳定肩胛后向上拉至下巴接近横杠，再受控下降。",
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
    "loadDirection": "higher_better",
    "rateMetric": "none",
    "equipment": "barbell",
    "description": "躺在上斜凳上，正握杠铃下放至上胸附近，再伸肘推回；保持双脚和上背稳定。",
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
    "loadDirection": "higher_better",
    "rateMetric": "none",
    "equipment": "barbell",
    "description": "坐姿稳定躯干，将杠铃由肩前向上推至手臂接近伸直，再受控下放。",
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
    "loadDirection": "higher_better",
    "rateMetric": "none",
    "equipment": "machine",
    "description": "调好座椅，使把手位于肩侧；背部贴垫向上推至手臂接近伸直，再缓慢返回。",
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
    "loadDirection": null,
    "rateMetric": "none",
    "equipment": "body_weight",
    "description": "反握悬垂，稳定肩胛后将身体向上拉至下巴接近横杠，再受控下降。",
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
    "loadDirection": null,
    "rateMetric": "none",
    "equipment": "body_weight",
    "description": "身体在低杠下保持直线，脚跟支撑；将胸部拉向横杠，再受控伸臂返回。",
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
    "loadDirection": "higher_better",
    "rateMetric": "none",
    "equipment": "cable",
    "description": "面对高位滑轮，手臂保持接近伸直，将把手沿弧线下压至大腿前，再受控回到上方。",
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
    "loadDirection": "higher_better",
    "rateMetric": "none",
    "equipment": "barbell",
    "description": "杠铃稳定置于肩前，保持肘部抬起和躯干直立；下蹲至可控深度，再蹬地站起。",
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
    "loadDirection": "higher_better",
    "rateMetric": "none",
    "equipment": "dumbbell",
    "description": "双手持哑铃，膝盖微屈并将髋部后移，保持背部中立，下放至后侧链有拉伸感后伸髋站起。",
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
    "loadDirection": "higher_better",
    "rateMetric": "none",
    "equipment": "machine",
    "description": "俯卧固定髋部，小腿置于滚垫下；屈膝拉起负重至可控范围，再缓慢伸膝返回。",
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
    "loadDirection": "higher_better",
    "rateMetric": "none",
    "equipment": "machine",
    "description": "坐稳并让前脚掌踩住踏板，膝上垫固定；抬高脚跟至小腿收缩，再缓慢下降。",
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
    "loadDirection": "higher_better",
    "rateMetric": "none",
    "equipment": "machine",
    "description": "调好座椅和腿垫，坐稳并保持躯干稳定；向外打开双腿至可控范围，再缓慢合回。",
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
    "loadDirection": "higher_better",
    "rateMetric": "none",
    "equipment": "machine",
    "description": "调好座椅和腿垫，坐稳并保持躯干稳定；将双腿向内合拢至可控范围，再缓慢打开。",
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
    "loadDirection": "higher_better",
    "rateMetric": "none",
    "equipment": "barbell",
    "description": "坐姿让前臂稳定支撑在大腿上，掌心向上握杠，屈腕将杠铃卷起，再缓慢下放。",
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
    "loadDirection": "higher_better",
    "rateMetric": "none",
    "equipment": "external_weight",
    "description": "坐姿双手持重物，躯干略后倾并保持稳定，在可控范围内交替向两侧转动。",
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
    "loadDirection": null,
    "rateMetric": "none",
    "equipment": "body_weight",
    "description": "在罗马椅上固定双脚，保持脊柱中立并从髋部俯身，再伸髋回到身体接近一线。",
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
    "loadDirection": null,
    "rateMetric": "none",
    "equipment": "body_weight",
    "description": "由站姿下蹲撑地，双脚跳至俯卧撑位，完成俯卧撑后收腿并向上跳起；按次数记录。",
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
    "loadDirection": null,
    "rateMetric": "none",
    "equipment": "body_weight",
    "description": "从高位平板支撑开始，保持臀部稳定，快速交替将膝盖向胸部收回；按次数记录。",
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
    "name": "踏步机",
    "category": "cardio",
    "recordingMode": "duration",
    "loadBasis": null,
    "loadDirection": null,
    "rateMetric": "none",
    "equipment": "stepmill",
    "description": "调好踏步机速度或阻力，保持身体直立并交替踏步，按计划持续时间完成。",
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
  }
];

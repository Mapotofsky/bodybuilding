import type {
  CountBasis,
  EquipmentId,
  ExerciseCategory,
  LoadBasis,
  LoadDirection,
  RateMetric,
  RecordingMode,
} from "@/core/models";

export interface User {
  id: string;
  email: string;
  nickname: string | null;
  avatar_url: string | null;
  gender: string | null;
  birth_date: string | null;
  role: string;
  created_at: string;
}

export const RECORDING_MODE_LABELS: Record<RecordingMode, string> = {
  weight_reps: "负重 + 次数",
  reps: "仅次数",
  duration: "保持时间",
  distance_duration: "距离 / 时间",
  weight_duration: "负重 + 时间",
  weight_distance_duration: "负重 + 距离 / 时间",
};

export const LOAD_BASIS_LABELS: Record<LoadBasis, string> = {
  total: "总重量",
  per_hand: "每手重量",
};

export const COUNT_BASIS_LABELS: Record<CountBasis, string> = {
  whole_set: "整组填写",
  per_side: "每侧填写",
};

export const LOAD_DIRECTION_LABELS: Record<LoadDirection, string> = {
  higher_better: "负重",
  lower_better: "辅助配重",
};

export const RATE_METRIC_LABELS: Record<RateMetric, string> = {
  none: "不计算竞速指标",
  distance_per_time: "计算速度",
  load_distance_per_time: "计算单位时间负载",
};

export type MuscleGroupId =
  | "chest" | "back" | "shoulders" | "biceps" | "triceps" | "forearms"
  | "core" | "glutes" | "quadriceps" | "hamstrings" | "calves"
  | "adductors" | "abductors" | "full_body" | "other";

export interface Exercise {
  id: string;
  name: string;
  category: ExerciseCategory;
  recording_mode: RecordingMode;
  load_basis: LoadBasis | null;
  count_basis: CountBasis;
  load_direction: LoadDirection | null;
  rate_metric: RateMetric;
  equipment: EquipmentId | null;
  description: string | null;
  primary_muscle_group_ids: MuscleGroupId[];
  secondary_muscle_group_ids: MuscleGroupId[];
  is_custom: boolean;
}

export interface WorkoutSet {
  id?: string;
  set_number: number;
  weight: number | null;
  reps: number | null;
  unit: "kg" | "lb";
  duration_sec: number | null;
  distance_m: number | null;
  rpe: number | null;
  is_warmup: boolean;
  is_failure: boolean;
  rest_seconds: number | null;
}

export interface WorkoutExercise {
  id?: string;
  exercise_id: string;
  recording_mode: RecordingMode;
  load_basis: LoadBasis | null;
  count_basis: CountBasis;
  load_direction: LoadDirection | null;
  rate_metric: RateMetric;
  exercise_name?: string;
  exercise_category?: string;
  sort_order: number;
  superset_group: number | null;
  sets: WorkoutSet[];
}

export interface Workout {
  id: string;
  user_id: string;
  date: string;
  start_time: string | null;
  end_time: string | null;
  plan_template_id: string | null;
  template_name: string | null;
  template_color: string | null;
  plan_color: string | null;
  note: string | null;
  mood: number | null;
  exercises: WorkoutExercise[];
  created_at: string;
  updated_at: string;
}

export interface WorkoutSummary {
  id: string;
  date: string;
  start_time: string | null;
  end_time: string | null;
  note: string | null;
  mood: number | null;
  exercise_count: number;
  total_sets: number;
  total_volume: number;
  total_volume_unit: "kg" | "lb";
  total_distance_m: number;
  total_duration_sec: number;
  total_load_distance_kg_m: number;
  total_load_duration_kg_sec: number;
  total_reps: number;
  plan_template_id: string | null;
  template_name: string | null;
  template_color: string | null;
  plan_color: string | null;
  exercise_ids: string[];
  created_at: string;
}

export const CATEGORY_LABELS: Record<string, string> = {
  chest: "胸部",
  back: "背部",
  legs: "腿部",
  shoulders: "肩部",
  arms: "手臂",
  core: "核心",
  cardio: "有氧",
  stretch: "拉伸",
  other: "其他",
};

export const EQUIPMENT_LABELS: Record<EquipmentId, string> = {
  body_weight: "自重",
  barbell: "杠铃",
  dumbbell: "哑铃",
  cable: "绳索",
  machine: "固定器械",
  band: "弹力带",
  kettlebell: "壶铃",
  ab_wheel: "健腹轮",
  stationary_bike: "固定自行车",
  jump_rope: "跳绳",
  elliptical: "椭圆机",
  stepmill: "踏步机",
  external_weight: "外部负重",
  other: "其他",
};

export const MUSCLE_GROUP_LABELS: Record<MuscleGroupId, string> = {
  chest: "胸部",
  back: "背部",
  shoulders: "肩部",
  biceps: "肱二头肌",
  triceps: "肱三头肌",
  forearms: "前臂",
  core: "核心",
  glutes: "臀部",
  quadriceps: "股四头肌",
  hamstrings: "腘绳肌",
  calves: "小腿",
  adductors: "内收肌",
  abductors: "外展肌",
  full_body: "全身",
  other: "其他",
};

export const MOOD_LABELS: Record<number, string> = {
  1: "😫",
  2: "😕",
  3: "😐",
  4: "😊",
  5: "🔥",
};

export type PlanMode = "weekly" | "cyclic" | "flexible";

export const PLAN_MODE_LABELS: Record<PlanMode, string> = {
  weekly: "按周循环",
  cyclic: "按日循环",
  flexible: "机动模式",
};

export const DAY_OF_WEEK_LABELS: Record<number, string> = {
  1: "周一",
  2: "周二",
  3: "周三",
  4: "周四",
  5: "周五",
  6: "周六",
  7: "周日",
};

export interface TemplateExercise {
  id: string;
  exercise_id: string;
  exercise_name?: string;
  exercise_category?: string;
  sort_order: number;
  note: string | null;
}

export interface PlanTemplate {
  id: string;
  plan_id: string;
  name: string;
  sort_order: number;
  color: string | null;
  schedule_rule: Record<string, unknown> | null;
  exercises: TemplateExercise[];
  created_at: string;
  updated_at: string;
}

export interface TrainingPlan {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  color: string;
  mode: PlanMode;
  cycle_length: number | null;
  is_active: boolean;
  templates: PlanTemplate[];
  created_at: string;
  updated_at: string;
}

export interface PlanSummary {
  id: string;
  name: string;
  description: string | null;
  mode: PlanMode;
  cycle_length: number | null;
  color: string;
  is_active: boolean;
  template_count: number;
  created_at: string;
}

export interface CalendarEntry {
  id: string;
  plan_id: string;
  plan_name: string;
  plan_color: string;
  plan_mode: string;
  template_id: string;
  template_name: string;
  template_color: string | null;
  template_exercise_ids: string[];
  scheduled_date: string;
  is_completed: boolean;
  workout_id: string | null;
}

export interface CalendarDay {
  date: string;
  entries: CalendarEntry[];
}

export interface ExerciseDetail {
  id: string;
  name: string;
  category: ExerciseCategory;
  recording_mode: RecordingMode;
  load_basis: LoadBasis | null;
  count_basis: CountBasis;
  load_direction: LoadDirection | null;
  rate_metric: RateMetric;
  equipment: EquipmentId | null;
  description: string | null;
  primary_muscle_group_ids: MuscleGroupId[];
  secondary_muscle_group_ids: MuscleGroupId[];
  is_custom: boolean;
  usage_count: number;
  last_used_date: string | null;
  stats: ExercisePersonalStats;
}

export interface ExercisePersonalStats {
  completed_workout_count: number;
  total_set_count: number;
  working_set_count: number;
  recent_7_day_set_count: number;
  last_completed_date: string | null;
  performance: {
    load_basis: LoadBasis | null;
    count_basis: CountBasis | null;
    load_direction: LoadDirection | null;
    best_load: number | null;
    best_set_volume: number | null;
    best_workout_volume: number | null;
    best_reps: number | null;
    best_distance_m: number | null;
    best_duration_sec: number | null;
    best_speed_mps: number | null;
    best_load_distance_kg_m: number | null;
    best_load_duration_kg_sec: number | null;
    best_load_distance_rate_kg_mps: number | null;
    display_unit: "kg" | "lb";
  };
}
export type {
  CountBasis,
  EquipmentId,
  ExerciseCategory,
  LoadBasis,
  LoadDirection,
  RateMetric,
  RecordingMode,
} from "@/core/models";

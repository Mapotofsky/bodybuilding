export interface User {
  id: number;
  email: string;
  nickname: string | null;
  avatar_url: string | null;
  gender: string | null;
  height: number | null;
  weight: number | null;
  birth_date: string | null;
  role: string;
  created_at: string;
}

export interface Exercise {
  id: number;
  name: string;
  category: string;
  type: string;
  description: string | null;
  met_value: number | null;
  is_custom: boolean;
}

export interface WorkoutSet {
  id?: number;
  set_number: number;
  weight: number | null;
  reps: number | null;
  unit: "kg" | "lb";
  duration_sec: number | null;
  distance_m: number | null;
  rpe: number | null;
  is_warmup: boolean;
  is_dropset: boolean;
  is_failure: boolean;
  rest_seconds: number | null;
}

export interface WorkoutExercise {
  id?: number;
  exercise_id: number;
  exercise_name?: string;
  exercise_category?: string;
  sort_order: number;
  superset_group: number | null;
  sets: WorkoutSet[];
}

export interface Workout {
  id: number;
  user_id: number;
  date: string;
  start_time: string | null;
  end_time: string | null;
  note: string | null;
  mood: number | null;
  exercises: WorkoutExercise[];
  created_at: string;
  updated_at: string;
}

export interface WorkoutSummary {
  id: number;
  date: string;
  start_time: string | null;
  end_time: string | null;
  note: string | null;
  mood: number | null;
  exercise_count: number;
  total_sets: number;
  total_volume: number;
  plan_template_id: number | null;
  template_name: string | null;
  template_color: string | null;
  plan_color: string | null;
  exercise_ids: number[];
  created_at: string;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export const CATEGORY_LABELS: Record<string, string> = {
  chest: "胸部",
  back: "背部",
  legs: "腿部",
  shoulders: "肩部",
  arms: "手臂",
  core: "核心",
  cardio: "有氧",
  compound: "复合",
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
  id: number;
  exercise_id: number;
  exercise_name?: string;
  exercise_category?: string;
  sort_order: number;
  note: string | null;
}

export interface PlanTemplate {
  id: number;
  plan_id: number;
  name: string;
  sort_order: number;
  color: string | null;
  schedule_rule: Record<string, unknown> | null;
  exercises: TemplateExercise[];
  created_at: string;
  updated_at: string;
}

export interface TrainingPlan {
  id: number;
  user_id: number;
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
  id: number;
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
  id: number;
  plan_id: number;
  plan_name: string;
  plan_color: string;
  plan_mode: string;
  template_id: number;
  template_name: string;
  template_color: string | null;
  template_exercise_ids: number[];
  scheduled_date: string;
  is_completed: boolean;
  workout_id: number | null;
}

export interface CalendarDay {
  date: string;
  entries: CalendarEntry[];
}

export interface ExerciseDetail {
  id: number;
  name: string;
  category: string;
  type: string;
  description: string | null;
  met_value: number | null;
  is_custom: boolean;
  usage_count: number;
  last_used_date: string | null;
}

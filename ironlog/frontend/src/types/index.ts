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

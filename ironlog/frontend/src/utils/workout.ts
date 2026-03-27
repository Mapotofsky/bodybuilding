import type { WorkoutSet } from "@/types";

export function makeEmptySet(num: number, unit: "kg" | "lb" = "kg"): WorkoutSet {
  return {
    set_number: num,
    weight: null,
    reps: null,
    unit,
    duration_sec: null,
    distance_m: null,
    rpe: null,
    is_warmup: false,
    is_dropset: false,
    is_failure: false,
    rest_seconds: null,
  };
}

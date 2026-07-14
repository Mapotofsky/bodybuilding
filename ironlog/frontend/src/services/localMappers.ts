import { localRepository } from "@/repositories/localJsonRepository";
import type {
  ExerciseDoc,
  TemplateDoc,
  TrainingPlanDoc,
  WorkoutDoc,
  WorkoutExerciseDoc,
  WorkoutSetDoc,
} from "@/core/models";
import type {
  Exercise,
  ExerciseDetail,
  PlanSummary,
  PlanTemplate,
  TrainingPlan,
  Workout,
  WorkoutExercise,
  WorkoutSet,
  WorkoutSummary,
} from "@/types";
import { resolveExerciseId } from "@/core/exerciseRedirects";
import { buildExercisePersonalStats, type ExercisePersonalStats as CoreExercisePersonalStats } from "@/core/exerciseStats";
import { calculateWorkoutMetrics } from "@/core/workoutMetrics";

export function toExercise(doc: ExerciseDoc): Exercise {
  return {
    id: doc.id,
    name: doc.name,
    category: doc.category,
    type: doc.type,
    equipment: doc.equipment,
    description: doc.description,
    primary_muscle_group_ids: doc.primaryMuscleGroupIds ?? [],
    secondary_muscle_group_ids: doc.secondaryMuscleGroupIds ?? [],
    is_custom: doc.isCustom,
  };
}

export async function toExerciseDetail(doc: ExerciseDoc): Promise<ExerciseDetail> {
  const workouts = await localRepository.listWorkouts();
  const allExercises = (await localRepository.getSnapshot()).exercises;
  let usageCount = 0;
  let lastUsedDate: string | null = null;
  for (const workout of workouts) {
    for (const exercise of workout.exercises) {
      const resolved = resolveExerciseId(exercise.exerciseId, allExercises);
      if (exercise.exerciseId !== doc.id && (resolved.status !== "resolved" || resolved.resolvedId !== doc.id)) continue;
      usageCount += exercise.sets.length;
      if (!lastUsedDate || workout.date > lastUsedDate) lastUsedDate = workout.date;
    }
  }
  return {
    id: doc.id,
    name: doc.name,
    category: doc.category,
    type: doc.type,
    equipment: doc.equipment,
    description: doc.description,
    primary_muscle_group_ids: doc.primaryMuscleGroupIds ?? [],
    secondary_muscle_group_ids: doc.secondaryMuscleGroupIds ?? [],
    is_custom: doc.isCustom,
    usage_count: usageCount,
    last_used_date: lastUsedDate,
    stats: toExercisePersonalStats(buildExercisePersonalStats({
      exerciseId: doc.id,
      exercises: allExercises,
      workouts,
      weightUnit: (await localRepository.getSettings()).weightUnit,
    })),
  };
}

function toExercisePersonalStats(stats: CoreExercisePersonalStats): ExerciseDetail["stats"] {
  return {
    completed_workout_count: stats.completedWorkoutCount,
    total_set_count: stats.totalSetCount,
    working_set_count: stats.workingSetCount,
    recent_7_day_set_count: stats.recent7DaySetCount,
    last_completed_date: stats.lastCompletedDate,
    strength: {
      best_weight: stats.strength.bestWeight,
      best_volume: stats.strength.bestVolume,
      display_unit: stats.strength.displayUnit,
    },
    cardio: {
      best_distance_m: stats.cardio.bestDistanceM,
      best_speed_kmh: stats.cardio.bestSpeedKmh,
    },
    reps_only: {
      best_reps: stats.repsOnly.bestReps,
    },
    static_hold: {
      best_duration_sec: stats.staticHold.bestDurationSec,
    },
  };
}

export async function toPlanSummary(plan: TrainingPlanDoc): Promise<PlanSummary> {
  const templates = await localRepository.listTemplates(plan.id);
  return {
    id: plan.id,
    name: plan.name,
    description: plan.description,
    mode: plan.mode,
    cycle_length: plan.cycleLength,
    color: plan.color,
    is_active: plan.isActive,
    template_count: templates.length,
    created_at: plan.createdAt,
  };
}

export async function toPlan(plan: TrainingPlanDoc): Promise<TrainingPlan> {
  const templates = await localRepository.listTemplates(plan.id);
  return {
    id: plan.id,
    user_id: "local-user",
    name: plan.name,
    description: plan.description,
    color: plan.color,
    mode: plan.mode,
    cycle_length: plan.cycleLength,
    is_active: plan.isActive,
    templates: await Promise.all(templates.map((template) => toTemplate(template))),
    created_at: plan.createdAt,
    updated_at: plan.updatedAt,
  };
}

export async function toTemplate(template: TemplateDoc): Promise<PlanTemplate> {
  const exercises = (await localRepository.getSnapshot()).exercises;
  return {
    id: template.id,
    plan_id: template.planId,
    name: template.name,
    sort_order: template.sortOrder,
    color: template.color,
    schedule_rule: template.scheduleRule,
    exercises: template.exercises
      .slice()
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((item) => {
        const ex = resolveExercise(item.exerciseId, exercises);
        return {
          id: item.id,
          exercise_id: item.exerciseId,
          exercise_name: ex?.name,
          exercise_category: ex?.category,
          sort_order: item.sortOrder,
          note: item.note,
        };
      }),
    created_at: template.createdAt,
    updated_at: template.updatedAt,
  };
}

export async function toWorkout(doc: WorkoutDoc): Promise<Workout> {
  const template = doc.planTemplateId ? await localRepository.getTemplate(doc.planTemplateId) : null;
  const plan = template ? await localRepository.getPlan(template.planId) : null;
  return {
    id: doc.id,
    user_id: "local-user",
    date: doc.date,
    start_time: doc.startTime,
    end_time: doc.endTime,
    plan_template_id: doc.planTemplateId,
    template_name: template?.name || null,
    template_color: template?.color || null,
    plan_color: plan?.color || null,
    note: doc.note,
    mood: doc.mood,
    exercises: await Promise.all(doc.exercises.sort((a, b) => a.sortOrder - b.sortOrder).map(toWorkoutExercise)),
    created_at: doc.createdAt,
    updated_at: doc.updatedAt,
  };
}

export async function toWorkoutSummary(doc: WorkoutDoc): Promise<WorkoutSummary> {
  const workout = await toWorkout(doc);
  const allExercises = (await localRepository.getSnapshot()).exercises;
  const displayUnit = (await localRepository.getSettings()).weightUnit;
  const metrics = calculateWorkoutMetrics(workout.exercises.map((exercise) => ({
    exerciseType: exercise.exercise_type,
    sets: exercise.sets.map((set) => ({
      weight: set.weight,
      reps: set.reps,
      unit: set.unit,
      durationSec: set.duration_sec,
      distanceM: set.distance_m,
    })),
  })), displayUnit);
  return {
    id: workout.id,
    date: workout.date,
    start_time: workout.start_time,
    end_time: workout.end_time,
    note: workout.note,
    mood: workout.mood,
    exercise_count: workout.exercises.length,
    total_sets: metrics.totalSets,
    total_volume: metrics.totalVolume,
    total_volume_unit: metrics.totalVolumeUnit,
    total_distance_m: metrics.totalDistanceM,
    total_duration_sec: metrics.totalDurationSec,
    total_reps: metrics.totalReps,
    plan_template_id: workout.plan_template_id,
    template_name: workout.template_name,
    template_color: workout.template_color,
    plan_color: workout.plan_color,
    exercise_ids: workout.exercises.map((exercise) => {
      const resolved = resolveExerciseId(exercise.exercise_id, allExercises);
      return resolved.status === "resolved" ? resolved.resolvedId : exercise.exercise_id;
    }),
    created_at: workout.created_at,
  };
}

async function toWorkoutExercise(doc: WorkoutExerciseDoc): Promise<WorkoutExercise> {
  const exercises = (await localRepository.getSnapshot()).exercises;
  const exercise = resolveExercise(doc.exerciseId, exercises);
  return {
    id: doc.id,
    exercise_id: doc.exerciseId,
    exercise_type: doc.exerciseType,
    exercise_name: exercise?.name,
    exercise_category: exercise?.category,
    sort_order: doc.sortOrder,
    superset_group: doc.supersetGroup,
    sets: doc.sets.sort((a, b) => a.setNumber - b.setNumber).map(toWorkoutSet),
  };
}

function resolveExercise(id: string, exercises: ExerciseDoc[]): ExerciseDoc | null {
  const resolved = resolveExerciseId(id, exercises);
  if (resolved.status !== "resolved") return null;
  return exercises.find((exercise) => exercise.id === resolved.resolvedId && !exercise.deletedAt) || null;
}

function toWorkoutSet(doc: WorkoutSetDoc): WorkoutSet {
  return {
    id: doc.id,
    set_number: doc.setNumber,
    weight: doc.weight,
    reps: doc.reps,
    unit: doc.unit,
    duration_sec: doc.durationSec,
    distance_m: doc.distanceM,
    rpe: doc.rpe,
    is_warmup: doc.isWarmup,
    is_failure: doc.isFailure,
    rest_seconds: doc.restSeconds,
  };
}

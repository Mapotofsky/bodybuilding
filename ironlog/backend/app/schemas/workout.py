import datetime

from pydantic import BaseModel


# ---------- WorkoutSet ----------
class WorkoutSetCreate(BaseModel):
    set_number: int
    weight: float | None = None
    reps: int | None = None
    unit: str = "kg"
    duration_sec: int | None = None
    distance_m: float | None = None
    rpe: float | None = None
    is_warmup: bool = False
    is_dropset: bool = False
    is_failure: bool = False
    rest_seconds: int | None = None


class WorkoutSetOut(WorkoutSetCreate):
    id: int
    model_config = {"from_attributes": True}


# ---------- WorkoutExercise ----------
class WorkoutExerciseCreate(BaseModel):
    exercise_id: int
    sort_order: int = 0
    superset_group: int | None = None
    sets: list[WorkoutSetCreate] = []


class WorkoutExerciseOut(BaseModel):
    id: int
    exercise_id: int
    exercise_name: str | None = None
    exercise_category: str | None = None
    sort_order: int
    superset_group: int | None = None
    sets: list[WorkoutSetOut] = []

    model_config = {"from_attributes": True}


# ---------- Workout ----------
class WorkoutCreate(BaseModel):
    date: datetime.date
    start_time: datetime.datetime | None = None
    end_time: datetime.datetime | None = None
    note: str | None = None
    mood: int | None = None
    plan_template_id: int | None = None
    exercises: list[WorkoutExerciseCreate] = []


class WorkoutUpdate(BaseModel):
    date: datetime.date | None = None
    start_time: datetime.datetime | None = None
    end_time: datetime.datetime | None = None
    note: str | None = None
    mood: int | None = None
    exercises: list[WorkoutExerciseCreate] | None = None



class WorkoutOut(BaseModel):
    id: int
    user_id: int
    date: datetime.date
    start_time: datetime.datetime | None = None
    end_time: datetime.datetime | None = None
    note: str | None = None
    mood: int | None = None
    exercises: list[WorkoutExerciseOut] = []
    created_at: datetime.datetime
    updated_at: datetime.datetime

    model_config = {"from_attributes": True}


class WorkoutSummary(BaseModel):
    id: int
    date: datetime.date
    start_time: datetime.datetime | None = None
    end_time: datetime.datetime | None = None
    note: str | None = None
    mood: int | None = None
    exercise_count: int = 0
    total_sets: int = 0
    total_volume: float = 0.0
    plan_template_id: int | None = None
    template_name: str | None = None
    template_color: str | None = None
    plan_color: str | None = None
    exercise_ids: list[int] = []
    created_at: datetime.datetime

    model_config = {"from_attributes": True}


class WorkoutShareData(BaseModel):
    """Data used to render a shareable workout card."""
    date: datetime.date
    mood: int | None = None
    duration_minutes: int | None = None
    exercise_count: int = 0
    total_sets: int = 0
    total_volume: float = 0.0
    exercises: list[dict] = []
    note: str | None = None


class CopyWorkoutRequest(BaseModel):
    target_date: datetime.date

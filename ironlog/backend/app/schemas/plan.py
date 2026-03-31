import datetime
from typing import Any

from pydantic import BaseModel


# ---------- TemplateExercise ----------
class TemplateExerciseCreate(BaseModel):
    exercise_id: int
    sort_order: int = 0
    note: str | None = None


class TemplateExerciseOut(BaseModel):
    id: int
    exercise_id: int
    exercise_name: str | None = None
    exercise_category: str | None = None
    sort_order: int
    note: str | None = None

    model_config = {"from_attributes": True}


# ---------- PlanTemplate ----------
class TemplateCreate(BaseModel):
    name: str
    sort_order: int = 0
    color: str | None = None
    schedule_rule: dict[str, Any] | None = None
    exercises: list[TemplateExerciseCreate] = []


class TemplateUpdate(BaseModel):
    name: str | None = None
    sort_order: int | None = None
    color: str | None = None
    schedule_rule: dict[str, Any] | None = None
    exercises: list[TemplateExerciseCreate] | None = None


class TemplateOut(BaseModel):
    id: int
    plan_id: int
    name: str
    sort_order: int
    color: str | None = None
    schedule_rule: dict[str, Any] | None = None
    exercises: list[TemplateExerciseOut] = []
    created_at: datetime.datetime
    updated_at: datetime.datetime

    model_config = {"from_attributes": True}


# ---------- TrainingPlan ----------
class PlanCreate(BaseModel):
    name: str
    description: str | None = None
    color: str = "#3B82F6"
    mode: str
    cycle_length: int | None = None
    templates: list[TemplateCreate] = []


class PlanUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    color: str | None = None
    mode: str | None = None
    cycle_length: int | None = None
    is_active: bool | None = None


class PlanSummary(BaseModel):
    id: int
    name: str
    description: str | None = None
    mode: str
    cycle_length: int | None = None
    color: str
    is_active: bool
    template_count: int = 0
    created_at: datetime.datetime

    model_config = {"from_attributes": True}


class PlanOut(BaseModel):
    id: int
    user_id: int
    name: str
    description: str | None = None
    color: str
    mode: str
    cycle_length: int | None = None
    is_active: bool
    templates: list[TemplateOut] = []
    created_at: datetime.datetime
    updated_at: datetime.datetime

    model_config = {"from_attributes": True}


# ---------- PlanScheduleEntry ----------
class ScheduleEntryOut(BaseModel):
    id: int
    plan_id: int
    plan_name: str
    plan_color: str
    plan_mode: str
    template_id: int
    template_name: str
    template_color: str | None = None
    template_exercise_ids: list[int] = []
    scheduled_date: datetime.date
    is_completed: bool
    workout_id: int | None = None

    model_config = {"from_attributes": True}


class CalendarDay(BaseModel):
    date: datetime.date
    entries: list[ScheduleEntryOut] = []


class ScheduleRequest(BaseModel):
    date: datetime.date


# ---------- Exercise Detail ----------
class ExerciseDetail(BaseModel):
    id: int
    name: str
    category: str
    type: str
    description: str | None = None
    met_value: float | None = None
    is_custom: bool
    usage_count: int = 0
    last_used_date: datetime.date | None = None

    model_config = {"from_attributes": True}

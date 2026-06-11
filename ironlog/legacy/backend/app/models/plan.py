import enum
from datetime import date, datetime

from sqlalchemy import (
    Boolean,
    Date,
    Enum,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin


class PlanModeEnum(str, enum.Enum):
    weekly = "weekly"
    cyclic = "cyclic"
    flexible = "flexible"


class TrainingPlan(Base, TimestampMixin):
    __tablename__ = "training_plans"
    __table_args__ = (Index("ix_training_plans_user", "user_id"),)

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    color: Mapped[str] = mapped_column(String(20), server_default="#3B82F6")
    mode: Mapped[PlanModeEnum] = mapped_column(Enum(PlanModeEnum), nullable=False)
    cycle_length: Mapped[int | None] = mapped_column(Integer, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, server_default="true")

    user = relationship("User", back_populates="plans")
    templates = relationship(
        "PlanTemplate",
        back_populates="plan",
        cascade="all, delete-orphan",
        order_by="PlanTemplate.sort_order",
    )
    schedule_entries = relationship(
        "PlanScheduleEntry",
        back_populates="plan",
        cascade="all, delete-orphan",
    )


class PlanTemplate(Base, TimestampMixin):
    __tablename__ = "plan_templates"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    plan_id: Mapped[int] = mapped_column(
        ForeignKey("training_plans.id", ondelete="CASCADE"), nullable=False
    )
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    sort_order: Mapped[int] = mapped_column(Integer, server_default="0")
    color: Mapped[str | None] = mapped_column(String(20), nullable=True)
    schedule_rule: Mapped[dict | None] = mapped_column(JSONB, nullable=True)

    plan = relationship("TrainingPlan", back_populates="templates")
    workouts = relationship("Workout", back_populates="plan_template", foreign_keys="Workout.plan_template_id")
    exercises = relationship(
        "TemplateExercise",
        back_populates="template",
        cascade="all, delete-orphan",
        order_by="TemplateExercise.sort_order",
    )
    schedule_entries = relationship(
        "PlanScheduleEntry",
        back_populates="template",
    )


class TemplateExercise(Base):
    __tablename__ = "template_exercises"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    template_id: Mapped[int] = mapped_column(
        ForeignKey("plan_templates.id", ondelete="CASCADE"), nullable=False
    )
    exercise_id: Mapped[int] = mapped_column(ForeignKey("exercises.id"), nullable=False)
    sort_order: Mapped[int] = mapped_column(Integer, server_default="0")
    note: Mapped[str | None] = mapped_column(Text, nullable=True)

    template = relationship("PlanTemplate", back_populates="exercises")
    exercise = relationship("Exercise", lazy="selectin")


class PlanScheduleEntry(Base):
    __tablename__ = "plan_schedule_entries"
    __table_args__ = (
        Index("ix_schedule_entries_plan_date", "plan_id", "scheduled_date"),
    )

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    plan_id: Mapped[int] = mapped_column(
        ForeignKey("training_plans.id", ondelete="CASCADE"), nullable=False
    )
    template_id: Mapped[int] = mapped_column(
        ForeignKey("plan_templates.id"), nullable=False
    )
    scheduled_date: Mapped[date] = mapped_column(Date, nullable=False)
    is_completed: Mapped[bool] = mapped_column(Boolean, server_default="false")
    workout_id: Mapped[int | None] = mapped_column(
        ForeignKey("workouts.id"), nullable=True
    )

    plan = relationship("TrainingPlan", back_populates="schedule_entries")
    template = relationship("PlanTemplate", back_populates="schedule_entries")

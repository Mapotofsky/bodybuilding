import enum
from datetime import date, datetime

from sqlalchemy import (
    Boolean,
    Date,
    DateTime,
    Enum,
    Float,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin


class WeightUnitEnum(str, enum.Enum):
    kg = "kg"
    lb = "lb"


class Workout(Base, TimestampMixin):
    __tablename__ = "workouts"
    __table_args__ = (Index("ix_workouts_user_date", "user_id", "date"),)

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    date: Mapped[date] = mapped_column(Date, nullable=False)
    start_time: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    end_time: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    plan_template_id: Mapped[int | None] = mapped_column(
        ForeignKey("plan_templates.id", ondelete="SET NULL"), nullable=True
    )
    note: Mapped[str | None] = mapped_column(Text)
    mood: Mapped[int | None] = mapped_column(Integer)

    user = relationship("User", back_populates="workouts")
    plan_template = relationship("PlanTemplate", lazy="selectin", foreign_keys=[plan_template_id])
    exercises = relationship(
        "WorkoutExercise", back_populates="workout", lazy="selectin",
        cascade="all, delete-orphan", order_by="WorkoutExercise.sort_order",
    )


class WorkoutExercise(Base, TimestampMixin):
    __tablename__ = "workout_exercises"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    workout_id: Mapped[int] = mapped_column(ForeignKey("workouts.id", ondelete="CASCADE"), nullable=False)
    exercise_id: Mapped[int] = mapped_column(ForeignKey("exercises.id"), nullable=False)
    sort_order: Mapped[int] = mapped_column(Integer, server_default="0")
    superset_group: Mapped[int | None] = mapped_column(Integer, nullable=True)

    workout = relationship("Workout", back_populates="exercises")
    exercise = relationship("Exercise", lazy="selectin")
    sets = relationship(
        "WorkoutSet", back_populates="workout_exercise", lazy="selectin",
        cascade="all, delete-orphan", order_by="WorkoutSet.set_number",
    )


class WorkoutSet(Base):
    __tablename__ = "workout_sets"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    workout_exercise_id: Mapped[int] = mapped_column(
        ForeignKey("workout_exercises.id", ondelete="CASCADE"), nullable=False
    )
    set_number: Mapped[int] = mapped_column(Integer, nullable=False)
    weight: Mapped[float | None] = mapped_column(Float)
    reps: Mapped[int | None] = mapped_column(Integer)
    unit: Mapped[WeightUnitEnum] = mapped_column(Enum(WeightUnitEnum), server_default="kg")
    duration_sec: Mapped[int | None] = mapped_column(Integer)
    distance_m: Mapped[float | None] = mapped_column(Float)
    rpe: Mapped[float | None] = mapped_column(Float)
    is_warmup: Mapped[bool] = mapped_column(Boolean, server_default="false")
    is_dropset: Mapped[bool] = mapped_column(Boolean, server_default="false")
    is_failure: Mapped[bool] = mapped_column(Boolean, server_default="false")
    rest_seconds: Mapped[int | None] = mapped_column(Integer, nullable=True)

    workout_exercise = relationship("WorkoutExercise", back_populates="sets")

import enum

from sqlalchemy import Boolean, Enum, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin


class ExerciseCategoryEnum(str, enum.Enum):
    chest = "chest"
    back = "back"
    legs = "legs"
    shoulders = "shoulders"
    arms = "arms"
    core = "core"
    cardio = "cardio"
    compound = "compound"


class ExerciseTypeEnum(str, enum.Enum):
    strength = "strength"
    cardio = "cardio"
    flexibility = "flexibility"


class Exercise(Base, TimestampMixin):
    __tablename__ = "exercises"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    category: Mapped[ExerciseCategoryEnum] = mapped_column(Enum(ExerciseCategoryEnum), nullable=False)
    type: Mapped[ExerciseTypeEnum] = mapped_column(
        Enum(ExerciseTypeEnum), server_default="strength"
    )
    description: Mapped[str | None] = mapped_column(Text)
    met_value: Mapped[float | None] = mapped_column(Float)
    is_custom: Mapped[bool] = mapped_column(Boolean, server_default="false")
    user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)

import enum
from datetime import date, datetime

from sqlalchemy import Date, Enum, Float, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin


class GenderEnum(str, enum.Enum):
    male = "male"
    female = "female"
    other = "other"


class RoleEnum(str, enum.Enum):
    user = "user"
    admin = "admin"


class User(Base, TimestampMixin):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    nickname: Mapped[str | None] = mapped_column(String(50))
    avatar_url: Mapped[str | None] = mapped_column(String(500))
    gender: Mapped[GenderEnum | None] = mapped_column(Enum(GenderEnum))
    height: Mapped[float | None] = mapped_column(Float)
    weight: Mapped[float | None] = mapped_column(Float)
    birth_date: Mapped[date | None] = mapped_column(Date)
    role: Mapped[RoleEnum] = mapped_column(Enum(RoleEnum), server_default="user")

    workouts = relationship("Workout", back_populates="user", lazy="selectin")

import datetime

from pydantic import BaseModel


class UserOut(BaseModel):
    id: int
    email: str
    nickname: str | None = None
    avatar_url: str | None = None
    gender: str | None = None
    height: float | None = None
    weight: float | None = None
    birth_date: datetime.date | None = None
    role: str
    created_at: datetime.datetime

    model_config = {"from_attributes": True}


class UserUpdate(BaseModel):
    nickname: str | None = None
    avatar_url: str | None = None
    gender: str | None = None
    height: float | None = None
    weight: float | None = None
    birth_date: datetime.date | None = None

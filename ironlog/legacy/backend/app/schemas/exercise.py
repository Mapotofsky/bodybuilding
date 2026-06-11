from pydantic import BaseModel


class ExerciseOut(BaseModel):
    id: int
    name: str
    category: str
    type: str
    description: str | None = None
    met_value: float | None = None
    is_custom: bool

    model_config = {"from_attributes": True}


class ExerciseCreate(BaseModel):
    name: str
    category: str
    type: str = "strength"
    description: str | None = None
    met_value: float | None = None

from pydantic import BaseModel


class ErrorResponse(BaseModel):
    code: int
    message: str
    details: list[dict] | None = None


class PaginatedResponse(BaseModel):
    total: int
    page: int
    size: int
    items: list

from fastapi import APIRouter

from app.api.v1.auth import router as auth_router
from app.api.v1.exercises import router as exercises_router
from app.api.v1.users import router as users_router
from app.api.v1.workouts import router as workouts_router

api_router = APIRouter()
api_router.include_router(auth_router)
api_router.include_router(users_router)
api_router.include_router(exercises_router)
api_router.include_router(workouts_router)

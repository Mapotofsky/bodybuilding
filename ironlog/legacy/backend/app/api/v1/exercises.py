from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.exercise import Exercise
from app.models.user import User
from app.models.workout import Workout, WorkoutExercise, WorkoutSet
from app.schemas.exercise import ExerciseCreate, ExerciseOut

router = APIRouter(prefix="/exercises", tags=["动作库"])


@router.get("", response_model=list[ExerciseOut])
async def list_exercises(
    category: str | None = None,
    q: str | None = None,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    stmt = select(Exercise).where(
        or_(Exercise.is_custom == False, Exercise.user_id == user.id)
    )
    if category:
        stmt = stmt.where(Exercise.category == category)
    if q:
        stmt = stmt.where(Exercise.name.ilike(f"%{q}%"))
    stmt = stmt.order_by(Exercise.category, Exercise.name)
    result = await db.execute(stmt)
    return result.scalars().all()


@router.post("", response_model=ExerciseOut, status_code=status.HTTP_201_CREATED)
async def create_exercise(
    body: ExerciseCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    exercise = Exercise(
        name=body.name,
        category=body.category,
        type=body.type,
        description=body.description,
        met_value=body.met_value,
        is_custom=True,
        user_id=user.id,
    )
    db.add(exercise)
    await db.flush()
    return exercise


@router.get("/{exercise_id}", response_model=dict)
async def get_exercise(
    exercise_id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Return exercise detail with usage statistics for current user."""
    result = await db.execute(
        select(Exercise).where(
            Exercise.id == exercise_id,
            or_(Exercise.is_custom == False, Exercise.user_id == user.id),
        )
    )
    exercise = result.scalar_one_or_none()
    if not exercise:
        raise HTTPException(status_code=404, detail="动作不存在")

    # Count usage and last used date
    usage_stmt = (
        select(
            func.count(WorkoutSet.id).label("usage_count"),
        )
        .join(WorkoutExercise, WorkoutExercise.id == WorkoutSet.workout_exercise_id)
        .join(Workout, Workout.id == WorkoutExercise.workout_id)
        .where(
            Workout.user_id == user.id,
            WorkoutExercise.exercise_id == exercise_id,
        )
    )
    usage_result = await db.execute(usage_stmt)
    usage_row = usage_result.one()

    last_date_stmt = (
        select(func.max(Workout.date))
        .join(WorkoutExercise, WorkoutExercise.workout_id == Workout.id)
        .where(
            Workout.user_id == user.id,
            WorkoutExercise.exercise_id == exercise_id,
        )
    )
    last_result = await db.execute(last_date_stmt)
    last_date = last_result.scalar_one_or_none()

    return {
        "id": exercise.id,
        "name": exercise.name,
        "category": exercise.category.value,
        "type": exercise.type.value,
        "description": exercise.description,
        "met_value": exercise.met_value,
        "is_custom": exercise.is_custom,
        "usage_count": usage_row.usage_count or 0,
        "last_used_date": str(last_date) if last_date else None,
    }


@router.get("/{exercise_id}/history")
async def exercise_history(
    exercise_id: int,
    limit: int = Query(default=30, le=100),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Return recent sets for a given exercise performed by the current user."""
    stmt = (
        select(
            Workout.date,
            WorkoutSet.set_number,
            WorkoutSet.weight,
            WorkoutSet.reps,
            WorkoutSet.unit,
            WorkoutSet.rest_seconds,
        )
        .join(WorkoutExercise, WorkoutExercise.workout_id == Workout.id)
        .join(WorkoutSet, WorkoutSet.workout_exercise_id == WorkoutExercise.id)
        .where(
            Workout.user_id == user.id,
            WorkoutExercise.exercise_id == exercise_id,
        )
        .order_by(Workout.date.desc(), WorkoutSet.set_number)
        .limit(limit)
    )
    result = await db.execute(stmt)
    rows = result.all()
    return [
        {
            "date": str(r.date),
            "set_number": r.set_number,
            "weight": r.weight,
            "reps": r.reps,
            "unit": r.unit.value if r.unit else "kg",
            "rest_seconds": r.rest_seconds,
        }
        for r in rows
    ]

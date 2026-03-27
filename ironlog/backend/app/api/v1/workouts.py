from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import extract, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.models.workout import Workout, WorkoutExercise, WorkoutSet
from app.schemas.workout import (
    CopyWorkoutRequest,
    WorkoutCreate,
    WorkoutExerciseOut,
    WorkoutOut,
    WorkoutSetOut,
    WorkoutShareData,
    WorkoutSummary,
    WorkoutUpdate,
)

router = APIRouter(prefix="/workouts", tags=["训练日志"])


def _build_exercise_out(we: WorkoutExercise) -> WorkoutExerciseOut:
    return WorkoutExerciseOut(
        id=we.id,
        exercise_id=we.exercise_id,
        exercise_name=we.exercise.name if we.exercise else None,
        exercise_category=we.exercise.category.value if we.exercise else None,
        sort_order=we.sort_order,
        superset_group=we.superset_group,
        sets=[WorkoutSetOut.model_validate(s) for s in we.sets],
    )


def _build_workout_out(w: Workout) -> WorkoutOut:
    return WorkoutOut(
        id=w.id,
        user_id=w.user_id,
        date=w.date,
        start_time=w.start_time,
        end_time=w.end_time,
        note=w.note,
        mood=w.mood,
        exercises=[_build_exercise_out(we) for we in w.exercises],
        created_at=w.created_at,
        updated_at=w.updated_at,
    )


def _build_summary(w: Workout) -> WorkoutSummary:
    total_sets = 0
    total_volume = 0.0
    for we in w.exercises:
        for s in we.sets:
            total_sets += 1
            if s.weight and s.reps:
                total_volume += s.weight * s.reps
    return WorkoutSummary(
        id=w.id,
        date=w.date,
        start_time=w.start_time,
        end_time=w.end_time,
        note=w.note,
        mood=w.mood,
        exercise_count=len(w.exercises),
        total_sets=total_sets,
        total_volume=total_volume,
        created_at=w.created_at,
    )


@router.post("", response_model=WorkoutOut, status_code=status.HTTP_201_CREATED)
async def create_workout(
    body: WorkoutCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    workout = Workout(
        user_id=user.id,
        date=body.date,
        start_time=body.start_time,
        end_time=body.end_time,
        note=body.note,
        mood=body.mood,
    )
    db.add(workout)
    await db.flush()

    for ex_data in body.exercises:
        we = WorkoutExercise(
            workout_id=workout.id,
            exercise_id=ex_data.exercise_id,
            sort_order=ex_data.sort_order,
            superset_group=ex_data.superset_group,
        )
        db.add(we)
        await db.flush()
        for set_data in ex_data.sets:
            ws = WorkoutSet(
                workout_exercise_id=we.id,
                set_number=set_data.set_number,
                weight=set_data.weight,
                reps=set_data.reps,
                unit=set_data.unit,
                duration_sec=set_data.duration_sec,
                distance_m=set_data.distance_m,
                rpe=set_data.rpe,
                is_warmup=set_data.is_warmup,
                is_dropset=set_data.is_dropset,
                is_failure=set_data.is_failure,
                rest_seconds=set_data.rest_seconds,
            )
            db.add(ws)
    await db.flush()

    return await _get_workout_or_404(db, workout.id, user.id)


@router.get("", response_model=list[WorkoutSummary])
async def list_workouts(
    month: str | None = Query(None, description="格式 YYYY-MM"),
    from_date: date | None = Query(None, alias="from"),
    to_date: date | None = Query(None, alias="to"),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    stmt = (
        select(Workout)
        .where(Workout.user_id == user.id)
        .options(
            selectinload(Workout.exercises).selectinload(WorkoutExercise.sets),
            selectinload(Workout.exercises).selectinload(WorkoutExercise.exercise),
        )
    )

    if month:
        year, mon = month.split("-")
        stmt = stmt.where(
            extract("year", Workout.date) == int(year),
            extract("month", Workout.date) == int(mon),
        )
    if from_date:
        stmt = stmt.where(Workout.date >= from_date)
    if to_date:
        stmt = stmt.where(Workout.date <= to_date)

    stmt = stmt.order_by(Workout.date.desc())
    result = await db.execute(stmt)
    workouts = result.scalars().unique().all()
    return [_build_summary(w) for w in workouts]


@router.get("/{workout_id}", response_model=WorkoutOut)
async def get_workout(
    workout_id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return await _get_workout_or_404(db, workout_id, user.id)


@router.put("/{workout_id}", response_model=WorkoutOut)
async def update_workout(
    workout_id: int,
    body: WorkoutUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    workout = await _get_workout_raw(db, workout_id, user.id)

    if body.date is not None:
        workout.date = body.date
    if body.start_time is not None:
        workout.start_time = body.start_time
    if body.end_time is not None:
        workout.end_time = body.end_time
    if body.note is not None:
        workout.note = body.note
    if body.mood is not None:
        workout.mood = body.mood

    if body.exercises is not None:
        for we in workout.exercises:
            await db.delete(we)
        await db.flush()

        for ex_data in body.exercises:
            we = WorkoutExercise(
                workout_id=workout.id,
                exercise_id=ex_data.exercise_id,
                sort_order=ex_data.sort_order,
                superset_group=ex_data.superset_group,
            )
            db.add(we)
            await db.flush()
            for set_data in ex_data.sets:
                ws = WorkoutSet(
                    workout_exercise_id=we.id,
                    set_number=set_data.set_number,
                    weight=set_data.weight,
                    reps=set_data.reps,
                    unit=set_data.unit,
                    duration_sec=set_data.duration_sec,
                    distance_m=set_data.distance_m,
                    rpe=set_data.rpe,
                    is_warmup=set_data.is_warmup,
                    is_dropset=set_data.is_dropset,
                    is_failure=set_data.is_failure,
                    rest_seconds=set_data.rest_seconds,
                )
                db.add(ws)
        await db.flush()

    return await _get_workout_or_404(db, workout_id, user.id)


@router.delete("/{workout_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_workout(
    workout_id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    workout = await _get_workout_raw(db, workout_id, user.id)
    await db.delete(workout)


@router.post("/{workout_id}/copy", response_model=WorkoutOut, status_code=status.HTTP_201_CREATED)
async def copy_workout(
    workout_id: int,
    body: CopyWorkoutRequest,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    source = await _get_workout_or_404(db, workout_id, user.id)

    new_workout = Workout(
        user_id=user.id,
        date=body.target_date,
        note=source.note,
        mood=source.mood,
    )
    db.add(new_workout)
    await db.flush()

    for ex_out in source.exercises:
        we = WorkoutExercise(
            workout_id=new_workout.id,
            exercise_id=ex_out.exercise_id,
            sort_order=ex_out.sort_order,
            superset_group=ex_out.superset_group,
        )
        db.add(we)
        await db.flush()
        for s in ex_out.sets:
            ws = WorkoutSet(
                workout_exercise_id=we.id,
                set_number=s.set_number,
                weight=s.weight,
                reps=s.reps,
                unit=s.unit,
                duration_sec=s.duration_sec,
                distance_m=s.distance_m,
                rpe=s.rpe,
                is_warmup=s.is_warmup,
                is_dropset=s.is_dropset,
                is_failure=s.is_failure,
            )
            db.add(ws)
    await db.flush()

    return await _get_workout_or_404(db, new_workout.id, user.id)


@router.post("/{workout_id}/share", response_model=WorkoutShareData)
async def share_workout(
    workout_id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    workout = await _get_workout_raw(db, workout_id, user.id)

    total_sets = 0
    total_volume = 0.0
    exercise_summaries = []
    for we in workout.exercises:
        ex_sets = 0
        ex_volume = 0.0
        for s in we.sets:
            ex_sets += 1
            if s.weight and s.reps:
                ex_volume += s.weight * s.reps
        total_sets += ex_sets
        total_volume += ex_volume
        exercise_summaries.append({
            "name": we.exercise.name if we.exercise else f"动作#{we.exercise_id}",
            "category": we.exercise.category.value if we.exercise else None,
            "sets": ex_sets,
            "volume": round(ex_volume, 1),
        })

    duration = None
    if workout.start_time and workout.end_time:
        delta = workout.end_time - workout.start_time
        duration = int(delta.total_seconds() / 60)

    return WorkoutShareData(
        date=workout.date,
        mood=workout.mood,
        duration_minutes=duration,
        exercise_count=len(workout.exercises),
        total_sets=total_sets,
        total_volume=round(total_volume, 1),
        exercises=exercise_summaries,
        note=workout.note,
    )


# ---------- helpers ----------

async def _get_workout_raw(db: AsyncSession, workout_id: int, user_id: int) -> Workout:
    stmt = (
        select(Workout)
        .where(Workout.id == workout_id, Workout.user_id == user_id)
        .options(
            selectinload(Workout.exercises).selectinload(WorkoutExercise.sets),
            selectinload(Workout.exercises).selectinload(WorkoutExercise.exercise),
        )
    )
    result = await db.execute(stmt)
    workout = result.scalar_one_or_none()
    if not workout:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="训练记录不存在")
    return workout


async def _get_workout_or_404(db: AsyncSession, workout_id: int, user_id: int) -> WorkoutOut:
    workout = await _get_workout_raw(db, workout_id, user_id)
    return _build_workout_out(workout)

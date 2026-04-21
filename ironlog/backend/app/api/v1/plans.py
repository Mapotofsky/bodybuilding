import datetime
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.plan import PlanScheduleEntry, PlanTemplate, TemplateExercise, TrainingPlan
from app.models.user import User
from app.models.workout import Workout
from app.schemas.plan import (
    CalendarDay,
    PlanCreate,
    PlanOut,
    PlanSummary,
    PlanUpdate,
    ScheduleEntryOut,
    ScheduleRequest,
    TemplateCreate,
    TemplateOut,
    TemplateUpdate,
)
from app.services.calendar import generate_calendar_entries

router = APIRouter(prefix="/plans", tags=["训练计划"])


# ──────────────────────── helpers ────────────────────────

async def _get_plan_or_404(plan_id: int, user_id: int, db: AsyncSession) -> TrainingPlan:
    result = await db.execute(
        select(TrainingPlan)
        .where(TrainingPlan.id == plan_id, TrainingPlan.user_id == user_id)
        .options(
            selectinload(TrainingPlan.templates).selectinload(PlanTemplate.exercises)
        )
    )
    plan = result.scalar_one_or_none()
    if not plan:
        raise HTTPException(status_code=404, detail="训练计划不存在")
    return plan


async def _get_template_or_404(
    plan_id: int, template_id: int, user_id: int, db: AsyncSession
) -> PlanTemplate:
    result = await db.execute(
        select(PlanTemplate)
        .join(TrainingPlan)
        .where(
            PlanTemplate.id == template_id,
            PlanTemplate.plan_id == plan_id,
            TrainingPlan.user_id == user_id,
        )
        .options(selectinload(PlanTemplate.exercises))
    )
    tmpl = result.scalar_one_or_none()
    if not tmpl:
        raise HTTPException(status_code=404, detail="模版不存在")
    return tmpl


def _enrich_template_out(tmpl: PlanTemplate) -> TemplateOut:
    exercises_out = []
    for te in tmpl.exercises:
        exercises_out.append(
            {
                "id": te.id,
                "exercise_id": te.exercise_id,
                "exercise_name": te.exercise.name if te.exercise else None,
                "exercise_category": te.exercise.category.value if te.exercise else None,
                "sort_order": te.sort_order,
                "note": te.note,
            }
        )
    return TemplateOut(
        id=tmpl.id,
        plan_id=tmpl.plan_id,
        name=tmpl.name,
        sort_order=tmpl.sort_order,
        color=tmpl.color,
        schedule_rule=tmpl.schedule_rule,
        exercises=exercises_out,
        created_at=tmpl.created_at,
        updated_at=tmpl.updated_at,
    )


def _build_plan_out(plan: TrainingPlan) -> PlanOut:
    return PlanOut(
        id=plan.id,
        user_id=plan.user_id,
        name=plan.name,
        description=plan.description,
        color=plan.color,
        mode=plan.mode.value,
        cycle_length=plan.cycle_length,
        is_active=plan.is_active,
        templates=[_enrich_template_out(t) for t in plan.templates],
        created_at=plan.created_at,
        updated_at=plan.updated_at,
    )


async def _create_template_with_exercises(
    tmpl_data: TemplateCreate, plan_id: int, db: AsyncSession
) -> PlanTemplate:
    tmpl = PlanTemplate(
        plan_id=plan_id,
        name=tmpl_data.name,
        sort_order=tmpl_data.sort_order,
        color=tmpl_data.color,
        schedule_rule=tmpl_data.schedule_rule,
    )
    db.add(tmpl)
    await db.flush()

    for ex_data in tmpl_data.exercises:
        te = TemplateExercise(
            template_id=tmpl.id,
            exercise_id=ex_data.exercise_id,
            sort_order=ex_data.sort_order,
            note=ex_data.note,
        )
        db.add(te)

    await db.flush()
    return tmpl


# ──────────────────────── Plan CRUD ────────────────────────

@router.post("", response_model=PlanOut, status_code=status.HTTP_201_CREATED)
async def create_plan(
    body: PlanCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    plan = TrainingPlan(
        user_id=user.id,
        name=body.name,
        description=body.description,
        color=body.color,
        mode=body.mode,
        cycle_length=body.cycle_length,
    )
    db.add(plan)
    await db.flush()

    for tmpl_data in body.templates:
        await _create_template_with_exercises(tmpl_data, plan.id, db)

    await db.commit()
    await db.refresh(plan)

    # Reload with relationships
    result = await db.execute(
        select(TrainingPlan)
        .where(TrainingPlan.id == plan.id)
        .options(
            selectinload(TrainingPlan.templates).selectinload(PlanTemplate.exercises).selectinload(TemplateExercise.exercise)
        )
    )
    plan = result.scalar_one()
    return _build_plan_out(plan)


@router.get("", response_model=list[PlanSummary])
async def list_plans(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(TrainingPlan)
        .where(TrainingPlan.user_id == user.id)
        .options(selectinload(TrainingPlan.templates))
        .order_by(TrainingPlan.created_at.desc())
    )
    plans = result.scalars().all()
    return [
        PlanSummary(
            id=p.id,
            name=p.name,
            description=p.description,
            mode=p.mode.value,
            cycle_length=p.cycle_length,
            color=p.color,
            is_active=p.is_active,
            template_count=len(p.templates),
            created_at=p.created_at,
        )
        for p in plans
    ]


@router.get("/calendar", response_model=list[CalendarDay])
async def get_calendar(
    from_date: datetime.date = Query(..., alias="from"),
    to_date: datetime.date = Query(..., alias="to"),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    # Load all active plans with templates
    result = await db.execute(
        select(TrainingPlan)
        .where(TrainingPlan.user_id == user.id, TrainingPlan.is_active == True)
        .options(
            selectinload(TrainingPlan.templates)
            .selectinload(PlanTemplate.exercises)
        )
    )
    plans = result.scalars().all()

    all_template_ids = [t.id for p in plans for t in p.templates]

    # Build completed-workout map: {(template_id, date) → workout_id}
    completed_map: dict[tuple[int, datetime.date], int] = {}
    if all_template_ids:
        wq = await db.execute(
            select(Workout.plan_template_id, Workout.date, Workout.id)
            .where(
                Workout.user_id == user.id,
                Workout.plan_template_id.in_(all_template_ids),
                Workout.date.between(from_date, to_date),
            )
        )
        for row in wq.fetchall():
            completed_map[(row[0], row[1])] = row[2]

    # For cyclic plans: find the most recent completed workout overall (no date bound).
    # Using the latest completion allows correct gap-based projection via day_in_cycle:
    # completing template A on Jul 15 correctly schedules B at Jul 15 + gap(A→B).
    last_done_map: dict[int, tuple[int, datetime.date]] = {}  # plan_id → (template_id, done_date)
    cyclic_plans = [p for p in plans if p.mode == "cyclic"]
    if cyclic_plans:
        cyclic_tmpl_ids = [t.id for p in cyclic_plans for t in p.templates]
        lq = await db.execute(
            select(Workout.plan_template_id, Workout.date)
            .where(
                Workout.user_id == user.id,
                Workout.plan_template_id.in_(cyclic_tmpl_ids),
            )
            .order_by(Workout.date.desc())
        )
        seen_plans: set[int] = set()
        for row in lq.fetchall():
            tmpl_id, done_date = row[0], row[1]
            for p in cyclic_plans:
                if p.id in seen_plans:
                    continue
                if any(t.id == tmpl_id for t in p.templates):
                    last_done_map[p.id] = (tmpl_id, done_date)
                    seen_plans.add(p.id)

    # Pre-build a set of (plan_id, date) pairs where ANY template from that cyclic
    # plan was actually completed — used to suppress duplicate pending entries
    cyclic_done_dates: set[tuple[int, datetime.date]] = set()
    for p in cyclic_plans:
        plan_tmpl_ids = {t.id for t in p.templates}
        for (tid, d) in completed_map:
            if tid in plan_tmpl_ids:
                cyclic_done_dates.add((p.id, d))

    # Build calendar dict: date → list[entry_dict]
    calendar: dict[datetime.date, list[dict]] = {}

    for plan in plans:
        last_done = last_done_map.get(plan.id)
        last_done_tmpl_id = last_done[0] if last_done else None
        last_done_dt = last_done[1] if last_done else None
        virtual = generate_calendar_entries(plan, from_date, to_date, last_done_tmpl_id, last_done_dt)
        for v in virtual:
            d = v["scheduled_date"]
            tmpl = next((t for t in plan.templates if t.id == v["template_id"]), None)
            if not tmpl:
                continue
            key = (tmpl.id, d)
            is_completed = key in completed_map

            # For cyclic plans: if a DIFFERENT template from this plan was done today,
            # skip generating the "next" pending entry — avoid showing two entries
            if plan.mode == "cyclic" and not is_completed:
                if (plan.id, d) in cyclic_done_dates:
                    continue  # already trained for this plan on this date

            calendar.setdefault(d, []).append({
                "id": 0,
                "plan_id": plan.id,
                "plan_name": plan.name,
                "plan_color": plan.color,
                "plan_mode": plan.mode,
                "template_id": tmpl.id,
                "template_name": tmpl.name,
                "template_color": tmpl.color,
                "template_exercise_ids": [te.exercise_id for te in tmpl.exercises],
                "scheduled_date": d,
                "is_completed": is_completed,
                "workout_id": completed_map.get(key),
            })

        # For cyclic plans: also inject completed entries for templates that were
        # done in the range but whose template_id differs from the "next" generated one
        if plan.mode == "cyclic":
            plan_tmpl_ids = {t.id for t in plan.templates}
            for (tid, d), wid in completed_map.items():
                if tid not in plan_tmpl_ids:
                    continue
                if not (from_date <= d <= to_date):
                    continue
                # Add if not already present
                existing = calendar.get(d, [])
                if not any(e["template_id"] == tid and e["plan_id"] == plan.id for e in existing):
                    tmpl = next((t for t in plan.templates if t.id == tid), None)
                    if tmpl:
                        calendar.setdefault(d, []).append({
                            "id": 0,
                            "plan_id": plan.id,
                            "plan_name": plan.name,
                            "plan_color": plan.color,
                            "plan_mode": plan.mode,
                            "template_id": tid,
                            "template_name": tmpl.name,
                            "template_color": tmpl.color,
                            "template_exercise_ids": [te.exercise_id for te in tmpl.exercises],
                            "scheduled_date": d,
                            "is_completed": True,
                            "workout_id": wid,
                        })

    # Merge manual schedule entries (they override auto-generated ones)
    manual_result = await db.execute(
        select(PlanScheduleEntry)
        .join(TrainingPlan)
        .where(
            TrainingPlan.user_id == user.id,
            PlanScheduleEntry.scheduled_date >= from_date,
            PlanScheduleEntry.scheduled_date <= to_date,
        )
        .options(
            selectinload(PlanScheduleEntry.plan),
            selectinload(PlanScheduleEntry.template).selectinload(PlanTemplate.exercises),
        )
    )
    for entry in manual_result.scalars().all():
        d = entry.scheduled_date
        calendar[d] = [e for e in calendar.get(d, [])
                       if not (e["template_id"] == entry.template_id and e["id"] == 0)]
        calendar.setdefault(d, []).append({
            "id": entry.id,
            "plan_id": entry.plan_id,
            "plan_name": entry.plan.name,
            "plan_color": entry.plan.color,
            "plan_mode": entry.plan.mode,
            "template_id": entry.template_id,
            "template_name": entry.template.name,
            "template_color": entry.template.color,
            "template_exercise_ids": [te.exercise_id for te in entry.template.exercises],
            "scheduled_date": d,
            "is_completed": entry.is_completed,
            "workout_id": entry.workout_id,
        })

    # Build ordered response
    days = []
    current = from_date
    while current <= to_date:
        entries_out = [
            ScheduleEntryOut(
                id=e["id"],
                plan_id=e["plan_id"],
                plan_name=e["plan_name"],
                plan_color=e["plan_color"],
                plan_mode=e["plan_mode"],
                template_id=e["template_id"],
                template_name=e["template_name"],
                template_color=e["template_color"],
                template_exercise_ids=e["template_exercise_ids"],
                scheduled_date=e["scheduled_date"],
                is_completed=e["is_completed"],
                workout_id=e["workout_id"],
            )
            for e in calendar.get(current, [])
        ]
        days.append(CalendarDay(date=current, entries=entries_out))
        current += datetime.timedelta(days=1)

    return days


@router.get("/{plan_id}", response_model=PlanOut)
async def get_plan(
    plan_id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    plan = await _get_plan_or_404(plan_id, user.id, db)
    # Reload with exercise relationships
    result = await db.execute(
        select(TrainingPlan)
        .where(TrainingPlan.id == plan_id)
        .options(
            selectinload(TrainingPlan.templates)
            .selectinload(PlanTemplate.exercises)
            .selectinload(TemplateExercise.exercise)
        )
    )
    plan = result.scalar_one()
    return _build_plan_out(plan)


@router.put("/{plan_id}", response_model=PlanOut)
async def update_plan(
    plan_id: int,
    body: PlanUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    plan = await _get_plan_or_404(plan_id, user.id, db)
    update_data = body.model_dump(exclude_none=True)
    for field, val in update_data.items():
        setattr(plan, field, val)
    await db.commit()
    await db.refresh(plan)

    result = await db.execute(
        select(TrainingPlan)
        .where(TrainingPlan.id == plan_id)
        .options(
            selectinload(TrainingPlan.templates)
            .selectinload(PlanTemplate.exercises)
            .selectinload(TemplateExercise.exercise)
        )
    )
    plan = result.scalar_one()
    return _build_plan_out(plan)


@router.delete("/{plan_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_plan(
    plan_id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    plan = await _get_plan_or_404(plan_id, user.id, db)
    await db.delete(plan)
    await db.commit()


# ──────────────────────── Template CRUD ────────────────────────

@router.post("/{plan_id}/templates", response_model=TemplateOut, status_code=status.HTTP_201_CREATED)
async def add_template(
    plan_id: int,
    body: TemplateCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    await _get_plan_or_404(plan_id, user.id, db)
    tmpl = await _create_template_with_exercises(body, plan_id, db)
    await db.commit()

    result = await db.execute(
        select(PlanTemplate)
        .where(PlanTemplate.id == tmpl.id)
        .options(selectinload(PlanTemplate.exercises).selectinload(TemplateExercise.exercise))
    )
    tmpl = result.scalar_one()
    return _enrich_template_out(tmpl)


@router.put("/{plan_id}/templates/{template_id}", response_model=TemplateOut)
async def update_template(
    plan_id: int,
    template_id: int,
    body: TemplateUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    tmpl = await _get_template_or_404(plan_id, template_id, user.id, db)

    if body.name is not None:
        tmpl.name = body.name
    if body.sort_order is not None:
        tmpl.sort_order = body.sort_order
    if body.color is not None:
        tmpl.color = body.color
    if body.schedule_rule is not None:
        tmpl.schedule_rule = body.schedule_rule

    if body.exercises is not None:
        # Full replace: delete existing, recreate
        for ex in list(tmpl.exercises):
            await db.delete(ex)
        await db.flush()
        for ex_data in body.exercises:
            te = TemplateExercise(
                template_id=tmpl.id,
                exercise_id=ex_data.exercise_id,
                sort_order=ex_data.sort_order,
                note=ex_data.note,
            )
            db.add(te)

    await db.commit()

    result = await db.execute(
        select(PlanTemplate)
        .where(PlanTemplate.id == tmpl.id)
        .options(selectinload(PlanTemplate.exercises).selectinload(TemplateExercise.exercise))
    )
    tmpl = result.scalar_one()
    return _enrich_template_out(tmpl)


@router.delete("/{plan_id}/templates/{template_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_template(
    plan_id: int,
    template_id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    tmpl = await _get_template_or_404(plan_id, template_id, user.id, db)
    await db.delete(tmpl)
    await db.commit()


# ──────────────────────── Template by ID & Schedule ────────────────────────

@router.get("/templates/{template_id}", response_model=TemplateOut)
async def get_template_by_id(
    template_id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(PlanTemplate)
        .join(TrainingPlan)
        .where(PlanTemplate.id == template_id, TrainingPlan.user_id == user.id)
        .options(selectinload(PlanTemplate.exercises).selectinload(TemplateExercise.exercise))
    )
    tmpl = result.scalar_one_or_none()
    if not tmpl:
        raise HTTPException(status_code=404, detail="模版不存在")
    return _enrich_template_out(tmpl)


@router.post("/templates/{template_id}/schedule", status_code=status.HTTP_201_CREATED)
async def schedule_template(
    template_id: int,
    body: ScheduleRequest,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(PlanTemplate)
        .join(TrainingPlan)
        .where(PlanTemplate.id == template_id, TrainingPlan.user_id == user.id)
    )
    tmpl = result.scalar_one_or_none()
    if not tmpl:
        raise HTTPException(status_code=404, detail="模版不存在")

    entry = PlanScheduleEntry(
        plan_id=tmpl.plan_id,
        template_id=template_id,
        scheduled_date=body.date,
    )
    db.add(entry)
    await db.commit()
    return {"id": entry.id, "scheduled_date": str(body.date)}



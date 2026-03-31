"""
Calendar generation logic for training plans.
Generates virtual schedule entries based on plan mode and date range.
"""
from datetime import date, timedelta, date as _date_type
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from app.models.plan import TrainingPlan


def generate_calendar_entries(
    plan: "TrainingPlan",
    from_date: date,
    to_date: date,
    last_done_template_id: int | None = None,
) -> list[dict]:
    """
    Return a list of virtual schedule entry dicts for the given date range.
    Each dict: { plan_id, template_id, scheduled_date }

    - weekly: fixed day-of-week scheduling (ignores last_done_template_id)
    - cyclic: history-based — next template after last_done_template_id, one per day
    - flexible: no auto-generation
    """
    entries: list[dict] = []
    plan_start: date = plan.created_at.date()

    if plan.mode == "weekly":
        entries.extend(_weekly_entries(plan, from_date, to_date, plan_start))
    elif plan.mode == "cyclic":
        entries.extend(_cyclic_entries(plan, from_date, to_date, plan_start, last_done_template_id))
    # flexible: no auto-generation

    return entries


def _weekly_entries(plan: "TrainingPlan", from_date: date, to_date: date, plan_start: date) -> list[dict]:
    """Generate entries for weekly-mode plan. Never shows before plan creation date."""
    entries: list[dict] = []
    current = max(from_date, plan_start)
    while current <= to_date:
        current_weekday = current.weekday() + 1  # Monday=1 … Sunday=7

        for template in plan.templates:
            rule = template.schedule_rule
            if not rule:
                continue
            day_of_week: list[int] = rule.get("day_of_week", [])
            if current_weekday in day_of_week:
                entries.append({
                    "plan_id": plan.id,
                    "template_id": template.id,
                    "scheduled_date": current,
                })
        current += timedelta(days=1)

    return entries


def _cyclic_entries(
    plan: "TrainingPlan",
    from_date: date,
    to_date: date,
    plan_start: date,
    last_done_template_id: int | None,
) -> list[dict]:
    """
    History-based cyclic scheduling.
    Returns the NEXT template in rotation as a single entry on from_date.
    Cyclic plans have no fixed day schedule — the next session picks up
    from wherever the last one left off, regardless of calendar date.
    """
    templates = sorted(plan.templates, key=lambda t: t.sort_order)
    if not templates:
        return []

    effective_start = max(from_date, plan_start)
    if effective_start > to_date:
        return []

    n = len(templates)
    if last_done_template_id is not None:
        idx_map = {t.id: i for i, t in enumerate(templates)}
        last_idx = idx_map.get(last_done_template_id, -1)
        next_idx = (last_idx + 1) % n
    else:
        next_idx = 0

    # Only emit cyclic entries for today or future — past dates have no "missed" concept
    today = _date_type.today()
    entries = []
    current = max(effective_start, today)
    while current <= to_date:
        entries.append({
            "plan_id": plan.id,
            "template_id": templates[next_idx].id,
            "scheduled_date": current,
        })
        current += timedelta(days=1)

    return entries

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
    last_done_date: date | None = None,
) -> list[dict]:
    """
    Return a list of virtual schedule entry dicts for the given date range.
    Each dict: { plan_id, template_id, scheduled_date }

    - weekly: fixed day-of-week scheduling
    - cyclic: gap-based rotation driven by each template's day_in_cycle
    - flexible: no auto-generation
    """
    entries: list[dict] = []
    plan_start: date = plan.created_at.date()

    if plan.mode == "weekly":
        entries.extend(_weekly_entries(plan, from_date, to_date, plan_start))
    elif plan.mode == "cyclic":
        entries.extend(_cyclic_entries(plan, from_date, to_date, plan_start, last_done_template_id, last_done_date))
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


def _get_day_in_cycle(template, fallback: int) -> int:
    """Extract day_in_cycle from schedule_rule; fall back to 1-indexed sort position."""
    if template.schedule_rule:
        v = template.schedule_rule.get("day_in_cycle")
        if v is not None:
            try:
                return int(v)
            except (TypeError, ValueError):
                pass
    return fallback


def _cyclic_gap(from_dic: int, to_dic: int, cycle_length: int) -> int:
    """Days between two day_in_cycle positions, respecting wrap-around."""
    return to_dic - from_dic if to_dic > from_dic else cycle_length - from_dic + to_dic


def _cyclic_entries(
    plan: "TrainingPlan",
    from_date: date,
    to_date: date,
    plan_start: date,
    last_done_template_id: int | None,
    last_done_date: date | None,
) -> list[dict]:
    """
    Gap-based cyclic scheduling using each template's day_in_cycle.

    The gap between consecutive templates equals the difference of their
    day_in_cycle values; wrap-around uses cycle_length as the period.
    This correctly models rest days: a template at day 4 and the next at
    day 1 of the following cycle have a gap of (cycle_length - 4 + 1) days.

    Past-due entries are pinned to today (no "missed" concept).
    """
    templates = sorted(plan.templates, key=lambda t: t.sort_order)
    if not templates:
        return []

    n = len(templates)
    cycle_length: int = plan.cycle_length or n
    today = _date_type.today()

    if last_done_template_id is not None and last_done_date is not None:
        idx_map = {t.id: i for i, t in enumerate(templates)}
        last_idx = idx_map.get(last_done_template_id, -1)
        if last_idx == -1:
            # Template no longer exists (deleted); restart from first
            next_idx = 0
            next_date = max(plan_start, today)
        else:
            next_idx = (last_idx + 1) % n
            last_dic = _get_day_in_cycle(templates[last_idx], last_idx + 1)
            next_dic = _get_day_in_cycle(templates[next_idx], next_idx + 1)
            gap = _cyclic_gap(last_dic, next_dic, cycle_length)
            next_date = last_done_date + timedelta(days=gap)
    else:
        next_idx = 0
        next_date = max(plan_start, today)

    # Pin overdue entries to today
    if next_date < today:
        next_date = today

    entries: list[dict] = []
    current_idx = next_idx
    current_date = next_date

    while current_date <= to_date:
        if current_date >= from_date:
            entries.append({
                "plan_id": plan.id,
                "template_id": templates[current_idx].id,
                "scheduled_date": current_date,
            })

        # Advance to the following template using day_in_cycle gap
        current_dic = _get_day_in_cycle(templates[current_idx], current_idx + 1)
        following_idx = (current_idx + 1) % n
        following_dic = _get_day_in_cycle(templates[following_idx], following_idx + 1)
        current_date = current_date + timedelta(days=_cyclic_gap(current_dic, following_dic, cycle_length))
        current_idx = following_idx

    return entries

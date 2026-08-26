from __future__ import annotations

from datetime import date, timedelta

from django.db import transaction
from django.db.models import Q
from django.utils import timezone
from rest_framework.exceptions import PermissionDenied, ValidationError

from core.clients.models import ClientProfile
from core.tenants.permission_codes import Perms
from core.tenants.rbac_service import get_member, user_has_permission
from meal.models.planning import DietPlanAssignment, PlannedMeal
from meal.models.tracking import MealAdherenceLog


def get_visible_client_or_raise(user, tenant, client_id) -> ClientProfile:
    client = (
        ClientProfile.objects
        .select_related('org_client__user', 'assigned_trainer__org_staff__user')
        .filter(id=client_id, tenant=tenant)
        .first()
    )
    if client is None:
        raise ValidationError({'client': 'Client not found for this organization.'})

    if user.is_superuser:
        return client

    member = get_member(user, tenant)
    if member is None:
        raise PermissionDenied('Authenticated user is not a member of this organization.')

    if member.is_owner or user_has_permission(user, tenant, Perms.MANAGE_CLIENTS):
        return client

    if getattr(client.user, 'id', None) == user.id:
        return client

    trainer_user = getattr(getattr(client.assigned_trainer, 'org_staff', None), 'user', None)
    if trainer_user and trainer_user.id == user.id:
        return client

    raise PermissionDenied('You do not have access to this client.')


def get_current_client_for_user(user, tenant) -> ClientProfile:
    client = (
        ClientProfile.objects
        .select_related('org_client__user')
        .filter(tenant=tenant, org_client__user=user)
        .first()
    )
    if client is None:
        raise ValidationError({'client': 'No client profile exists for the current user.'})
    return client


def get_active_assignment(client: ClientProfile, target_date: date) -> DietPlanAssignment | None:
    return (
        DietPlanAssignment.objects
        .filter(
            tenant=client.tenant,
            client=client,
            is_active=True,
            start_date__lte=target_date,
        )
        .filter(Q(end_date__isnull=True) | Q(end_date__gte=target_date))
        .select_related('plan')
        .prefetch_related('plan__meals__items__food_item', 'plan__meals__supplements')
        .order_by('-start_date', '-created_at')
        .first()
    )


def get_plan_day_number(assignment: DietPlanAssignment, target_date: date) -> int:
    plan_days = assignment.plan.meals.values_list('day_number', flat=True).distinct().count()
    if plan_days <= 1:
        return 1
    elapsed_days = (target_date - assignment.start_date).days
    return (elapsed_days % plan_days) + 1


def get_planned_meals_for_date(assignment: DietPlanAssignment, target_date: date):
    day_number = get_plan_day_number(assignment, target_date)
    return assignment.plan.meals.filter(day_number=day_number).prefetch_related(
        'items__food_item',
        'supplements',
    )


@transaction.atomic
def upsert_meal_adherence_log(*, client, planned_meal_id, log_date, status, notes=''):
    assignment = get_active_assignment(client, log_date)
    if assignment is None:
        raise ValidationError({'plan_assignment': 'No active diet plan assignment exists for this date.'})

    planned_meal = PlannedMeal.objects.filter(
        id=planned_meal_id,
        tenant=client.tenant,
        plan=assignment.plan,
    ).first()
    if planned_meal is None:
        raise ValidationError({'planned_meal': 'Planned meal is not part of the active diet plan.'})

    log, _ = MealAdherenceLog.objects.update_or_create(
        tenant=client.tenant,
        client=client,
        log_date=log_date,
        planned_meal=planned_meal,
        defaults={
            'plan_assignment': assignment,
            'status': status,
            'notes': notes or '',
        },
    )
    return log


def calculate_adherence(planned_count: int, logs) -> dict:
    completed = sum(1 for log in logs if log.status == MealAdherenceLog.StatusChoices.COMPLETED)
    modified = sum(1 for log in logs if log.status == MealAdherenceLog.StatusChoices.MODIFIED)
    skipped = sum(1 for log in logs if log.status == MealAdherenceLog.StatusChoices.SKIPPED)
    tracked = completed + modified + skipped

    if planned_count <= 0:
        strict = 0
        flexible = 0
    else:
        strict = (completed / planned_count) * 100
        flexible = ((completed + (modified * 0.5)) / planned_count) * 100

    return {
        'planned_count': planned_count,
        'tracked_count': tracked,
        'completed_count': completed,
        'modified_count': modified,
        'skipped_count': skipped,
        'strict_adherence_percent': round(strict, 2),
        'flexible_adherence_percent': round(flexible, 2),
    }


def parse_tracking_date(value: str | None) -> date:
    if not value:
        return timezone.localdate()
    try:
        return date.fromisoformat(value)
    except ValueError as exc:
        raise ValidationError({'date': 'Use YYYY-MM-DD format.'}) from exc


def parse_week(value: str | None) -> tuple[date, date]:
    if not value:
        today = timezone.localdate()
        start = today - timedelta(days=today.weekday())
        return start, start + timedelta(days=6)

    try:
        year_text, week_text = value.split('-W', 1)
        start = date.fromisocalendar(int(year_text), int(week_text), 1)
    except (ValueError, TypeError) as exc:
        raise ValidationError({'week': 'Use ISO week format like 2026-W35.'}) from exc

    return start, start + timedelta(days=6)

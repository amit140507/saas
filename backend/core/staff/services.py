from django.contrib.auth import get_user_model
from django.db import transaction
from rest_framework import serializers as drf_serializers

from .models import StaffProfile
from authentication.services import send_staff_activation_email
from core.tenants.models import OrganizationMember
from core.tenants.rbac_service import assign_role

User = get_user_model()

EMAIL_EXISTS_MESSAGE = "Email already exists. Use a different email id."


def _normalize_email(email: str) -> str:
    return (email or '').strip().lower()


def _ensure_user_fields_available(user_data: dict, *, exclude_user=None) -> None:
    email = _normalize_email(user_data.get('email', ''))
    username = (user_data.get('username') or '').strip()

    if email:
        email_queryset = User.objects.filter(email__iexact=email)
        if exclude_user:
            email_queryset = email_queryset.exclude(pk=exclude_user.pk)
        if email_queryset.exists():
            raise drf_serializers.ValidationError({'email': EMAIL_EXISTS_MESSAGE})

    if username:
        username_queryset = User.objects.filter(username=username)
        if exclude_user:
            username_queryset = username_queryset.exclude(pk=exclude_user.pk)
        if username_queryset.exists():
            if username == email:
                raise drf_serializers.ValidationError({'email': EMAIL_EXISTS_MESSAGE})
            raise drf_serializers.ValidationError({'username': 'Username already exists.'})


@transaction.atomic
def create_staff_member(tenant, user_data: dict, staff_data: dict, role_name: str) -> StaffProfile:
    email = _normalize_email(user_data.get('email', ''))
    if not email:
        raise drf_serializers.ValidationError({'email': 'This field is required.'})

    user, created = User.objects.get_or_create(
        email=email,
        defaults={
            'username': user_data.get('username') or email,
            'first_name': user_data.get('first_name', ''),
            'last_name': user_data.get('last_name', ''),
        },
    )

    if created:
        user.set_unusable_password()
        user.save(update_fields=['password'])
    else:
        updates = {
            field: user_data[field]
            for field in ('first_name', 'last_name', 'username')
            if user_data.get(field)
        }
        if updates:
            for field, value in updates.items():
                setattr(user, field, value)
            user.save(update_fields=list(updates.keys()))

    org_member = assign_role(user, tenant, role_name)
    staff, staff_created = StaffProfile.objects.update_or_create(
        org_staff=org_member,
        defaults={**staff_data, 'tenant': tenant},
    )
    if staff_created:
        transaction.on_commit(lambda: send_staff_activation_email(user=user, tenant=tenant))
    return staff


@transaction.atomic
def update_staff_member(staff: StaffProfile, user_data: dict, staff_data: dict, role_name: str | None = None) -> StaffProfile:
    user = staff.user
    if 'email' in user_data:
        user_data['email'] = _normalize_email(user_data['email'])
        user_data.setdefault('username', user_data['email'])
    if 'username' in user_data:
        user_data['username'] = (user_data['username'] or '').strip()

    _ensure_user_fields_available(user_data, exclude_user=user)

    updates = {
        field: user_data[field]
        for field in ('first_name', 'last_name', 'email', 'username')
        if field in user_data
    }
    if updates:
        for field, value in updates.items():
            setattr(user, field, value)
        user.save(update_fields=list(updates.keys()))

    if role_name:
        org_member = assign_role(user, staff.tenant, role_name)
        if staff.org_staff_id != org_member.id:
            staff.org_staff = org_member

    for field, value in staff_data.items():
        setattr(staff, field, value)
    staff.save()
    return staff


@transaction.atomic
def set_staff_status(staff: StaffProfile, status: str) -> StaffProfile:
    if status not in OrganizationMember.StatusChoices.values:
        raise drf_serializers.ValidationError({'status': 'Invalid staff status.'})

    staff.org_staff.status = status
    staff.org_staff.save(update_fields=['status', 'updated_at'])
    return staff

from django.contrib.auth import get_user_model
from django.db import transaction
from rest_framework import serializers as drf_serializers

from .models import StaffProfile
from core.tenants.rbac_service import assign_role

User = get_user_model()


@transaction.atomic
def create_staff_member(tenant, user_data: dict, staff_data: dict, role_name: str) -> StaffProfile:
    email = user_data.get('email', '').strip().lower()
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
    staff, _ = StaffProfile.objects.update_or_create(
        org_staff=org_member,
        defaults={**staff_data, 'tenant': tenant},
    )
    return staff


@transaction.atomic
def update_staff_member(staff: StaffProfile, user_data: dict, staff_data: dict, role_name: str | None = None) -> StaffProfile:
    user = staff.user
    updates = {
        field: user_data[field]
        for field in ('first_name', 'last_name', 'username')
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

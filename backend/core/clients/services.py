from django.utils import timezone
from django.db import transaction
from django.contrib.auth import get_user_model
from rest_framework import serializers as drf_serializers

from .models import Client
from core.tenants.models import OrganizationMember
from core.tenants.rbac_service import assign_role

User = get_user_model()


def activate_client(client: Client) -> Client:
    """
    Transition a Client to ACTIVE status.

    Sets activated_at only on the first activation (idempotent).
    Raises ValueError if the client is already active.
    """
    if client.status == Client.StatusChoices.ACTIVE:
        raise ValueError(f"Client {client.pk} is already active.")

    with transaction.atomic():
        client.status = Client.StatusChoices.ACTIVE
        if not client.activated_at:
            client.activated_at = timezone.now()
        client.save(update_fields=['status', 'activated_at', 'updated_at'])

    return client


def deactivate_client(client: Client) -> Client:
    """
    Transition a Client to INACTIVE status.
    """
    if client.status == Client.StatusChoices.INACTIVE:
        raise ValueError(f"Client {client.pk} is already inactive.")

    with transaction.atomic():
        client.status = Client.StatusChoices.INACTIVE
        client.save(update_fields=['status', 'updated_at'])

    return client


def assign_trainer(client: Client, trainer) -> Client:
    """
    Assign a StaffProfile as the client's trainer.
    Validates trainer belongs to the same tenant.
    """
    if trainer.tenant_id != client.tenant_id:
        raise ValueError("Trainer must belong to the same organization as the client.")

    with transaction.atomic():
        client.assigned_trainer = trainer
        client.save(update_fields=['assigned_trainer', 'updated_at'])

    return client


@transaction.atomic
def create_client(tenant, user_data: dict, client_data: dict) -> Client:
    """
    Full client-creation flow for a given tenant.

    Responsibilities (in order):
      1. Resolve or create the User by email.
      2. Ensure an OrganizationMember record exists.
      3. Assign the 'client' role via RBAC.
      4. Upsert the Client profile.

    Args:
        tenant:      Organization instance (from request.tenant).
        user_data:   Dict with at least 'email'; optionally 'first_name', 'last_name'.
        client_data: Validated serializer data for the Client model fields.

    Returns:
        The created/updated Client instance.

    Raises:
        drf_serializers.ValidationError: if email is missing.
        ValueError:                      if the 'client' role is not seeded for the tenant.
    """
    email = user_data.get('email', '').strip().lower()
    if not email:
        raise drf_serializers.ValidationError({'user': {'email': 'This field is required.'}})

    # ── 1. Resolve or create the User ──────────────────────────────────────
    user, created = User.objects.get_or_create(
        email=email,
        defaults={
            'username': email,
            'first_name': user_data.get('first_name', ''),
            'last_name': user_data.get('last_name', ''),
        },
    )

    if created:
        user.set_unusable_password()
        user.save(update_fields=['password'])
    else:
        # Update names if provided; never overwrite email (it's the lookup key).
        updates = {
            field: user_data[field]
            for field in ('first_name', 'last_name')
            if field in user_data
        }
        if updates:
            for field, value in updates.items():
                setattr(user, field, value)
            user.save(update_fields=list(updates.keys()))

    # ── 2. Ensure OrganizationMember record ────────────────────────────────
    OrganizationMember.objects.get_or_create(user=user, tenant=tenant)

    # ── 3. Assign the 'client' RBAC role ───────────────────────────────────
    assign_role(user, tenant, 'client')

    # ── 4. Upsert Client profile ────────────────────────────────────────────
    org_member = OrganizationMember.objects.get(user=user, tenant=tenant)
    client, _ = Client.objects.update_or_create(
        org_client=org_member,
        defaults={**client_data, 'tenant': tenant},
    )
    return client

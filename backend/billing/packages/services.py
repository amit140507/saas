from django.db import transaction
from django.db.models import Q
from rest_framework.exceptions import NotFound

from billing.subscriptions.models import Feature

from .models import PackageFeature, PackagePlan


def resolve_package_tenant(request):
    tenant = getattr(request, "tenant", None)
    if tenant is not None:
        return tenant

    membership = (
        request.user.org_memberships
        .filter(status="active")
        .select_related("tenant")
        .first()
    )
    if membership is None:
        raise NotFound("No active organization membership found.")

    return membership.tenant


@transaction.atomic
def sync_package_relations(*, package, tenant, features, plans):
    """
    Replace the editable package relations with the submitted source of truth.
    Features are catalog rows reused by tenant + code, while PackageFeature is
    only the package-level inclusion link.
    """
    package.package_features.all().delete()

    for feature_data in features:
        feature, created = Feature.objects.get_or_create(
            tenant=tenant,
            code=feature_data["code"],
            defaults={
                "name": feature_data["name"],
                "description": feature_data.get("description", ""),
            },
        )
        if not created:
            changed_fields = []
            if feature.name != feature_data["name"]:
                feature.name = feature_data["name"]
                changed_fields.append("name")
            description = feature_data.get("description", "")
            if feature.description != description:
                feature.description = description
                changed_fields.append("description")
            if changed_fields:
                feature.save(update_fields=changed_fields)

        PackageFeature.objects.create(
            tenant=tenant,
            package=package,
            feature=feature,
        )

    existing_plans = {
        plan.name: plan
        for plan in PackagePlan.objects.filter(tenant=tenant, package=package)
    }
    submitted_plan_names = set()

    for plan_data in plans:
        submitted_plan_names.add(plan_data["name"])
        plan = existing_plans.get(plan_data["name"])
        if plan is None:
            PackagePlan.objects.create(
                tenant=tenant,
                package=package,
                name=plan_data["name"],
                price=plan_data["price"],
                duration_in_days=plan_data.get("duration_in_days"),
                plan_delivery_days=plan_data.get("plan_delivery_days"),
                is_active=plan_data.get("is_active", True),
            )
            continue

        plan.price = plan_data["price"]
        plan.duration_in_days = plan_data.get("duration_in_days")
        plan.plan_delivery_days = plan_data.get("plan_delivery_days")
        plan.is_active = plan_data.get("is_active", True)
        plan.save(update_fields=["price", "duration_in_days", "plan_delivery_days", "is_active", "updated_at"])

    stale_plans = PackagePlan.objects.filter(
        tenant=tenant,
        package=package,
    ).exclude(name__in=submitted_plan_names)
    for plan in stale_plans:
        if _plan_has_billing_history(plan):
            if plan.is_active:
                plan.is_active = False
                plan.save(update_fields=["is_active", "updated_at"])
            continue

        plan.delete()

    return package


@transaction.atomic
def delete_or_archive_package(package):
    if any(_plan_has_billing_history(plan) for plan in package.plans.all()):
        package.is_active = False
        package.save(update_fields=["is_active", "updated_at"])
        package.plans.filter(is_active=True).update(is_active=False)
        return

    package.delete()


def _plan_has_billing_history(plan):
    from billing.subscriptions.models import Membership, MembershipChange

    return (
        Membership.objects.filter(plan=plan).exists()
        or MembershipChange.objects.filter(Q(from_plan=plan) | Q(to_plan=plan)).exists()
    )

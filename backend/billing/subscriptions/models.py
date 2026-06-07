import uuid

from django.db import models

from core.tenants.models import TenantAwareModel
from billing.packages.models import PackageFeature

# ---------------------------------------------------------------------------
# Feature - Reusable capability
# ---------------------------------------------------------------------------


class Feature(TenantAwareModel):
    """
    Reusable capability that can be included in packages or sold via add-ons.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100)
    code = models.CharField(max_length=50)
    description = models.TextField(blank=True)

    class Meta:
        verbose_name = 'Feature'
        verbose_name_plural = 'Features'
        constraints = [
            models.UniqueConstraint(fields=['tenant', 'code'], name='unique_feature_code_per_tenant')
        ]
        indexes = [
            models.Index(fields=['tenant', 'name']),
        ]

    def __str__(self):
        return self.name


# ---------------------------------------------------------------------------
# Membership - Actual assignment to a client
# ---------------------------------------------------------------------------


class Membership(TenantAwareModel):
    """
    An actual membership assigned to a Client.
    Tracks start/end, freeze periods, and renewal chain.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    class StatusChoices(models.TextChoices):
        ACTIVE = 'active', 'Active'
        EXPIRED = 'expired', 'Expired'
        FROZEN = 'frozen', 'Frozen'
        CANCELLED = 'cancelled', 'Cancelled'
        PENDING = 'pending', 'Pending Payment'

    client = models.ForeignKey(
        'clients.ClientProfile', on_delete=models.CASCADE, related_name='memberships'
    )
    plan = models.ForeignKey(
        'packages.PackagePlan', on_delete=models.PROTECT, related_name='memberships'
    )
    order = models.OneToOneField(
        'orders.Order', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='membership'
    )
    start_date = models.DateField()
    base_end_date = models.DateField()
    extended_end_date = models.DateField()
    status = models.CharField(
        max_length=20, choices=StatusChoices.choices, default=StatusChoices.ACTIVE
    )
    renewed_from = models.ForeignKey(
        'self', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='renewals'
    )
    notes = models.TextField(null=True, blank=True)

    class Meta:
        verbose_name = 'Membership'
        verbose_name_plural = 'Memberships'
        indexes = [
            models.Index(fields=['tenant', 'client', 'status']),
            models.Index(fields=['extended_end_date']),
        ]

    # def __str__(self):
    #     return f"{self.client} ({self.status})"


# ---------------------------------------------------------------------------
# MembershipFreeze - Tracks individual freezes
# ---------------------------------------------------------------------------


class MembershipFreeze(TenantAwareModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    membership = models.ForeignKey(
        Membership, on_delete=models.CASCADE, related_name='freezes'
    )
    start_date = models.DateField()
    end_date = models.DateField()
    days = models.PositiveIntegerField()

    class Meta:
        verbose_name = 'Membership Freeze'
        verbose_name_plural = 'Membership Freezes'
        indexes = [
            models.Index(fields=['tenant', 'membership']),
        ]

    def __str__(self):
        return f"Freeze for {self.membership} ({self.days} days)"


# ---------------------------------------------------------------------------
# MembershipSnapshot - Package data at the time of purchase
# ---------------------------------------------------------------------------


class MembershipSnapshot(TenantAwareModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    membership = models.OneToOneField(Membership, on_delete=models.CASCADE, related_name='snapshot')
    data = models.JSONField(help_text="Snapshot of the package details at the time of purchase")

    class Meta:
        verbose_name = 'Membership Snapshot'
        verbose_name_plural = 'Membership Snapshots'

    def __str__(self):
        return f"Snapshot for {self.membership}"


# ---------------------------------------------------------------------------
# MembershipChange - Tracks upgrades and downgrades
# ---------------------------------------------------------------------------


class MembershipChange(TenantAwareModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    membership = models.ForeignKey(Membership, on_delete=models.CASCADE, related_name='changes')
    from_plan = models.ForeignKey('packages.PackagePlan', on_delete=models.PROTECT, related_name='+')
    to_plan = models.ForeignKey('packages.PackagePlan', on_delete=models.PROTECT, related_name='+')
    price_difference = models.DecimalField(max_digits=10, decimal_places=2)

    class Meta:
        verbose_name = 'Membership Change'
        verbose_name_plural = 'Membership Changes'
        indexes = [
            models.Index(fields=['tenant', 'membership']),
        ]

    def __str__(self):
        return f"Change for {self.membership}: {self.from_plan.name} -> {self.to_plan.name}"


# ---------------------------------------------------------------------------
# Addon - Optional paid extras for a specific membership
# ---------------------------------------------------------------------------


class Addon(TenantAwareModel):
    """
    Optional paid extra that can unlock one or more reusable features for a
    specific membership without changing the package defaults.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    class BillingTypeChoices(models.TextChoices):
        ONE_TIME = 'one_time', 'One Time'
        RECURRING = 'recurring', 'Recurring'

    name = models.CharField(max_length=100)
    code = models.CharField(max_length=50)
    description = models.TextField(blank=True)
    price = models.DecimalField(max_digits=10, decimal_places=2)
    billing_type = models.CharField(
        max_length=20,
        choices=BillingTypeChoices.choices,
        default=BillingTypeChoices.ONE_TIME,
    )
    duration_days = models.PositiveIntegerField(null=True, blank=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        verbose_name = 'Addon'
        verbose_name_plural = 'Addons'
        indexes = [
            models.Index(fields=['tenant', 'is_active']),
            models.Index(fields=['tenant', 'name']),
        ]
        constraints = [
            models.UniqueConstraint(fields=['tenant', 'code'], name='unique_addon_code_per_tenant'),
        ]

    def __str__(self):
        return self.name


# ---------------------------------------------------------------------------
# AddonFeature - Features unlocked by an add-on
# ---------------------------------------------------------------------------


class AddonFeature(TenantAwareModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    addon = models.ForeignKey(Addon, on_delete=models.CASCADE, related_name='addon_features')
    feature = models.ForeignKey(Feature, on_delete=models.CASCADE, related_name='addon_features')

    class Meta:
        verbose_name = 'Addon Feature'
        verbose_name_plural = 'Addon Features'
        indexes = [
            models.Index(fields=['tenant', 'addon']),
            models.Index(fields=['tenant', 'feature']),
        ]
        constraints = [
            models.UniqueConstraint(fields=['addon', 'feature'], name='unique_addon_feature'),
        ]

    def __str__(self):
        return f"{self.addon.name} - {self.feature.name}"





# ---------------------------------------------------------------------------
# MembershipAddon - Purchased add-ons for a specific membership
# ---------------------------------------------------------------------------


class MembershipAddon(TenantAwareModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    class StatusChoices(models.TextChoices):
        ACTIVE = 'active', 'Active'
        EXPIRED = 'expired', 'Expired'
        CANCELLED = 'cancelled', 'Cancelled'

    membership = models.ForeignKey(Membership, on_delete=models.CASCADE, related_name='addons')
    addon = models.ForeignKey(Addon, on_delete=models.PROTECT, related_name='membership_addons')
    price = models.DecimalField(max_digits=10, decimal_places=2)
    start_date = models.DateField()
    end_date = models.DateField(null=True, blank=True)
    status = models.CharField(
        max_length=20,
        choices=StatusChoices.choices,
        default=StatusChoices.ACTIVE,
    )

    class Meta:
        verbose_name = 'Membership Addon'
        verbose_name_plural = 'Membership Addons'
        indexes = [
            models.Index(fields=['tenant', 'membership', 'status']),
            models.Index(fields=['tenant', 'addon']),
        ]

    def __str__(self):
        return f"{self.membership} - {self.addon.name} ({self.status})"

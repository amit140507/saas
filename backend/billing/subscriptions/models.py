import uuid
from django.db import models
from core.tenants.models import TenantAwareModel


# ---------------------------------------------------------------------------
# Feature — Individual features available in packages
# ---------------------------------------------------------------------------

class Feature(TenantAwareModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100)
    code = models.CharField(max_length=50, unique=True)
    description = models.TextField(blank=True)
    
    class Meta:
        verbose_name = 'Feature'
        verbose_name_plural = 'Features'
        indexes = [
            models.Index(fields=['tenant', 'name']),
        ]

    def __str__(self):
        return self.name


# ---------------------------------------------------------------------------
# MembershipPackage — Template/tier definition
# ---------------------------------------------------------------------------

class MembershipPackage(TenantAwareModel):
    """
    Template defining a membership tier (Gold, Platinum, Silver).
    This is the package definition, NOT the assignment.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    class TierChoices(models.TextChoices):
        SILVER = 'silver', 'Silver'
        GOLD = 'gold', 'Gold'
        PLATINUM = 'platinum', 'Platinum'
        CUSTOM = 'custom', 'Custom'

    name = models.CharField(max_length=100)          # e.g. "3-Month Gold"
    tier = models.CharField(max_length=20, choices=TierChoices.choices)
    description = models.TextField(null=True, blank=True)
    duration_days = models.PositiveIntegerField()    # 30, 90, 180, 365
    price = models.DecimalField(max_digits=10, decimal_places=2)
    max_freezes = models.PositiveIntegerField(default=0)   # freeze days allowed
    is_active = models.BooleanField(default=True)

    class Meta:
        verbose_name = 'Membership Package'
        verbose_name_plural = 'Membership Packages'
        indexes = [
            models.Index(fields=['tenant', 'tier', 'is_active']),
        ]

    def __str__(self):
        return f"{self.name} ({self.get_tier_display()})"


# ---------------------------------------------------------------------------
# PackageFeature — Link between Package and Feature
# ---------------------------------------------------------------------------

class PackageFeature(TenantAwareModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    package = models.ForeignKey(MembershipPackage, on_delete=models.CASCADE, related_name='package_features')
    feature = models.ForeignKey(Feature, on_delete=models.CASCADE, related_name='package_features')

    class Meta:
        verbose_name = 'Package Feature'
        verbose_name_plural = 'Package Features'
        constraints = [
            models.UniqueConstraint(fields=['package', 'feature'], name='unique_package_feature')
        ]

    def __str__(self):
        return f"{self.package.name} - {self.feature.name}"


# ---------------------------------------------------------------------------
# Membership — Actual assignment to a client
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
        'clients.Client', on_delete=models.CASCADE, related_name='memberships'
    )
    package = models.ForeignKey(
        MembershipPackage, on_delete=models.PROTECT, related_name='memberships'
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

    # Renewal chain
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

    def __str__(self):
        return f"{self.client} — {self.package.name} ({self.status})"


# ---------------------------------------------------------------------------
# MembershipFreeze — Tracks individual freezes
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
# MembershipSnapshot — Package data at the time of purchase
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
# MembershipChange — Tracks upgrades and downgrades
# ---------------------------------------------------------------------------

class MembershipChange(TenantAwareModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    membership = models.ForeignKey(Membership, on_delete=models.CASCADE, related_name='changes')
    from_package = models.ForeignKey(MembershipPackage, on_delete=models.PROTECT, related_name='+')
    to_package = models.ForeignKey(MembershipPackage, on_delete=models.PROTECT, related_name='+')
    price_difference = models.DecimalField(max_digits=10, decimal_places=2)

    class Meta:
        verbose_name = 'Membership Change'
        verbose_name_plural = 'Membership Changes'
        indexes = [
            models.Index(fields=['tenant', 'membership']),
        ]

    def __str__(self):
        return f"Change for {self.membership}: {self.from_package.name} -> {self.to_package.name}"

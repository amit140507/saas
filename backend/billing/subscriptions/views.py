import uuid
from django.db import models
from core.models import TenantAwareModel


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
    features = models.JSONField(default=list)        # ['Pool access', 'Sauna']
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Membership Package'
        verbose_name_plural = 'Membership Packages'
        indexes = [
            models.Index(fields=['tenant', 'tier', 'is_active']),
        ]

    def __str__(self):
        return f"{self.name} ({self.get_tier_display()})"


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
    end_date = models.DateField()
    status = models.CharField(
        max_length=20, choices=StatusChoices.choices, default=StatusChoices.ACTIVE
    )

    # Freeze tracking
    freeze_start = models.DateField(null=True, blank=True)
    freeze_end = models.DateField(null=True, blank=True)
    freeze_days_used = models.PositiveIntegerField(default=0)

    # Renewal chain
    renewed_from = models.ForeignKey(
        'self', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='renewals'
    )
    notes = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Membership'
        verbose_name_plural = 'Memberships'
        indexes = [
            models.Index(fields=['tenant', 'client', 'status']),
            models.Index(fields=['end_date']),
        ]

    def __str__(self):
        return f"{self.client} — {self.package.name} ({self.status})"



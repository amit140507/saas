import uuid
from django.db import models
from core.tenants.models import TenantAwareModel


# ---------------------------------------------------------------------------
# Package
# ---------------------------------------------------------------------------

class Package(TenantAwareModel):
    """
    Shared package/tier definition (e.g. Silver, Gold, Platinum).
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    class PackageTypeChoices(models.TextChoices):
        GYM = 'gym', 'Gym'
        ONLINE = 'online', 'Online'
        PT = 'pt', 'Personal Training'
        OTHER = 'other', 'Other'

    name = models.CharField(max_length=100)
    description = models.TextField(null=True, blank=True)
    package_type = models.CharField(
        max_length=20,
        choices=PackageTypeChoices.choices,
        default=PackageTypeChoices.GYM,
    )
    max_freezes = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Package'
        verbose_name_plural = 'Packages'
        indexes = [
            models.Index(fields=['tenant', 'is_active']),
        ]

    def __str__(self):
        return self.name


# ---------------------------------------------------------------------------
# PackagePlan (Variations of a Package)
# ---------------------------------------------------------------------------

class PackagePlan(TenantAwareModel):
    """
    Purchasable pricing and duration option for a package.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    package = models.ForeignKey(Package, on_delete=models.CASCADE, related_name='plans')
    name = models.CharField(max_length=100, help_text="e.g. '3 Months Plan'")
    price = models.DecimalField(max_digits=10, decimal_places=2, default=0.0)
    duration_in_days = models.IntegerField(
        null=True, blank=True, help_text="Duration of access for one-time or fixed-term passes"
    )
    plan_delivery_days = models.PositiveIntegerField(
        null=True,
        blank=True,
        help_text="Days after payment by which a personalized plan should be delivered."
    )
    is_active = models.BooleanField(default=True)

    class Meta:
        verbose_name = 'Package Plan'
        verbose_name_plural = 'Package Plans'
        indexes = [
            models.Index(fields=['tenant', 'package', 'is_active']),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=['tenant', 'package', 'name'],
                name='unique_package_plan_per_package'
            )
        ]

    def __str__(self):
        return f"{self.package.name} - {self.name}"


class PackageFeature(TenantAwareModel):
    """
    Explicit join table for features included by default in a package.
    Every plan under the same package shares these features.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    package = models.ForeignKey(Package, on_delete=models.CASCADE, related_name='package_features')
    feature = models.ForeignKey(
        'subscriptions.Feature',
        on_delete=models.CASCADE,
        related_name='package_features',
    )

    class Meta:
        verbose_name = 'Package Feature'
        verbose_name_plural = 'Package Features'
        db_table = 'subscriptions_packagefeature'
        indexes = [
            models.Index(fields=['tenant', 'package']),
            models.Index(fields=['tenant', 'feature']),
        ]
        constraints = [
            models.UniqueConstraint(fields=['package', 'feature'], name='unique_package_feature')
        ]

    def __str__(self):
        return f"{self.package.name} - {self.feature.name}"


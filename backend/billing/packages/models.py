import uuid
from django.db import models
from django.conf import settings
from core.models import TenantAwareModel


# ---------------------------------------------------------------------------
# Product (Legacy / Alternative Billing Structure)
# ---------------------------------------------------------------------------

class Package(TenantAwareModel):
    """
    Base product for billing (e.g. 'Gym Membership', 'Personal Training').
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100)
    description = models.TextField(null=True, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Product'
        verbose_name_plural = 'Products'
        indexes = [
            models.Index(fields=['tenant', 'is_active']),
        ]

    def __str__(self):
        return self.name


# ---------------------------------------------------------------------------
# ProductPlan (Variations of a Product)
# ---------------------------------------------------------------------------

class PackagePlan(TenantAwareModel):
    """
    Specific pricing and duration for a Product (e.g. '3 Months Plan').
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    class BillingCycleChoices(models.TextChoices):
        MONTHLY = 'monthly', 'Monthly'
        QUARTERLY = 'quarterly', 'Quarterly'
        HALF_YEARLY = 'half-yearly', 'Half-yearly'
        YEARLY = 'yearly', 'Yearly'
        ONE_TIME = 'one-time', 'One-time'

    package = models.ForeignKey(Package, on_delete=models.CASCADE, related_name='package')
    name = models.CharField(max_length=100, help_text="e.g. '3 Months Plan'")
    price = models.DecimalField(max_digits=10, decimal_places=2, default=0.0)
    billing_cycle = models.CharField(
        max_length=20, choices=BillingCycleChoices.choices, default=BillingCycleChoices.MONTHLY
    )
    duration_in_days = models.IntegerField(
        null=True, blank=True, help_text="Duration of access for one-time or fixed-term passes"
    )
    is_active = models.BooleanField(default=True)

    class Meta:
        verbose_name = 'Package Plan'
        verbose_name_plural = 'Package Plans'
        indexes = [
            models.Index(fields=['tenant', 'package', 'is_active']),
        ]

    def __str__(self):
        return f"{self.product.name} - {self.name}"

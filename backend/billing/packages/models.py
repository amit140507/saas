import uuid
from django.db import models
from django.conf import settings
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


# ---------------------------------------------------------------------------
# Coupon — Discount / promo code
# ---------------------------------------------------------------------------

class Coupon(TenantAwareModel):
    """Discount coupon / promo code."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    class DiscountType(models.TextChoices):
        PERCENTAGE = 'percent', 'Percentage'
        FIXED = 'fixed', 'Fixed Amount'

    code = models.CharField(max_length=30)
    description = models.CharField(max_length=255, null=True, blank=True)
    discount_type = models.CharField(max_length=10, choices=DiscountType.choices)
    discount_value = models.DecimalField(max_digits=8, decimal_places=2)
    min_order_value = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    max_discount_cap = models.DecimalField(
        max_digits=10, decimal_places=2, null=True, blank=True
    )  # cap for % discounts
    valid_from = models.DateField(null=True, blank=True)
    valid_to = models.DateField(null=True, blank=True)
    max_uses = models.PositiveIntegerField(null=True, blank=True)   # None = unlimited
    times_used = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(default=True)

    class Meta:
        unique_together = ('code', 'tenant')
        verbose_name = 'Coupon'
        verbose_name_plural = 'Coupons'

    def __str__(self):
        return f"{self.code} ({self.get_discount_type_display()}: {self.discount_value})"


# ---------------------------------------------------------------------------
# Payment — Stripe / Razorpay / manual payment record
# ---------------------------------------------------------------------------

class Payment(TenantAwareModel):
    """
    Payment gateway charge or subscription record.
    Linked to an Order, not directly to Membership.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    class StatusChoices(models.TextChoices):
        PENDING = 'pending', 'Pending'
        SUCCESS = 'success', 'Success'
        FAILED = 'failed', 'Failed'
        REFUNDED = 'refunded', 'Refunded'
        PARTIAL_REFUND = 'partial_refund', 'Partial Refund'

    class GatewayChoices(models.TextChoices):
        STRIPE = 'stripe', 'Stripe'
        RAZORPAY = 'razorpay', 'Razorpay'
        CASH = 'cash', 'Cash'
        UPI = 'upi', 'UPI'
        BANK_TRANSFER = 'bank_transfer', 'Bank Transfer'
        OTHER = 'other', 'Other'

    order = models.ForeignKey(
        'orders.Order', on_delete=models.PROTECT, related_name='payments'
    )
    client = models.ForeignKey(
        'clients.Client', on_delete=models.PROTECT, related_name='payments'
    )
    gateway = models.CharField(max_length=20, choices=GatewayChoices.choices)
    gateway_payment_id = models.CharField(max_length=255, null=True, blank=True)
    gateway_order_id = models.CharField(max_length=255, null=True, blank=True)
    gateway_subscription_id = models.CharField(max_length=255, null=True, blank=True)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    currency = models.CharField(max_length=3, default='INR')
    status = models.CharField(
        max_length=20, choices=StatusChoices.choices, default=StatusChoices.PENDING
    )
    paid_at = models.DateTimeField(null=True, blank=True)
    refunded_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    receipt_url = models.URLField(null=True, blank=True)
    gateway_response = models.JSONField(null=True, blank=True)  # raw gateway payload
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Payment'
        verbose_name_plural = 'Payments'
        indexes = [
            models.Index(fields=['tenant', 'client', 'status']),
            models.Index(fields=['gateway_payment_id']),
        ]

    def __str__(self):
        return f"Payment {self.id} — {self.amount} {self.currency} ({self.status})"


# ---------------------------------------------------------------------------
# Product (Legacy / Alternative Billing Structure)
# ---------------------------------------------------------------------------

class Product(TenantAwareModel):
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

class ProductPlan(TenantAwareModel):
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

    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='plans')
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
        verbose_name = 'Product Plan'
        verbose_name_plural = 'Product Plans'
        indexes = [
            models.Index(fields=['tenant', 'product', 'is_active']),
        ]

    def __str__(self):
        return f"{self.product.name} - {self.name}"

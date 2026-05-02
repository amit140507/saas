import uuid
from decimal import Decimal
from django.db import models
from django.conf import settings
from django.utils import timezone
from core.models import TenantAwareModel

# ---------------------------------------------------------------------------
# Coupon — Discount / promo code
# ---------------------------------------------------------------------------

class Coupon(TenantAwareModel):
    """Discount coupon / promo code."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    class DiscountType(models.TextChoices):
        PERCENTAGE = 'percent', 'Percentage'
        FIXED = 'fixed', 'Fixed Amount'
        FIXED_PRICE = 'fixed_price', 'Fixed Price Override'
        FREE_SHIPPING = 'free_shipping', 'Free Shipping'

    class CouponCategory(models.TextChoices):
        GENERAL = 'general', 'General'
        SUBSCRIPTION = 'subscription', 'Subscription'
        REFERRAL = 'referral', 'Referral'
        AFFILIATE = 'affiliate', 'Affiliate'
        FLASH = 'flash', 'Flash Sale'
        EARLY_BIRD = 'early_bird', 'Early Bird'
        UPGRADE = 'upgrade', 'Upgrade'

    class UserSegment(models.TextChoices):
        ALL = 'all', 'All Users'
        FIRST_TIME = 'first_time', 'First-time Users'
        RETURNING = 'returning', 'Returning Customers'
        VIP = 'vip', 'VIP / Premium'
        REFERRAL = 'referral', 'Referral Recipient'

    code = models.CharField(max_length=30)
    description = models.CharField(max_length=255, null=True, blank=True)
    
    # Type & Value
    discount_type = models.CharField(max_length=20, choices=DiscountType.choices)
    discount_value = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    fixed_price_amount = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True, help_text="Used for FIXED_PRICE overrides")
    max_discount_cap = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True, help_text="Cap for percentage discounts")
    
    # Classification & Targeting
    category = models.CharField(max_length=20, choices=CouponCategory.choices, default=CouponCategory.GENERAL)
    user_segment = models.CharField(max_length=20, choices=UserSegment.choices, default=UserSegment.ALL)
    is_auto_applied = models.BooleanField(default=False)
    is_public = models.BooleanField(default=True)
    
    # Referral specific
    referrer_reward_value = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True, help_text="Reward given to referrer upon use")
    
    # Subscription specific (Commented out for future use)
    # recurring_months = models.PositiveIntegerField(null=True, blank=True, help_text="Number of months discount applies to subscriptions")


    # Dates
    valid_from = models.DateTimeField(null=True, blank=True)
    valid_to = models.DateTimeField(null=True, blank=True)
    
    # Limits
    max_uses = models.PositiveIntegerField(null=True, blank=True)   # None = unlimited
    times_used = models.PositiveIntegerField(default=0)
    max_uses_per_user = models.PositiveIntegerField(null=True, blank=True)
    first_time_users_only = models.BooleanField(default=False)  # Legacy, transitioning to user_segment
    
    is_active = models.BooleanField(default=True)

    class Meta:
        unique_together = ('code', 'tenant')
        verbose_name = 'Coupon'
        verbose_name_plural = 'Coupons'
        indexes = [
            models.Index(fields=['tenant', 'code']),
            models.Index(fields=['valid_from', 'valid_to']),
            models.Index(fields=['is_active']),
            models.Index(fields=['is_auto_applied']),
        ]

    def __str__(self):
        return f"{self.code} ({self.get_discount_type_display()})"


class CouponRule(models.Model):
    """Conditions separated from core Coupon."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    coupon = models.OneToOneField(Coupon, on_delete=models.CASCADE, related_name='rule')

    # Cart conditions
    min_order_value = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    buy_x_quantity = models.PositiveIntegerField(null=True, blank=True)
    get_y_quantity = models.PositiveIntegerField(null=True, blank=True)

    # Scope
    applicable_packages = models.ManyToManyField('packages.Package', blank=True, related_name='applicable_coupons')
    applicable_plans = models.ManyToManyField('packages.PackagePlan', blank=True, related_name='applicable_coupons')

    # Subscription specifics
    trial_extension_days = models.PositiveIntegerField(null=True, blank=True)
    applies_to_upgrade = models.BooleanField(default=False)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Coupon Rule'
        verbose_name_plural = 'Coupon Rules'

    def __str__(self):
        return f"Rules for {self.coupon.code}"


class CouponUsage(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    coupon = models.ForeignKey(Coupon, on_delete=models.CASCADE, related_name='usages')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    order = models.ForeignKey('orders.Order', on_delete=models.SET_NULL, null=True, blank=True)
    
    discount_applied = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    used_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [
            models.Index(fields=['coupon', 'user']),
        ]
        
    def __str__(self):
        return f"{self.coupon.code} used by {self.user.email}"

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
    max_uses_per_user = models.PositiveIntegerField(null=True, blank=True)
    first_time_users_only = models.BooleanField(default=False)
    applicable_packages = models.ManyToManyField(
        'package', blank=True
    )
    class Meta:
        unique_together = ('code', 'tenant')
        verbose_name = 'Coupon'
        verbose_name_plural = 'Coupons'
        indexes = [
            models.Index(fields=['tenant', 'code']),
            models.Index(fields=['valid_from', 'valid_to']),
            models.Index(fields=['is_active']),
        ]
    
    def is_valid(self, user=None, order_amount=None):
        if not self.is_active:
            return False

        today = timezone.now().date()

        if self.valid_from and today < self.valid_from:
            return False

        if self.valid_to and today > self.valid_to:
            return False

        if self.max_uses and self.times_used >= self.max_uses:
            return False

        if order_amount and order_amount < self.min_order_value:
            return False

        if user and self.max_uses_per_user:
            user_usage_count = CouponUsage.objects.filter(
                coupon=self, user=user
            ).count()

            if user_usage_count >= self.max_uses_per_user:
                return False

        return True

    def __str__(self):
        return f"{self.code} ({self.get_discount_type_display()}: {self.discount_value})"


class CouponUsage(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    coupon = models.ForeignKey(Coupon, on_delete=models.CASCADE, related_name='usages')
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    order = models.ForeignKey('Order', on_delete=models.SET_NULL, null=True, blank=True)

    used_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        # unique_together = ('coupon', 'user')  # if only one use per user

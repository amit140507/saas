from django.db import models
from django.conf import settings
from django.db.models.signals import post_save
from django.dispatch import receiver
from core.models import TenantAwareModel, Tenant

class Product(TenantAwareModel):
    name = models.CharField(max_length=100)
    description = models.TextField(null=True, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"{self.name} ({self.tenant.name})"

class ProductPlan(TenantAwareModel):
    class BillingCycle(models.TextChoices):
        MONTHLY = 'monthly', 'Monthly'
        QUARTERLY = 'quarterly', 'Quarterly'
        HALF_YEARLY = 'half-yearly', 'Half-yearly'
        YEARLY = 'yearly', 'Yearly'
        ONE_TIME = 'one-time', 'One-time'

    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='plans')
    name = models.CharField(max_length=100, help_text="e.g. '3 Months Plan'")
    price = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    billing_cycle = models.CharField(max_length=20, choices=BillingCycle.choices, default=BillingCycle.MONTHLY)
    duration_in_days = models.IntegerField(null=True, blank=True, help_text="Duration of access for one-time or fixed-term passes")
    is_active = models.BooleanField(default=True)
    
    def __str__(self):
        return f"{self.product.name} - {self.name} (${self.price}/{self.billing_cycle})"

class Subscription(TenantAwareModel):
    class Status(models.TextChoices):
        ACTIVE = 'active', 'Active'
        CANCELLED = 'cancelled', 'Cancelled'
        PAST_DUE = 'past_due', 'Past Due'
        EXPIRED = 'expired', 'Expired'

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='subscriptions')
    product = models.ForeignKey(ProductPlan, on_delete=models.RESTRICT, related_name='subscriptions')
    start_date = models.DateTimeField(auto_now_add=True)
    end_date = models.DateTimeField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.ACTIVE)

    def __str__(self):
        return f"{self.user.username} -> {self.product.name} ({self.status})"

class Coupon(TenantAwareModel):
    class DiscountType(models.TextChoices):
        PERCENTAGE = 'percentage', 'Percentage'
        FIXED_AMOUNT = 'fixed_amount', 'Fixed Amount'
        BOGO = 'bogo', 'Buy One Get One'
        
    code = models.CharField(max_length=50)
    discount_type = models.CharField(max_length=20, choices=DiscountType.choices, default=DiscountType.PERCENTAGE)
    discount_value = models.DecimalField(max_digits=10, decimal_places=2, default=0.00, help_text="Percentage (e.g. 25.0) or flat amount (e.g. 10.0)")
    valid_from = models.DateTimeField(null=True, blank=True)
    valid_until = models.DateTimeField(null=True, blank=True)
    max_uses = models.IntegerField(null=True, blank=True, help_text="Leave blank for unlimited uses")
    uses_count = models.IntegerField(default=0)
    is_active = models.BooleanField(default=True)
    applicable_products = models.ManyToManyField(Product, blank=True, related_name='applicable_coupons')

    def __str__(self):
        return f"{self.code} ({self.discount_type}: {self.discount_value})"

@receiver(post_save, sender=Tenant)
def create_default_products(sender, instance, created, **kwargs):
    if created:
        plans_data = [
            ('Transformation', [
                ('3 Months Plan', 149.99, ProductPlan.BillingCycle.QUARTERLY),
                ('6 Months Plan', 249.99, ProductPlan.BillingCycle.HALF_YEARLY),
                ('12 Months Plan', 399.99, ProductPlan.BillingCycle.YEARLY),
            ]),
            ('Excellence', [
                ('3 Months Plan', 199.99, ProductPlan.BillingCycle.QUARTERLY),
                ('6 Months Plan', 349.99, ProductPlan.BillingCycle.HALF_YEARLY),
                ('12 Months Plan', 599.99, ProductPlan.BillingCycle.YEARLY),
            ]),
            ('Lifestyle', [
                ('3 Months Plan', 249.99, ProductPlan.BillingCycle.QUARTERLY),
                ('6 Months Plan', 449.99, ProductPlan.BillingCycle.HALF_YEARLY),
                ('12 Months Plan', 799.99, ProductPlan.BillingCycle.YEARLY),
            ]),
        ]
        
        for product_name, tiers in plans_data:
            product = Product.objects.create(tenant=instance, name=product_name)
            for plan_name, price, cycle in tiers:
                ProductPlan.objects.create(
                    tenant=instance,
                    product=product,
                    name=plan_name,
                    price=price,
                    billing_cycle=cycle
                )

from django.db import models
from django.conf import settings
from django.db.models.signals import post_save
from django.dispatch import receiver
from core.models import TenantAwareModel, Tenant

class Product(TenantAwareModel):
    class BillingCycle(models.TextChoices):
        MONTHLY = 'monthly', 'Monthly'
        QUARTERLY = 'quarterly', 'Quarterly'
        HALF_YEARLY = 'half-yearly', 'Half-yearly'
        YEARLY = 'yearly', 'Yearly'
        ONE_TIME = 'one-time', 'One-time'

    name = models.CharField(max_length=100)
    price = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    billing_cycle = models.CharField(max_length=20, choices=BillingCycle.choices, default=BillingCycle.MONTHLY)
    duration_in_days = models.IntegerField(null=True, blank=True, help_text="Duration of access for one-time or fixed-term passes")
    is_active = models.BooleanField(default=True)
    
    def __str__(self):
        return f"{self.name} - ${self.price}/{self.billing_cycle} ({self.tenant.name})"

class Subscription(TenantAwareModel):
    class Status(models.TextChoices):
        ACTIVE = 'active', 'Active'
        CANCELLED = 'cancelled', 'Cancelled'
        PAST_DUE = 'past_due', 'Past Due'
        EXPIRED = 'expired', 'Expired'

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='subscriptions')
    product = models.ForeignKey(Product, on_delete=models.RESTRICT, related_name='subscriptions')
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
        Product.objects.bulk_create([
            Product(tenant=instance, name='Level 1', price=49.99, billing_cycle='monthly'),
            Product(tenant=instance, name='Level 2', price=99.99, billing_cycle='monthly'),
            Product(tenant=instance, name='Level 3', price=149.99, billing_cycle='monthly'),
        ])

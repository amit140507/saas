import uuid
from django.db import models
from django.conf import settings
from core.tenants.models import TenantAwareModel
from billing.packages.models import PackagePlan
from core.accounts.helpers import generate_unique_public_id


class Order(TenantAwareModel):

    """Represents a purchase — membership, package, product, etc."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    # user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='orders')
    # product = models.ForeignKey(PackagePlan, on_delete=models.RESTRICT, null=True, blank=True)

    class StatusChoices(models.TextChoices):
        PENDING = 'pending', 'Pending'
        CONFIRMED = 'confirmed', 'Confirmed'
        CANCELLED = 'cancelled', 'Cancelled'
        REFUNDED = 'refunded', 'Refunded'

    order_number = models.CharField(
        max_length=20, unique=True)   # e.g. ORD-12345678
    client = models.ForeignKey(
        'clients.Client', on_delete=models.PROTECT, related_name='orders'
    )

    status = models.CharField(
        max_length=20, choices=StatusChoices.choices, default=StatusChoices.PENDING
    )

    # Payment details
    payment_link_token = models.UUIDField(
        null=True, blank=True, unique=True,
        help_text='Token for payment link checkout'
    )
    payment_method = models.CharField(
        max_length=20,
        choices=[('card', 'Pay by Card'), ('payment_link', 'Payment Link')],
        default='card'
    )

    # Pricing
    subtotal = models.DecimalField(max_digits=10, decimal_places=2)
    discount_amount = models.DecimalField(
        max_digits=10, decimal_places=2, default=0)
    tax_amount = models.DecimalField(
        max_digits=10, decimal_places=2, default=0)
    total_amount = models.DecimalField(max_digits=10, decimal_places=2)

    coupon = models.ForeignKey(
        'coupons.Coupon', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='orders'
    )
    notes = models.TextField(null=True, blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='orders_created'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Order'
        verbose_name_plural = 'Orders'
        indexes = [
            models.Index(fields=['tenant', 'status']),
            models.Index(fields=['order_number']),
            models.Index(fields=['payment_link_token']),
        ]

    @property
    def total(self):
        """Alias for total_amount to ensure compatibility with payment gateway logic."""
        return self.total_amount

    def __str__(self):
        return f"Order {self.order_number} ({self.status})"

    def save(self, *args, **kwargs):
        if not self.order_number:
            suffix = generate_unique_public_id(
                model=self.__class__, field_name='order_number', length=8)
            self.order_number = f"ORD-{suffix}"
        super().save(*args, **kwargs)


class OrderItem(models.Model):
    """Line items within an Order."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    order = models.ForeignKey(
        Order, on_delete=models.CASCADE, related_name='items')
    # product_id = models.UUIDField(null=True, blank=True)
    product = models.ForeignKey(
        PackagePlan, on_delete=models.RESTRICT, null=True, blank=True)
    # product_type = models.CharField(max_length=50)
    quantity = models.PositiveIntegerField(default=1)
    unit_price = models.DecimalField(max_digits=10, decimal_places=2)
    total_price = models.DecimalField(max_digits=10, decimal_places=2)

    def __str__(self):
        return f"{self.product.name} x{self.quantity}"

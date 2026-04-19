import uuid
from django.db import models
from django.conf import settings
from core.models import TenantAwareModel
from packages.models import ProductPlan

class Order(TenantAwareModel):
    """Represents a purchase — membership, package, product, etc."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    # user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='orders')
    product = models.ForeignKey(ProductPlan, on_delete=models.RESTRICT)
    class OrderType(models.TextChoices):
        MEMBERSHIP = 'membership', 'Membership'
        PLAN = 'plan', 'Plan Package'
        SUPPLEMENT = 'supplement', 'Supplement'
        SESSION = 'session', 'PT Session'
        OTHER = 'other', 'Other'

    class StatusChoices(models.TextChoices):
        PENDING = 'pending', 'Pending'
        CONFIRMED = 'confirmed', 'Confirmed'
        CANCELLED = 'cancelled', 'Cancelled'
        REFUNDED = 'refunded', 'Refunded'

    order_number = models.CharField(max_length=20, unique=True, null=True, blank=True)   # e.g. ORD-00123
    client = models.ForeignKey(
        'clients.Client', on_delete=models.PROTECT, related_name='orders'
    )
    order_type = models.CharField(max_length=20, choices=OrderType.choices, null=True, blank=True)
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
    discount_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    tax_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    total_amount = models.DecimalField(max_digits=10, decimal_places=2)

    coupon = models.ForeignKey(
        'packages.Coupon', on_delete=models.SET_NULL, null=True, blank=True,
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
            # Auto-generate: ORD-XXXX (UUID-based suffix, unique enough)
            import random, string
            suffix = ''.join(random.choices(string.digits, k=5))
            self.order_number = f"ORD-{suffix}"
        super().save(*args, **kwargs)


class OrderItem(models.Model):
    """Line items within an Order."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='items')
    description = models.CharField(max_length=255)
    quantity = models.PositiveIntegerField(default=1)
    unit_price = models.DecimalField(max_digits=10, decimal_places=2)
    total_price = models.DecimalField(max_digits=10, decimal_places=2)

    def __str__(self):
        return f"{self.description} x{self.quantity}"


class Invoice(TenantAwareModel):
    """Invoice generated for an order."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    class StatusChoices(models.TextChoices):
        DRAFT = 'draft', 'Draft'
        ISSUED = 'issued', 'Issued'
        PAID = 'paid', 'Paid'
        VOID = 'void', 'Void'

    order = models.OneToOneField(Order, on_delete=models.CASCADE, related_name='invoice')
    invoice_number = models.CharField(max_length=50, unique=True)
    status = models.CharField(
        max_length=20, choices=StatusChoices.choices, default=StatusChoices.DRAFT
    )
    generated_at = models.DateTimeField(null=True, blank=True)
    pdf_url = models.URLField(max_length=500, null=True, blank=True)
    storage_key = models.CharField(max_length=255, null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Invoice'
        verbose_name_plural = 'Invoices'
        indexes = [
            models.Index(fields=['tenant', 'status']),
            models.Index(fields=['invoice_number']),
        ]

    def __str__(self):
        return f"Invoice {self.invoice_number}"

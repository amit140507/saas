import uuid
from django.db import models
from django.conf import settings
from core.models import TenantAwareModel
from billing.models import Product, ProductPlan, Coupon

class Order(TenantAwareModel):
    class Status(models.TextChoices):
        PENDING = 'pending', 'Pending'
        PAID = 'paid', 'Paid'
        FAILED = 'failed', 'Failed'
        REFUNDED = 'refunded', 'Refunded'
        CANCELLED = 'cancelled', 'Cancelled'

    class PaymentMethod(models.TextChoices):
        CARD = 'card', 'Pay by Card'
        PAYMENT_LINK = 'payment_link', 'Payment Link'

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='orders')
    product = models.ForeignKey(ProductPlan, on_delete=models.RESTRICT)
    coupon = models.ForeignKey(Coupon, on_delete=models.SET_NULL, null=True, blank=True)
    
    subtotal = models.DecimalField(max_digits=10, decimal_places=2, help_text="Base price before discount")
    discount = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    total = models.DecimalField(max_digits=10, decimal_places=2)
    
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    payment_method = models.CharField(max_length=20, choices=PaymentMethod.choices, default=PaymentMethod.CARD)
    payment_link_token = models.UUIDField(null=True, blank=True, unique=True, help_text="Token for payment link checkout")
    notes = models.TextField(blank=True, default='', help_text="Admin notes for this order")
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Order #{self.id} - {self.user.username} ({self.status})"

    def generate_payment_link_token(self):
        """Generate a unique token for payment link checkout."""
        self.payment_link_token = uuid.uuid4()
        self.save(update_fields=['payment_link_token'])
        return self.payment_link_token


class Invoice(TenantAwareModel):
    """PDF invoice for a paid order; storage metadata lives here, not on Order."""

    class Status(models.TextChoices):
        PENDING = 'pending', 'Pending'
        READY = 'ready', 'Ready'
        FAILED = 'failed', 'Failed'

    order = models.OneToOneField(
        Order,
        on_delete=models.CASCADE,
        related_name='invoice',
    )
    pdf_url = models.URLField(max_length=1024, blank=True, default='')
    storage_key = models.CharField(max_length=512, blank=True, default='')
    invoice_number = models.CharField(max_length=64, blank=True, default='')
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    error_message = models.TextField(blank=True, default='')
    generated_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [
            models.Index(fields=['tenant', 'status']),
        ]

    def __str__(self):
        return f"Invoice {self.invoice_number or self.pk} (order {self.order_id})"

    def save(self, *args, **kwargs):
        if self.order_id:
            self.tenant_id = Order.objects.filter(pk=self.order_id).values_list('tenant_id', flat=True).first()
        super().save(*args, **kwargs)

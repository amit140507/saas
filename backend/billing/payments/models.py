from django.db import models
from core.models import TenantAwareModel
from orders.models import Order

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



class PaymentGatewayConfig(TenantAwareModel):
    PROVIDER_CHOICES = (
        ('razorpay', 'Razorpay'),
        ('billdesk', 'BillDesk'),
        ('stripe', 'Stripe'),
        ('dummy', 'Dummy Gateway'),
    )
    provider_name = models.CharField(max_length=50, choices=PROVIDER_CHOICES, default='razorpay')
    api_key = models.CharField(max_length=255, blank=True)
    api_secret = models.CharField(max_length=255, blank=True)
    is_active = models.BooleanField(default=True)
    
    def __str__(self):
        return f"{self.tenant.name} -> {self.provider_name}"

class Transaction(TenantAwareModel):
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='transactions')
    gateway_transaction_id = models.CharField(max_length=255, blank=True, help_text="e.g. razorpay order_id")
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    status = models.CharField(max_length=50, default='pending')
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"TXN {self.gateway_transaction_id} - {self.status}"

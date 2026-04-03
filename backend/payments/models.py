from django.db import models
from core.models import TenantAwareModel
from orders.models import Order

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

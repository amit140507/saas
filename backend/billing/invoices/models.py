import uuid
from django.db import models
from core.tenants.models import TenantAwareModel
from billing.orders.models import Order

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
    
    class Meta:
        verbose_name = 'Invoice'
        verbose_name_plural = 'Invoices'
        indexes = [
            models.Index(fields=['tenant', 'status']),
            models.Index(fields=['invoice_number']),
        ]

    def save(self, *args, **kwargs):
        if not self.invoice_number:
            from core.accounts.helpers import generate_unique_public_id
            suffix = generate_unique_public_id(model=self.__class__, field_name='invoice_number', length=8)
            self.invoice_number = f"INV-{suffix}"
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.invoice_number} ({self.get_status_display()})"

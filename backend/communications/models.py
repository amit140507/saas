from django.db import models
from django.conf import settings
from core.models import TenantAwareModel

class EmailTemplate(TenantAwareModel):
    name = models.CharField(max_length=100, help_text="e.g. 'Order Placed', 'Invoice'")
    subject = models.CharField(max_length=255)
    html_body = models.TextField()
    text_body = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return f"{self.name} ({self.tenant.name})"

class EmailCampaign(TenantAwareModel):
    class Status(models.TextChoices):
        DRAFT = 'draft', 'Draft'
        SCHEDULED = 'scheduled', 'Scheduled'
        SENT = 'sent', 'Sent'
        
    campaign_name = models.CharField(max_length=255)
    subject = models.CharField(max_length=255)
    html_body = models.TextField()
    send_date = models.DateTimeField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.DRAFT)

    def __str__(self):
        return f"{self.campaign_name} [{self.status}]"

class EmailLog(TenantAwareModel):
    class Status(models.TextChoices):
        SUCCESS = 'success', 'Success'
        FAILED = 'failed', 'Failed'
        
    recipient = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True)
    recipient_email = models.EmailField()
    subject = models.CharField(max_length=255)
    sent_at = models.DateTimeField(auto_now_add=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.SUCCESS)
    error_message = models.TextField(blank=True)

    def __str__(self):
        return f"To: {self.recipient_email} - {self.status}"

class WhatsAppTemplate(TenantAwareModel):
    name = models.CharField(max_length=100, help_text="Template name from Meta dashboard")
    category = models.CharField(max_length=50, blank=True)
    language = models.CharField(max_length=10, default='en_US')
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return f"{self.name} ({self.tenant.name})"

class WhatsAppLog(TenantAwareModel):
    class Status(models.TextChoices):
        SUCCESS = 'success', 'Success'
        FAILED = 'failed', 'Failed'
        
    recipient = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True)
    recipient_phone = models.CharField(max_length=20)
    template = models.ForeignKey(WhatsAppTemplate, on_delete=models.SET_NULL, null=True, blank=True)
    message_id = models.CharField(max_length=255, blank=True)
    sent_at = models.DateTimeField(auto_now_add=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.SUCCESS)
    error_message = models.TextField(blank=True)

    def __str__(self):
        return f"To: {self.recipient_phone} - {self.status}"

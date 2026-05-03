import uuid
from django.db import models
from django.conf import settings
from core.tenants.models import TenantAwareModel


class MessageTemplate(TenantAwareModel):
    """
    Reusable message template for email or WhatsApp.
    Supports variable placeholders like {{client_name}}.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    class ChannelChoices(models.TextChoices):
        EMAIL = 'email', 'Email'
        WHATSAPP = 'whatsapp', 'WhatsApp'
        SMS = 'sms', 'SMS'
        PUSH = 'push', 'Push Notification'

    class CategoryChoices(models.TextChoices):
        WELCOME = 'welcome', 'Welcome'
        RENEWAL_REMINDER = 'renewal_reminder', 'Renewal Reminder'
        PAYMENT_RECEIPT = 'payment_receipt', 'Payment Receipt'
        PLAN_ASSIGNED = 'plan_assigned', 'Plan Assigned'
        BIRTHDAY = 'birthday', 'Birthday'
        FOLLOWUP = 'followup', 'Follow-Up'
        PROMO = 'promo', 'Promotion'
        CUSTOM = 'custom', 'Custom'

    name = models.CharField(max_length=150)
    channel = models.CharField(max_length=20, choices=ChannelChoices.choices)
    category = models.CharField(
        max_length=30, choices=CategoryChoices.choices, default=CategoryChoices.CUSTOM
    )
    subject = models.CharField(max_length=255, null=True, blank=True)  # Email only
    body = models.TextField()        # HTML for email, plain/rich text for WhatsApp
    variables = models.JSONField(default=list)  # ['client_name', 'expiry_date']
    is_active = models.BooleanField(default=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True,
        related_name='message_templates_created'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Message Template'
        verbose_name_plural = 'Message Templates'
        indexes = [
            models.Index(fields=['tenant', 'channel', 'category']),
        ]

    def __str__(self):
        return f"{self.name} ({self.get_channel_display()})"


class Notification(TenantAwareModel):
    """
    A message queued to be sent to a client (email / push / SMS / WhatsApp).
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    class ChannelChoices(models.TextChoices):
        EMAIL = 'email', 'Email'
        WHATSAPP = 'whatsapp', 'WhatsApp'
        SMS = 'sms', 'SMS'
        PUSH = 'push', 'Push Notification'
        IN_APP = 'in_app', 'In-App'

    class StatusChoices(models.TextChoices):
        QUEUED = 'queued', 'Queued'
        SENT = 'sent', 'Sent'
        DELIVERED = 'delivered', 'Delivered'
        FAILED = 'failed', 'Failed'
        READ = 'read', 'Read'

    recipient = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='notifications'
    )
    channel = models.CharField(max_length=20, choices=ChannelChoices.choices)
    template = models.ForeignKey(
        MessageTemplate, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='notifications'
    )
    subject = models.CharField(max_length=255, null=True, blank=True)
    body = models.TextField()
    status = models.CharField(
        max_length=20, choices=StatusChoices.choices, default=StatusChoices.QUEUED
    )
    scheduled_at = models.DateTimeField(null=True, blank=True)
    sent_at = models.DateTimeField(null=True, blank=True)
    read_at = models.DateTimeField(null=True, blank=True)
    error_message = models.TextField(null=True, blank=True)
    external_message_id = models.CharField(max_length=255, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Notification'
        verbose_name_plural = 'Notifications'
        indexes = [
            models.Index(fields=['tenant', 'recipient', 'status']),
            models.Index(fields=['scheduled_at']),
        ]

    def __str__(self):
        return f"[{self.channel}] → {self.recipient} ({self.status})"


class Promo(TenantAwareModel):
    """
    A promotional campaign sent to a segment of clients (email/SMS/WhatsApp).
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    class StatusChoices(models.TextChoices):
        DRAFT = 'draft', 'Draft'
        SCHEDULED = 'scheduled', 'Scheduled'
        SENT = 'sent', 'Sent'
        CANCELLED = 'cancelled', 'Cancelled'

    class TargetAudience(models.TextChoices):
        ALL_CLIENTS = 'all', 'All Clients'
        ACTIVE = 'active', 'Active Members'
        INACTIVE = 'inactive', 'Inactive Members'
        LEADS = 'leads', 'Leads'
        EXPIRING_SOON = 'expiring_soon', 'Expiring in 7 days'
        CUSTOM = 'custom', 'Custom Segment'

    title = models.CharField(max_length=255)
    template = models.ForeignKey(
        MessageTemplate, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='promos'
    )
    channel = models.CharField(max_length=20, choices=MessageTemplate.ChannelChoices.choices)
    target_audience = models.CharField(
        max_length=30, choices=TargetAudience.choices, default=TargetAudience.ALL_CLIENTS
    )
    custom_recipient_ids = models.JSONField(default=list)  # client PKs for CUSTOM
    coupon = models.ForeignKey(
        'packages.Coupon', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='promos'
    )
    status = models.CharField(
        max_length=20, choices=StatusChoices.choices, default=StatusChoices.DRAFT
    )
    scheduled_at = models.DateTimeField(null=True, blank=True)
    sent_at = models.DateTimeField(null=True, blank=True)
    total_sent = models.PositiveIntegerField(default=0)
    total_delivered = models.PositiveIntegerField(default=0)
    total_opened = models.PositiveIntegerField(default=0)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True,
        related_name='promos_created'
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Promo'
        verbose_name_plural = 'Promos'
        indexes = [
            models.Index(fields=['tenant', 'status']),
        ]

    def __str__(self):
        return f"{self.title} ({self.status})"


class EmailTemplate(TenantAwareModel):
    name = models.CharField(max_length=100, help_text="e.g. 'Order Placed', 'Invoice'")
    subject = models.CharField(max_length=255)
    html_body = models.TextField()
    text_body = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return self.name


class EmailLog(TenantAwareModel):
    recipient = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True)
    recipient_email = models.EmailField()
    subject = models.CharField(max_length=255)
    sent_at = models.DateTimeField(auto_now_add=True)
    status = models.CharField(max_length=20, choices=[('success', 'Success'), ('failed', 'Failed')], default='success')
    error_message = models.TextField(blank=True)

    def __str__(self):
        return f"Email to {self.recipient_email} - {self.status}"


class WhatsAppTemplate(TenantAwareModel):
    name = models.CharField(max_length=100, help_text="Template name from Meta dashboard")
    category = models.CharField(max_length=50, blank=True)
    language = models.CharField(max_length=10, default='en_US')
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return self.name


class WhatsAppLog(TenantAwareModel):
    recipient = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True)
    recipient_phone = models.CharField(max_length=20)
    template = models.ForeignKey(WhatsAppTemplate, on_delete=models.SET_NULL, null=True, blank=True)
    message_id = models.CharField(max_length=255, blank=True)
    sent_at = models.DateTimeField(auto_now_add=True)
    status = models.CharField(max_length=20, choices=[('success', 'Success'), ('failed', 'Failed')], default='success')
    error_message = models.TextField(blank=True)

    def __str__(self):
        return f"WhatsApp to {self.recipient_phone} - {self.status}"

import uuid
from django.db import models
from django.conf import settings
from core.models import TenantAwareModel


class AuditLog(TenantAwareModel):
    """
    Immutable audit trail for critical actions.
    Never update or delete rows — append only.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    class ActionChoices(models.TextChoices):
        CREATE = 'create', 'Create'
        UPDATE = 'update', 'Update'
        DELETE = 'delete', 'Delete'
        LOGIN = 'login', 'Login'
        LOGOUT = 'logout', 'Logout'
        EXPORT = 'export', 'Data Export'
        PAYMENT = 'payment', 'Payment'
        REFUND = 'refund', 'Refund'
        ROLE_CHANGE = 'role_change', 'Role Change'
        SUBSCRIPTION = 'subscription', 'Subscription Change'

    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='audit_logs'
    )
    action = models.CharField(max_length=30, choices=ActionChoices.choices)
    resource = models.CharField(max_length=100)    # e.g. 'Membership', 'Payment'
    resource_id = models.CharField(max_length=50, null=True, blank=True)
    changes = models.JSONField(null=True, blank=True)  # {field: [old, new]}
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(null=True, blank=True)
    extra = models.JSONField(null=True, blank=True)  # any extra context
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Audit Log'
        verbose_name_plural = 'Audit Logs'
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['tenant', 'resource', 'resource_id']),
            models.Index(fields=['actor', 'timestamp']),
        ]

    def __str__(self):
        return f"[{self.action}] {self.resource}#{self.resource_id} by {self.actor}"

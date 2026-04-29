import uuid
from django.db import models
from django.conf import settings
from core.tenants.models import TenantAwareModel, OrganizationMember
from core.common.models import BaseProfile

class StaffProfile(TenantAwareModel, BaseProfile):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    org_staff = models.OneToOneField(
        OrganizationMember,
        on_delete=models.CASCADE,
        related_name='staff_profile'
    )
    # The 'tenant' field is inherited from TenantAwareModel.
    # The 'user' and 'role' info is derived from 'org_member'.

    bio = models.TextField(null=True, blank=True)
    specialization = models.CharField(max_length=100, null=True, blank=True)
    rating = models.DecimalField(max_digits=3, decimal_places=2, default=5.0)
    
    @property
    def user(self):
        return self.org_staff.user
    @property
    def role(self):
        return self.org_staff.role
    
    def save(self, *args, **kwargs):
        # Sync tenant from org_member if not set
        if self.org_staff_id and not self.tenant_id:
            self.tenant = self.org_staff.tenant
        super().save(*args, **kwargs)
        
    @property
    def client_count(self):
        # Accessing assigned_clients via the user linked to the org_member
        return self.assigned_clients.count()

    def __str__(self):
        return f"Staff: {self.user.get_full_name() or self.user.username} @ {self.tenant.name}"

from django.contrib.auth.models import AbstractUser
from django.db import models
from core.models import TenantAwareModel

class User(AbstractUser, TenantAwareModel):
    class Roles(models.TextChoices):
        ADMIN = 'admin', 'Admin'
        OWNER = 'owner', 'Owner'
        COACH = 'coach', 'Coach'
        TRAINER = 'trainer', 'Trainer'
        MARKETING = 'marketing', 'Marketing'

    # Tenant is required, but when superuser is created via python manage.py createsuperuser, it will be null unless handled.
    # We will make tenant nullable to allow creation of admin users without a tenant,
    # or handle it differently. Making it nullable is easiest for admin logic.
    tenant = models.ForeignKey('core.Tenant', on_delete=models.CASCADE, related_name='users', null=True, blank=True)
    role = models.CharField(max_length=20, choices=Roles.choices, null=True, blank=True)
    
    # We can also add other custom fields here like 'phone_number', etc. if needed later.

    def __str__(self):
        return self.username

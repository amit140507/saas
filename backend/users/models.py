from django.contrib.auth.models import AbstractUser
from django.db import models
from core.models import TenantAwareModel, Tenant
from django.db.models.signals import post_save
from django.dispatch import receiver

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
    
    class SexChoices(models.TextChoices):
        MALE = 'M', 'Male'
        FEMALE = 'F', 'Female'
        OTHER = 'O', 'Other'

    dob = models.DateField(null=True, blank=True)
    sex = models.CharField(max_length=1, choices=SexChoices.choices, null=True, blank=True)
    phone = models.CharField(max_length=20, null=True, blank=True)
    profile_picture = models.ImageField(upload_to='avatars/', null=True, blank=True)
    date_of_joining = models.DateField(null=True, blank=True)
    referral_source = models.CharField(max_length=255, null=True, blank=True)

    def __str__(self):
        return self.username

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        
        # Automatically sync the user's role to the corresponding Django Group
        if self.role:
            from django.contrib.auth.models import Group
            try:
                # Find or create the group matching the user's role
                group, _ = Group.objects.get_or_create(name=self.role)
                
                # Fetch all possible role names to clean up old groups
                all_roles = [choice[0] for choice in self.Roles.choices]
                role_groups = Group.objects.filter(name__in=all_roles)
                
                # Remove user from any other role groups, then add the correct one
                self.groups.remove(*role_groups)
                self.groups.add(group)
            except Exception:
                pass

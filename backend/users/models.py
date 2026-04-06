from django.contrib.auth.models import AbstractUser, BaseUserManager, UserManager as DjangoUserManager
from django.db import models
from core.models import TenantAwareModel, Tenant
from django.db.models.signals import post_save, m2m_changed
from django.dispatch import receiver
import logging

logger = logging.getLogger(__name__)

class BaseProfile(models.Model):
    class SexChoices(models.TextChoices):
        MALE = 'M', 'Male'
        FEMALE = 'F', 'Female'
        OTHER = 'O', 'Other'

    dob = models.DateField(null=True, blank=True)
    sex = models.CharField(max_length=1, choices=SexChoices.choices, null=True, blank=True)
    profile_picture = models.ImageField(upload_to='avatars/', null=True, blank=True)
    date_of_joining = models.DateField(null=True, blank=True)
    referral_source = models.CharField(max_length=255, null=True, blank=True)
    phone = models.CharField(max_length=20, null=True, blank=True)

    class Meta:
        abstract = True

class Role(TenantAwareModel):
    name = models.CharField(max_length=50) # 'admin', 'owner', 'trainer', 'marketing', 'client'
    description = models.TextField(blank=True, null=True)

    class Meta:
        unique_together = ('name', 'tenant')
        verbose_name = "Role"
        verbose_name_plural = "Roles"

    def __str__(self):
        return f"{self.name} ({self.tenant.name if self.tenant else 'Global'})"

class UserQuerySet(models.QuerySet):
    def staff(self):
        """Standard Django way to filter staff members."""
        return self.filter(is_staff=True)

    def clients(self):
        """Standard way to filter non-staff members."""
        return self.filter(is_staff=False)

class UserManager(DjangoUserManager.from_queryset(UserQuerySet)):
    use_in_migrations = True

class User(AbstractUser, TenantAwareModel):
    objects = UserManager()

    # Tenant is required
    tenant = models.ForeignKey('core.Tenant', on_delete=models.CASCADE, related_name='users', null=True, blank=True)
    
    # NEW: Multi-role support (Option 2)
    roles = models.ManyToManyField(Role, related_name='users', blank=True)
    
    # phone = models.CharField(max_length=20, null=True, blank=True)  # MOVED TO BASEPROFILE
    public_id = models.CharField(max_length=6, unique=True, null=True, blank=True)
 
    def _get_profile_field(self, field_name):
        profile = getattr(self, 'staff_profile', None) or getattr(self, 'client_profile', None)
        return getattr(profile, field_name, None) if profile else None

    def _set_profile_field(self, field_name, value):
        profile = getattr(self, 'staff_profile', None) or getattr(self, 'client_profile', None)
        if profile:
            setattr(profile, field_name, value)
            profile.save()

    @property
    def phone(self): return self._get_profile_field('phone')
    @phone.setter
    def phone(self, value): self._set_profile_field('phone', value)

    @property
    def dob(self): return self._get_profile_field('dob')
    @dob.setter
    def dob(self, value): self._set_profile_field('dob', value)

    @property
    def sex(self): return self._get_profile_field('sex')
    @sex.setter
    def sex(self, value): self._set_profile_field('sex', value)

    @property
    def date_of_joining(self): return self._get_profile_field('date_of_joining')
    @date_of_joining.setter
    def date_of_joining(self, value): self._set_profile_field('date_of_joining', value)

    @property
    def referral_source(self): return self._get_profile_field('referral_source')
    @referral_source.setter
    def referral_source(self, value): self._set_profile_field('referral_source', value)

    def __str__(self):
        return self.username

    def has_role(self, role_name):
        """Dynamic check if user has a specific role by name."""
        return self.roles.filter(name=role_name).exists()

    @property
    def is_staff_member(self):
        """Returns True if the user has any staff-level roles (any role except 'client')."""
        return self.roles.exclude(name='client').exists()

    @property
    def is_client(self):
        """Returns True if the user has the 'client' role."""
        return self.has_role('client')

    @property
    def is_owner(self):
        """Returns True if the user has the 'owner' role."""
        return self.has_role('owner')

    @property
    def is_trainer(self):
        """Returns True if the user has the 'trainer' role."""
        return self.has_role('trainer')

    def save(self, *args, **kwargs):
        if not self.public_id:
            from .helpers import generate_public_id
            while True:
                new_id = generate_public_id()
                if not User.objects.filter(public_id=new_id).exists():
                    self.public_id = new_id
                    break
        super().save(*args, **kwargs)

class StaffProfile(TenantAwareModel, BaseProfile):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='staff_profile')
    bio = models.TextField(null=True, blank=True)
    specialization = models.CharField(max_length=100, null=True, blank=True)
    rating = models.DecimalField(max_digits=3, decimal_places=2, default=5.0)
    
    def __clinet_count__(self):
        return self.user.assigned_clients.count()

    def __str__(self):
        return f"Staff: {self.user.get_full_name() or self.user.username}"

@receiver(post_save, sender=User)
def create_user_profiles(sender, instance, created=False, **kwargs):
    """
    Automatically create StaffProfile or Client profiles based on the role.
    Note: Client model is in the 'clients' app, we use strings to avoid circular imports.
    """
    if not instance.tenant:
        return

    # Use get_or_create to ensure profiles exist once a tenant is assigned.
    # This handles cases where the tenant is set after the initial user creation.
    if instance.is_staff_member:
        StaffProfile.objects.get_or_create(user=instance, tenant=instance.tenant)
    if instance.is_client:
        from django.apps import apps
        Client = apps.get_model('clients', 'Client')
        Client.objects.get_or_create(user=instance, tenant=instance.tenant)

@receiver(post_save, sender=User)
def sync_user_groups(sender, instance, **kwargs):
    """
    Automatically sync the user's role to the corresponding Django Group.
    This is separated from save() to avoid side effects during bulk updates
    or unrelated saves.
    """
    # Re-sync groups to match roles
    assigned_role_names = set(instance.roles.values_list('name', flat=True))
    
    if not assigned_role_names:
        return

    from django.contrib.auth.models import Group
    try:
        # 1. Ensure groups exist for currently assigned roles
        for role_name in assigned_role_names:
            Group.objects.get_or_create(name=role_name)
            
        # 2. Add user to groups matching assigned roles
        groups_to_add = Group.objects.filter(name__in=assigned_role_names)
        instance.groups.add(*groups_to_add)
        
        # 3. Optional: Remove user from groups they no longer have roles for
        # Only remove if they are NOT inassigned_role_names
        # We can't know ALL possible groups, but we can look at current groups
        current_groups = instance.groups.all()
        # This part is tricky if we don't know which groups are 'role' groups.
        # For now, let's just make sure they have the roles they should have.
            
    except Exception as e:
        logger.error(f"Failed to sync groups for user {instance.username}: {e}")

# --- GHOST CODE FOR LEGACY MIGRATIONS (DO NOT USE) ---
def get_role_choices():
    """Legacy function required by old migrations (e.g., 0011)."""
    return [
        ('admin', 'Admin'), 
        ('owner', 'Owner'), 
        ('trainer', 'Trainer'), 
        ('marketing', 'Marketing'), 
        ('client', 'Client')
    ]
# ----------------------------------------------------

@receiver(m2m_changed, sender=User.roles.through)
def handle_roles_changed(sender, instance, action, **kwargs):
    """
    Handle changes to the User's roles.
    This triggers profile creation and group synchronization.
    """
    if action in ["post_add", "post_remove", "post_clear"]:
        # Re-trigger profile creation
        create_user_profiles(sender=User, instance=instance)
        
        # Re-sync groups
        sync_user_groups(sender=User, instance=instance)

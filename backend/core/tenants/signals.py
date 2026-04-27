from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import Organization
from .rbac_service import seed_default_roles

@receiver(post_save, sender=Organization)
def create_default_roles(sender, instance, created, **kwargs):
    if created:
        seed_default_roles(instance)

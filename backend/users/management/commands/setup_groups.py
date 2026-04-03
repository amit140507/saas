from django.core.management.base import BaseCommand
from django.contrib.auth.models import Group

class Command(BaseCommand):
    help = 'Creates default permission groups for users based on system roles'

    def handle(self, *args, **options):
        # We define the default roles in our system
        roles = ['admin', 'owner', 'coach', 'trainer', 'marketing']
        
        for role_name in roles:
            group, created = Group.objects.get_or_create(name=role_name)
            if created:
                self.stdout.write(self.style.SUCCESS(f'Successfully created group "{role_name}"'))
            else:
                self.stdout.write(self.style.WARNING(f'Group "{role_name}" already exists'))
            
            # Note: We can expand this later to assign specific content_type permissions!
            
        self.stdout.write(self.style.SUCCESS('Finished syncing groups.'))

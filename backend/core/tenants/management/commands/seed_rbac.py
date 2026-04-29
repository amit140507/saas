import logging
from django.core.management.base import BaseCommand
from core.tenants.models import Organization, Permission
from core.tenants.permission_codes import Perms
from core.tenants.rbac_service import seed_default_roles

logger = logging.getLogger(__name__)

class Command(BaseCommand):
    help = 'Seeds default RBAC roles and permissions for organizations'

    def add_arguments(self, parser):
        parser.add_argument(
            '--org',
            type=str,
            help='Optional: specify an organization ID to seed just that org'
        )

    def handle(self, *args, **options):
        # 1. Sync global permissions
        all_perms = Perms.all_perms()
        for code in all_perms:
            Permission.objects.get_or_create(code=code, defaults={'description': f"Permission to {code.replace('_', ' ')}"})
            
        self.stdout.write(self.style.SUCCESS('Successfully synced global permissions.'))

        # 2. Seed roles for orgs
        org_id = options.get('org')
        if org_id:
            orgs = list(Organization.objects.filter(id=org_id))
        else:
            orgs = list(Organization.objects.all())

        for org in orgs:
            seed_default_roles(org)
            self.stdout.write(f"Seeded default roles for org: {org.name}")

        self.stdout.write(self.style.SUCCESS(f'Successfully seeded RBAC for {len(orgs)} organizations.'))

import uuid
import random
from datetime import date, timedelta
from django.core.management.base import BaseCommand
from django.db import transaction
from core.tenants.models import Organization, Permission
from core.tenants.permission_codes import Perms
from core.tenants.rbac_service import seed_default_roles
from billing.packages.models import Package, PackagePlan
from billing.packages.models import PackageFeature
from billing.subscriptions.models import Membership, Feature
from billing.orders.models import Order
from core.clients.models import ClientProfile

class Command(BaseCommand):
    help = 'Seeds foundation data: Global Permissions, Tenant Roles, Packages, Features, Client Memberships and Orders'

    def add_arguments(self, parser):
        parser.add_argument(
            '--org',
            type=str,
            help='Optional: specify an organization slug to seed just that org'
        )

    def handle(self, *args, **options):
        self.stdout.write("Starting foundation data seeding...")
        
        try:
            with transaction.atomic():
                self.seed_global_permissions()
                self.seed_tenant_data(options.get('org'))
            self.stdout.write(self.style.SUCCESS("\nFoundation data seeded successfully!"))
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"Error during seeding: {e}"))
            raise e

    def seed_global_permissions(self):
        """Syncs all permission codes defined in Perms to the database."""
        self.stdout.write("Syncing global permissions...")
        all_perm_codes = Perms.all_perms()
        count = 0
        for code in all_perm_codes:
            _, created = Permission.objects.get_or_create(
                code=code, 
                defaults={'description': f"Permission to {code.replace('_', ' ').capitalize()}"}
            )
            if created:
                count += 1
        self.stdout.write(f"Synced {len(all_perm_codes)} permissions ({count} new).")

    def seed_tenant_data(self, org_slug=None):
        """Seeds roles, packages, features, orders and client memberships for organizations."""
        if org_slug:
            orgs = Organization.objects.filter(slug=org_slug)
            if not orgs.exists():
                self.stdout.write(self.style.WARNING(f"Organization with slug '{org_slug}' not found."))
                return
        else:
            orgs = Organization.objects.all()

        if not orgs.exists():
            self.stdout.write(self.style.WARNING("No organizations found to seed foundation data."))
            return

        for org in orgs:
            self.stdout.write(f"\n--- Seeding Foundation for: {org.name} ---")
            
            # 1. Seed Roles and Permissions mapping
            seed_default_roles(org)
            self.stdout.write(f"  - Seeded default roles (Owner, Trainer, Client, Marketing).")

            # 2. Seed Billing Packages (Legacy/Catalog)
            self.seed_billing_packages(org)
            
            # 3. Seed Global Features for this tenant
            features = self.seed_features(org)
            
            # 4. Link package-level features to catalog packages
            plans = self.seed_package_features(org, features)
            
            # 5. Seed Memberships and Orders for existing clients
            self.seed_client_memberships_and_orders(org, plans)

    def seed_billing_packages(self, org):
        packages_data = [
            {
                'name': 'Silver Membership',
                'description': 'Basic access to gym facilities and standard workout plans.',
            },
            {
                'name': 'Gold Membership',
                'description': 'Full gym access, advanced workout plans, and monthly nutrition consultation.',
                'max_freezes': 15,
            },
            {
                'name': 'Platinum Membership',
                'description': 'All-inclusive access, personal trainer assigned, and weekly progress tracking.',
                'max_freezes': 30,
            }
        ]

        for pkg_info in packages_data:
            package, _ = Package.objects.get_or_create(
                tenant=org,
                name=pkg_info['name'],
                defaults={
                    'description': pkg_info['description'],
                    'max_freezes': pkg_info.get('max_freezes', 5),
                }
            )
            if package.max_freezes != pkg_info.get('max_freezes', 5):
                package.max_freezes = pkg_info.get('max_freezes', 5)
                package.save(update_fields=['max_freezes'])
            
            for plan_info in pkg_info['plans']:
                plan, _ = PackagePlan.objects.get_or_create(
                    tenant=org,
                    package=package,
                    name=plan_info['name'],
                    defaults={
                        'price': plan_info['price'],
                        'duration_in_days': plan_info['days'],
                    }
                )
                if plan.duration_in_days is None:
                    plan.duration_in_days = plan_info['days']
                    plan.save(update_fields=['duration_in_days'])
        self.stdout.write(f"  - Seeded Billing Packages (Catalog).")

    def seed_features(self, org):
        """Seeds standard features for the organization."""
        features_data = [
            {'code': 'workout_plans', 'name': 'Standard Workout Plans', 'description': 'Access to basic workout routines.'},
            {'code': 'diet_plans', 'name': 'Personalized Diet Plans', 'description': 'Tailored nutrition and meal planning.'},
            {'code': 'personal_trainer', 'name': 'Dedicated Trainer', 'description': '1-on-1 coaching sessions.'},
            {'code': 'advanced_analytics', 'name': 'Advanced Analytics', 'description': 'Deep insights into progress and trends.'},
            {'code': 'premium_support', 'name': 'Priority Support', 'description': 'Faster response times for queries.'},
        ]
        
        features_map = {}
        for f_info in features_data:
            feature, _ = Feature.objects.get_or_create(
                tenant=org,
                code=f_info['code'],
                defaults={'name': f_info['name'], 'description': f_info['description']}
            )
            features_map[f_info['code']] = feature
        self.stdout.write(f"  - Seeded {len(features_data)} features.")
        return features_map

    def seed_package_features(self, org, features):
        """Links package-level features and returns active plans for membership seeding."""
        feature_map = {
            'Silver Membership': ['workout_plans'],
            'Gold Membership': ['workout_plans', 'diet_plans'],
            'Platinum Membership': [
                'workout_plans',
                'diet_plans',
                'personal_trainer',
                'advanced_analytics',
                'premium_support',
            ],
        }

        for package_name, feature_codes in feature_map.items():
            try:
                package = Package.objects.get(tenant=org, name=package_name)
            except Package.DoesNotExist:
                continue

            for f_code in feature_codes:
                if f_code in features:
                    PackageFeature.objects.get_or_create(
                        tenant=org,
                        package=package,
                        feature=features[f_code],
                    )

        self.stdout.write(f"  - Linked package features.")
        return list(
            PackagePlan.objects.filter(
                tenant=org,
                is_active=True,
                duration_in_days__isnull=False,
            ).select_related('package')
        )

    def seed_client_memberships_and_orders(self, org, plans):
        """Assigns an active membership and creates a corresponding Order for every client."""
        clients = ClientProfile.objects.filter(tenant=org)
        if not clients.exists():
            return
        if not plans:
            self.stdout.write(self.style.WARNING("  - No active package plans with durations found; skipped membership seeding."))
            return

        # 1. Backfill orders for existing memberships that don't have one
        existing_memberships_no_order = Membership.objects.filter(tenant=org, order__isnull=True)
        backfill_count = 0
        for m in existing_memberships_no_order:
            order = Order.objects.create(
                tenant=org,
                client=m.client,
                status=Order.StatusChoices.CONFIRMED,
                subtotal=m.plan.price,
                total_amount=m.plan.price,
                payment_method='card',
                notes="Backfilled order for existing membership",
                created_by=org.owner if hasattr(org, 'owner') else None
            )
            m.order = order
            m.save(update_fields=['order'])
            backfill_count += 1
        
        if backfill_count > 0:
            self.stdout.write(f"  - Backfilled {backfill_count} orders for existing memberships.")

        # 2. Create new memberships for clients without any
        count = 0
        for client in clients:
            # Check if client already has an active membership
            if Membership.objects.filter(client=client, status=Membership.StatusChoices.ACTIVE).exists():
                continue
            
            plan = random.choice(plans)
            start_date = date.today() - timedelta(days=random.randint(0, 30))
            end_date = start_date + timedelta(days=plan.duration_in_days)
            
            # Create Order first
            order = Order.objects.create(
                tenant=org,
                client=client,
                status=Order.StatusChoices.CONFIRMED,
                subtotal=plan.price,
                total_amount=plan.price,
                payment_method='card',
                notes="Auto-seeded for membership purchase",
                created_by=org.owner if hasattr(org, 'owner') else None
            )

            # Create Membership linked to Order
            Membership.objects.create(
                tenant=org,
                client=client,
                plan=plan,
                order=order,
                start_date=start_date,
                base_end_date=end_date,
                extended_end_date=end_date,
                status=Membership.StatusChoices.ACTIVE,
                notes="Auto-seeded membership"
            )
            count += 1
        
        if count > 0:
            self.stdout.write(f"  - Created {count} new memberships with corresponding orders.")

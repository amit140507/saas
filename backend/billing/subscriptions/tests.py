from datetime import date
from types import SimpleNamespace

from django.contrib.auth import get_user_model
from django.db import IntegrityError
from django.test import TestCase

from billing.subscriptions.models import (
    Addon,
    AddonFeature,
    Feature,
)
from billing.packages.models import Package, PackageFeature, PackagePlan
from billing.packages.serializers import PackageSerializer
from billing.subscriptions.services import MembershipService
from core.clients.models import ClientProfile
from core.tenants.models import Organization, OrganizationMember


User = get_user_model()


class MembershipFeatureTests(TestCase):
    def setUp(self):
        self.tenant = Organization.objects.create(name='Test Gym', slug='test-gym')
        self.user = User.objects.create_user(
            username='client1',
            email='client1@example.com',
            password='StrongPass123!',
        )
        self.org_member = OrganizationMember.objects.create(
            tenant=self.tenant,
            user=self.user,
        )
        self.client_profile = ClientProfile.objects.create(
            tenant=self.tenant,
            org_client=self.org_member,
            status=ClientProfile.StatusChoices.ACTIVE,
        )
        self.workout_feature = Feature.objects.create(
            tenant=self.tenant,
            code='workout_plans',
            name='Workout Plans',
            description='Access to workout plans.',
        )
        self.diet_feature = Feature.objects.create(
            tenant=self.tenant,
            code='diet_plans',
            name='Diet Plans',
            description='Access to diet plans.',
        )
        self.package = Package.objects.create(
            tenant=self.tenant,
            name='Gold 3-Month',
            description='Gold package',
            max_freezes=5,
            is_active=True,
        )
        self.plan = PackagePlan.objects.create(
            tenant=self.tenant,
            package=self.package,
            name='Gold 3-Month Plan',
            duration_in_days=90,
            price='4999.00',
        )
        PackageFeature.objects.create(
            tenant=self.tenant,
            package=self.package,
            feature=self.workout_feature,
        )

    def test_package_serializer_returns_package_features_and_plans(self):
        serializer = PackageSerializer(self.package)

        self.assertEqual(len(serializer.data['features']), 1)
        self.assertEqual(
            serializer.data['features'][0]['feature_details']['code'],
            'workout_plans',
        )
        self.assertEqual(len(serializer.data['plans']), 1)
        self.assertEqual(serializer.data['plans'][0]['name'], 'Gold 3-Month Plan')

    def test_package_serializer_creates_nested_features_and_plans(self):
        payload = {
            'name': 'Platinum',
            'description': 'Platinum package',
            'max_freezes': 10,
            'is_active': True,
            'features': [
                {
                    'name': 'Diet Plans',
                    'code': 'diet_plans',
                    'description': 'Access to diet plans.',
                },
            ],
            'plans': [
                {
                    'name': 'Monthly Platinum',
                    'price': '6000.00',
                    'duration_in_days': 30,
                    'is_active': True,
                },
            ],
        }
        serializer = PackageSerializer(
            data=payload,
            context={'request': SimpleNamespace(tenant=self.tenant)},
        )

        self.assertTrue(serializer.is_valid(), serializer.errors)
        package = serializer.save()

        self.assertEqual(package.package_features.count(), 1)
        self.assertEqual(package.plans.count(), 1)
        self.assertEqual(package.package_features.first().feature_id, self.diet_feature.id)

    def test_package_serializer_replaces_nested_features_and_plans_on_update(self):
        payload = {
            'name': 'Gold Updated',
            'description': 'Updated package',
            'max_freezes': 8,
            'is_active': True,
            'features': [
                {
                    'name': 'Diet Plans',
                    'code': 'diet_plans',
                    'description': 'Access to diet plans.',
                },
            ],
            'plans': [
                {
                    'name': 'Annual Gold',
                    'price': '30000.00',
                    'duration_in_days': 365,
                    'is_active': True,
                },
            ],
        }
        serializer = PackageSerializer(
            self.package,
            data=payload,
            context={'request': SimpleNamespace(tenant=self.tenant)},
        )

        self.assertTrue(serializer.is_valid(), serializer.errors)
        package = serializer.save()

        self.assertEqual(package.name, 'Gold Updated')
        self.assertEqual(package.package_features.count(), 1)
        self.assertEqual(package.package_features.first().feature_id, self.diet_feature.id)
        self.assertEqual(list(package.plans.values_list('name', flat=True)), ['Annual Gold'])

    def test_package_serializer_rejects_invalid_nested_package_data(self):
        payload = {
            'name': 'Invalid',
            'description': '',
            'max_freezes': 0,
            'is_active': True,
            'features': [
                {'name': 'A', 'code': 'duplicate', 'description': ''},
                {'name': 'B', 'code': 'duplicate', 'description': ''},
            ],
            'plans': [
                {
                    'name': '',
                    'price': '-1.00',
                    'duration_in_days': 0,
                    'is_active': True,
                },
            ],
        }
        serializer = PackageSerializer(
            data=payload,
            context={'request': SimpleNamespace(tenant=self.tenant)},
        )

        self.assertFalse(serializer.is_valid())
        self.assertIn('plans', serializer.errors)

    def test_package_serializer_scopes_feature_reuse_by_tenant(self):
        other_tenant = Organization.objects.create(name='Other Gym', slug='other-gym')
        Feature.objects.create(
            tenant=other_tenant,
            code='video_calls',
            name='Other Video Calls',
            description='Other tenant feature.',
        )
        payload = {
            'name': 'Online',
            'description': '',
            'max_freezes': 0,
            'is_active': True,
            'features': [
                {
                    'name': 'Video Calls',
                    'code': 'video_calls',
                    'description': 'Tenant-local calls.',
                },
            ],
            'plans': [
                {
                    'name': 'Monthly Online',
                    'price': '1500.00',
                    'duration_in_days': 30,
                    'is_active': True,
                },
            ],
        }
        serializer = PackageSerializer(
            data=payload,
            context={'request': SimpleNamespace(tenant=self.tenant)},
        )

        self.assertTrue(serializer.is_valid(), serializer.errors)
        package = serializer.save()

        self.assertEqual(
            package.package_features.first().feature.tenant_id,
            self.tenant.id,
        )

    def test_create_membership_snapshots_package_features(self):
        membership = MembershipService.create_membership(
            tenant=self.tenant,
            client=self.client_profile,
            plan=self.plan,
            start_date=date(2026, 5, 19),
        )

        snapshot_features = membership.snapshot.data['package_details']['package_features']
        self.assertEqual(len(snapshot_features), 1)
        self.assertEqual(snapshot_features[0]['feature_details']['code'], 'workout_plans')

    def test_has_feature_prefers_snapshot_over_live_package_changes(self):
        membership = MembershipService.create_membership(
            tenant=self.tenant,
            client=self.client_profile,
            plan=self.plan,
            start_date=date(2026, 5, 19),
        )

        PackageFeature.objects.create(
            tenant=self.tenant,
            package=self.package,
            feature=self.diet_feature,
        )

        self.assertTrue(MembershipService.has_feature(membership, 'workout_plans'))
        self.assertFalse(MembershipService.has_feature(membership, 'diet_plans'))

    def test_duplicate_package_feature_is_rejected(self):
        with self.assertRaises(IntegrityError):
            PackageFeature.objects.create(
                tenant=self.tenant,
                package=self.package,
                feature=self.workout_feature,
            )

    def test_feature_code_is_unique_per_tenant(self):
        with self.assertRaises(IntegrityError):
            Feature.objects.create(
                tenant=self.tenant,
                code='workout_plans',
                name='Duplicate Workout Plans',
            )

    def test_membership_addon_unlocks_feature_for_specific_client(self):
        membership = MembershipService.create_membership(
            tenant=self.tenant,
            client=self.client_profile,
            plan=self.plan,
            start_date=date(2026, 5, 19),
        )
        addon = Addon.objects.create(
            tenant=self.tenant,
            code='priority_diet_support',
            name='Priority Diet Support',
            description='Paid upgrade for diet planning support.',
            price='999.00',
            billing_type=Addon.BillingTypeChoices.ONE_TIME,
            is_active=True,
        )
        AddonFeature.objects.create(
            tenant=self.tenant,
            addon=addon,
            feature=self.diet_feature,
        )
        membership.addons.create(
            tenant=self.tenant,
            addon=addon,
            price='999.00',
            start_date=date(2026, 5, 19),
        )

        self.assertTrue(MembershipService.has_feature(membership, 'diet_plans'))

from decimal import Decimal
from datetime import timedelta
from django.test import TestCase
from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework.test import APIClient
from core.clients.models import ClientProfile
from core.tenants.models import Organization, OrganizationMember
from billing.orders.models import Order
from .models import Coupon, CouponRule
from .models import CouponUsage
from .services import CouponService

User = get_user_model()
Tenant = Organization

class CouponServiceTests(TestCase):
    def setUp(self):
        self.tenant = Tenant.objects.create(name="Test Gym")
        self.user = User.objects.create_user(email="test@test.com", password="password", tenant=self.tenant)
        self.coupon = Coupon.objects.create(
            tenant=self.tenant,
            code="SUMMER20",
            discount_type=Coupon.DiscountType.PERCENTAGE,
            discount_value=Decimal('20.0'),
            max_discount_cap=Decimal('50.0'),
            is_active=True
        )
        self.rule = CouponRule.objects.create(
            coupon=self.coupon,
            min_order_value=Decimal('100.0')
        )

    def test_validate_valid_coupon(self):
        validation = CouponService.validate("SUMMER20", self.tenant, self.user, Decimal('200.0'))
        self.assertTrue(validation['valid'])

    def test_validate_invalid_min_order(self):
        validation = CouponService.validate("SUMMER20", self.tenant, self.user, Decimal('50.0'))
        self.assertFalse(validation['valid'])
        self.assertIn("Minimum order value", validation['error'])

    def test_calculate_percentage_with_cap(self):
        discount = CouponService.calculate_discount(self.coupon, Decimal('1000.0'))
        # 20% of 1000 is 200, but cap is 50
        self.assertEqual(discount, Decimal('50.0'))


class CouponUsageViewSetTests(TestCase):
    def setUp(self):
        self.api_client = APIClient()
        self.tenant = Organization.objects.create(name="Fit Gym", slug="fit-gym")
        self.other_tenant = Organization.objects.create(name="Other Gym", slug="other-gym")
        self.admin_user = User.objects.create_user(
            username="admin",
            email="admin@example.com",
            password="password",
        )
        OrganizationMember.objects.create(user=self.admin_user, tenant=self.tenant, is_owner=True)
        self.client_profile = self._create_client_profile("client-one", self.tenant)
        self.other_client_profile = self._create_client_profile("other-client", self.other_tenant)
        self.coupon = Coupon.objects.create(
            tenant=self.tenant,
            code="SAVE20",
            discount_type=Coupon.DiscountType.PERCENTAGE,
            discount_value=Decimal("20.00"),
            is_active=True,
        )
        self.other_coupon = Coupon.objects.create(
            tenant=self.other_tenant,
            code="OTHER20",
            discount_type=Coupon.DiscountType.PERCENTAGE,
            discount_value=Decimal("20.00"),
            is_active=True,
        )

    def tenant_headers(self):
        return {"HTTP_X_TENANT_ID": str(self.tenant.id)}

    def _create_client_profile(self, username, tenant):
        user = User.objects.create_user(
            username=username,
            email=f"{username}@example.com",
            password="password",
        )
        member = OrganizationMember.objects.create(user=user, tenant=tenant)
        return ClientProfile.objects.create(
            tenant=tenant,
            org_client=member,
            status=ClientProfile.StatusChoices.ACTIVE,
        )

    def _create_order(self, client_profile, suffix, total="100.00", discount="20.00"):
        return Order.objects.create(
            tenant=client_profile.tenant,
            client=client_profile,
            order_number=f"ORD-{suffix}",
            status=Order.StatusChoices.CONFIRMED,
            subtotal=Decimal(total),
            discount_amount=Decimal(discount),
            tax_amount=Decimal("0.00"),
            total_amount=Decimal(total),
        )

    def _create_usage(self, coupon, order, minutes_ago):
        usage = CouponUsage.objects.create(
            coupon=coupon,
            user=order.client.user,
            order=order,
            discount_applied=order.discount_amount,
        )
        CouponUsage.objects.filter(id=usage.id).update(
            used_at=timezone.now() - timedelta(minutes=minutes_ago)
        )
        usage.refresh_from_db()
        return usage

    def test_coupon_usages_are_enriched_sorted_and_scoped_to_coupon_tenant(self):
        older_order = self._create_order(self.client_profile, "OLDER")
        newest_order = self._create_order(self.client_profile, "NEWEST", total="250.00", discount="50.00")
        self._create_usage(self.coupon, older_order, minutes_ago=30)
        newest_usage = self._create_usage(self.coupon, newest_order, minutes_ago=5)
        other_order = self._create_order(self.other_client_profile, "OTHER")
        self._create_usage(self.other_coupon, other_order, minutes_ago=1)

        self.api_client.force_authenticate(user=self.admin_user)
        response = self.api_client.get(
            f"/api/v1/coupons/{self.coupon.id}/usages/",
            **self.tenant_headers(),
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual([usage["order_number"] for usage in response.data], ["ORD-NEWEST", "ORD-OLDER"])
        self.assertEqual(response.data[0]["id"], str(newest_usage.id))
        self.assertEqual(response.data[0]["order"], str(newest_order.id))
        self.assertEqual(response.data[0]["order_status"], Order.StatusChoices.CONFIRMED)
        self.assertEqual(response.data[0]["order_total_amount"], "250.00")
        self.assertEqual(response.data[0]["order_discount_amount"], "50.00")
        self.assertIsNotNone(response.data[0]["order_created_at"])

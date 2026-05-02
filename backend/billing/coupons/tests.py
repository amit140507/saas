from decimal import Decimal
from django.test import TestCase
from django.contrib.auth import get_user_model
from django.utils import timezone
from core.models import Tenant
from .models import Coupon, CouponRule
from .services import CouponService

User = get_user_model()

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

import uuid
from decimal import Decimal
from django.utils import timezone
from ..models import Coupon, CouponUsage

class ReferralService:
    @staticmethod
    def issue_referral_coupon(referrer_user, tenant) -> Coupon:
        """Generate unique referral code for the referrer."""
        code = f"REF-{str(uuid.uuid4())[:8].upper()}"
        
        coupon = Coupon.objects.create(
            tenant=tenant,
            code=code,
            description=f"Referral code for {referrer_user.email}",
            discount_type=Coupon.DiscountType.PERCENTAGE,
            discount_value=Decimal('10.0'), # Example: 10% off for referee
            category=Coupon.CouponCategory.REFERRAL,
            user_segment=Coupon.UserSegment.REFERRAL,
            referrer_reward_value=Decimal('50.0'), # Example: 50 credit for referrer
            is_active=True,
        )
        return coupon

    @staticmethod
    def process_referral_reward(referrer_user, tenant) -> None:
        """When referee completes purchase, reward the referrer with a discount coupon."""
        code = f"RWD-{str(uuid.uuid4())[:8].upper()}"
        
        Coupon.objects.create(
            tenant=tenant,
            code=code,
            description=f"Referral reward for {referrer_user.email}",
            discount_type=Coupon.DiscountType.FIXED,
            discount_value=Decimal('50.0'), # Example: 50 off
            category=Coupon.CouponCategory.REFERRAL,
            user_segment=Coupon.UserSegment.ALL,
            max_uses_per_user=1,
            is_active=True,
        )

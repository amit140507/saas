from decimal import Decimal
from django.utils import timezone
from django.db import transaction
from ..models import Coupon, CouponUsage

class CouponService:
    @staticmethod
    def validate(code: str, tenant, user, order_amount: Decimal) -> dict:
        """
        Returns: {valid: bool, coupon: Coupon|None, error: str|None}
        """
        try:
            coupon = Coupon.objects.select_related('rule').get(code=code, tenant=tenant)
        except Coupon.DoesNotExist:
            return {'valid': False, 'coupon': None, 'error': 'Invalid coupon code.'}

        if not coupon.is_active:
            return {'valid': False, 'coupon': coupon, 'error': 'Coupon is not active.'}

        now = timezone.now()
        if coupon.valid_from and now < coupon.valid_from:
            return {'valid': False, 'coupon': coupon, 'error': 'Coupon is not yet valid.'}
        if coupon.valid_to and now > coupon.valid_to:
            return {'valid': False, 'coupon': coupon, 'error': 'Coupon has expired.'}

        if coupon.max_uses is not None and coupon.times_used >= coupon.max_uses:
            return {'valid': False, 'coupon': coupon, 'error': 'Coupon usage limit reached.'}

        if hasattr(coupon, 'rule'):
            rule = coupon.rule
            if order_amount < rule.min_order_value:
                return {'valid': False, 'coupon': coupon, 'error': f'Minimum order value of {rule.min_order_value} required.'}

        if user and coupon.max_uses_per_user:
            usage_count = CouponUsage.objects.filter(coupon=coupon, user=user).count()
            if usage_count >= coupon.max_uses_per_user:
                return {'valid': False, 'coupon': coupon, 'error': 'You have reached the maximum uses for this coupon.'}

        # Add more validation based on user segment, packages, etc. here

        return {'valid': True, 'coupon': coupon, 'error': None}

    @staticmethod
    def calculate_discount(coupon: Coupon, order_amount: Decimal, quantity: int = 1) -> Decimal:
        if coupon.discount_type == Coupon.DiscountType.PERCENTAGE:
            discount = (coupon.discount_value / Decimal('100.0')) * order_amount
            if coupon.max_discount_cap:
                discount = min(discount, coupon.max_discount_cap)
            return min(discount, order_amount)
            
        elif coupon.discount_type == Coupon.DiscountType.FIXED:
            return min(coupon.discount_value, order_amount)
            
        elif coupon.discount_type == Coupon.DiscountType.FIXED_PRICE:
            if coupon.fixed_price_amount is not None and order_amount > coupon.fixed_price_amount:
                return order_amount - coupon.fixed_price_amount
            return Decimal('0.0')
            
        elif coupon.discount_type == Coupon.DiscountType.FREE_SHIPPING:
            return Decimal('0.0') # Assuming shipping logic is handled elsewhere, or we'd return shipping cost
            
        return Decimal('0.0')

    @staticmethod
    @transaction.atomic
    def apply(coupon: Coupon, user, order, discount_applied: Decimal) -> CouponUsage:
        """
        Atomically increment times_used and create CouponUsage.
        """
        # Lock the coupon row to prevent race conditions
        locked_coupon = Coupon.objects.select_for_update().get(pk=coupon.pk)
        
        if locked_coupon.max_uses is not None and locked_coupon.times_used >= locked_coupon.max_uses:
            raise ValueError('Coupon usage limit reached.')
            
        locked_coupon.times_used += 1
        locked_coupon.save(update_fields=['times_used'])

        usage = CouponUsage.objects.create(
            coupon=locked_coupon,
            user=user,
            order=order,
            discount_applied=discount_applied
        )
        return usage

    @staticmethod
    def get_auto_apply_coupon(tenant, user, order_amount: Decimal) -> Coupon | None:
        """Find best auto-applied coupon for this cart."""
        now = timezone.now()
        coupons = Coupon.objects.filter(
            tenant=tenant,
            is_active=True,
            is_auto_applied=True
        ).exclude(
            valid_from__gt=now
        ).exclude(
            valid_to__lt=now
        ).select_related('rule')
        
        best_coupon = None
        max_discount = Decimal('0.0')
        
        for coupon in coupons:
            validation = CouponService.validate(coupon.code, tenant, user, order_amount)
            if validation['valid']:
                discount = CouponService.calculate_discount(coupon, order_amount)
                if discount > max_discount:
                    max_discount = discount
                    best_coupon = coupon
                    
        return best_coupon

    @staticmethod
    def get_user_usage_count(coupon: Coupon, user) -> int:
        return CouponUsage.objects.filter(coupon=coupon, user=user).count()

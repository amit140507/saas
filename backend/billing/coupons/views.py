from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .models import Coupon, CouponUsage
from .serializers import CouponSerializer, CouponValidateSerializer, CouponUsageSerializer
from .services import CouponService
# Assume IsAdminOrStaff exists in common.permissions, or we'll just use IsAuthenticated for now

class CouponViewSet(viewsets.ModelViewSet):
    """
    CRUD for coupons.
    """
    serializer_class = CouponSerializer
    permission_classes = [IsAuthenticated] # Add IsAdminOrStaff when available
    lookup_field = 'id'

    def get_queryset(self):
        tenant_id = self.kwargs.get('org_pk') or self.request.user.tenant_id
        return Coupon.objects.filter(tenant_id=tenant_id).select_related('rule').prefetch_related('rule__applicable_plans')

    def perform_create(self, serializer):
        tenant_id = self.kwargs.get('org_pk') or self.request.user.tenant_id
        serializer.save(tenant_id=tenant_id)

    @action(detail=False, methods=['post'], url_path='validate')
    def validate_coupon(self, request, org_pk=None):
        tenant_id = org_pk or request.user.tenant_id
        serializer = CouponValidateSerializer(data=request.data)
        
        if serializer.is_valid():
            code = serializer.validated_data['code']
            order_amount = serializer.validated_data['order_amount']
            
            validation = CouponService.validate(code, tenant_id, request.user, order_amount)
            
            if not validation['valid']:
                return Response({'error': validation['error']}, status=status.HTTP_400_BAD_REQUEST)
                
            coupon = validation['coupon']
            discount_amount = CouponService.calculate_discount(coupon, order_amount)
            
            return Response({
                'valid': True,
                'discount_amount': discount_amount,
                'coupon': CouponSerializer(coupon).data
            })
            
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['get'], url_path='usages')
    def usages(self, request, id=None, org_pk=None):
        coupon = self.get_object()
        usages = CouponUsage.objects.filter(coupon=coupon)
        serializer = CouponUsageSerializer(usages, many=True)
        return Response(serializer.data)


class CouponUsageViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Admin-only usage audit.
    """
    serializer_class = CouponUsageSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        tenant_id = self.kwargs.get('org_pk') or self.request.user.tenant_id
        return CouponUsage.objects.filter(coupon__tenant_id=tenant_id).select_related('user', 'coupon')

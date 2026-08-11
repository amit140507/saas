from rest_framework import viewsets

from core.tenants.permissions import IsTenantMember, HasPermission
from core.tenants.rbac_service import get_member, user_has_permission
from core.tenants.permission_codes import Perms
from .models import Order
from .serializers import OrderSerializer


class OrderViewSet(viewsets.ModelViewSet):
    serializer_class = OrderSerializer
    
    def get_permissions(self):
        if self.action in ['destroy', 'update', 'partial_update']:
            return [HasPermission(Perms.MANAGE_ORDERS)()]
        return [IsTenantMember()]

    def get_queryset(self):
        tenant = getattr(self.request, 'tenant', None)
        if not tenant:
            return Order.objects.none()

        qs = Order.objects.filter(tenant=tenant)
        
        member = get_member(self.request.user, tenant)
        if not member:
            return Order.objects.none()

        if self.request.user.is_superuser or member.is_owner:
            pass
        elif user_has_permission(self.request.user, tenant, Perms.VIEW_ORDERS) or \
             user_has_permission(self.request.user, tenant, Perms.MANAGE_ORDERS):
            pass
        elif hasattr(member, 'client_profile'):
            qs = qs.filter(client=member.client_profile)
        else:
            return Order.objects.none()

        status_filter = self.request.query_params.get('status')
        if status_filter:
            qs = qs.filter(status=status_filter)

        client_filter = self.request.query_params.get('client')
        if client_filter:
            qs = qs.filter(client_id=client_filter)

        return qs.prefetch_related('items').order_by('-created_at')

    def perform_create(self, serializer):
        serializer.save(
            tenant=getattr(self.request, 'tenant', None),
            created_by=self.request.user,
        )

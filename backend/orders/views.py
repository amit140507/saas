from rest_framework import viewsets, permissions
from .models import Order
from .serializers import OrderSerializer

class OrderViewSet(viewsets.ModelViewSet):
    serializer_class = OrderSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if not user.tenant:
            return Order.objects.none()
            
        # Admins and Owners can see all orders in their tenant, standard users see their own
        if getattr(user, 'role', None) in ['admin', 'owner']:
            return Order.objects.filter(tenant=user.tenant)
        return Order.objects.filter(user=user, tenant=user.tenant)

    def perform_create(self, serializer):
        # Automatically assign the current user and their tenant to the Order for security
        serializer.save(user=self.request.user, tenant=self.request.user.tenant)

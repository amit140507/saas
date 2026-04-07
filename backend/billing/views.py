from rest_framework import viewsets, permissions
from .models import Product
from .serializers import ProductSerializer

class ProductViewSet(viewsets.ModelViewSet):
    queryset = Product.objects.filter(is_active=True)
    serializer_class = ProductSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        # Filter by current user's tenant
        user = self.request.user
        if user.is_staff:
            return Product.objects.filter(tenant=user.tenant, is_active=True)
        return Product.objects.filter(tenant=user.tenant, is_active=True)

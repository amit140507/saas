from rest_framework import viewsets, permissions
from .models import Client
from .serializers import ClientSerializer

class ClientViewSet(viewsets.ModelViewSet):
    serializer_class = ClientSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        
        # If the user is a superadmin or staff, they see all clients in their tenant
        if hasattr(user, 'tenant') and user.tenant:
            return Client.objects.filter(tenant=user.tenant)
        return Client.objects.none()

from rest_framework import viewsets, permissions
from core.accounts.models import User
from .serializers import StaffMemberSerializer

class StaffMemberViewSet(viewsets.ModelViewSet):
    serializer_class = StaffMemberSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        # Only return staff for the current tenant
        user = self.request.user
        if not hasattr(user, 'tenant') or not user.tenant:
            return User.objects.none()
        
        # Staff roles excluding 'client'
        staff_roles = [
            'admin',
            'owner',
            'trainer',
            'marketing',
        ]
        return User.objects.filter(tenant=user.tenant, roles__name__in=staff_roles).distinct().select_related('staff_profile')

from rest_framework import serializers
from users.models import User
from core.models import Tenant
from dj_rest_auth.registration.serializers import RegisterSerializer

class CustomRegisterSerializer(RegisterSerializer):
    tenant_name = serializers.CharField(max_length=255, required=True)

    def get_cleaned_data(self):
        data = super().get_cleaned_data()
        data['tenant_name'] = self.validated_data.get('tenant_name', '')
        return data

    def custom_signup(self, request, user):
        tenant_name = self.cleaned_data.get('tenant_name')
        if tenant_name:
            tenant = Tenant.objects.create(name=tenant_name)
            user.tenant = tenant
            user.role = User.Roles.OWNER
            user.save()

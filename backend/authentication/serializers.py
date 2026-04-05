from rest_framework import serializers
from users.models import User
from core.models import Tenant
from dj_rest_auth.registration.serializers import RegisterSerializer

class TenantSerializer(serializers.ModelSerializer):
    class Meta:
        model = Tenant
        fields = ('id', 'name')

class UserSerializer(serializers.ModelSerializer):
    tenant_details = TenantSerializer(source='tenant', read_only=True)
    
    class Meta:
        model = User
        fields = (
            'pk', 'username', 'email', 'first_name', 'last_name', 
            'phone', 'dob', 'sex', 'date_of_joining', 
            'referral_source', 'tenant_details'
        )
        read_only_fields = ('tenant_details',)

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
            user.save()
            
            # Dynamically assign the 'owner' role
            from users.models import Role
            owner_role, _ = Role.objects.get_or_create(name='owner', tenant=tenant)
            user.roles.add(owner_role)

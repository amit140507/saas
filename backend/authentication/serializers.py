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
    phone = serializers.CharField(required=False, allow_blank=True)
    dob = serializers.DateField(required=False, allow_null=True)
    sex = serializers.CharField(required=False, allow_blank=True)
    date_of_joining = serializers.DateField(required=False, allow_null=True)
    referral_source = serializers.CharField(required=False, allow_blank=True)
    
    class Meta:
        model = User
        fields = (
            'pk', 'username', 'email', 'first_name', 'last_name', 
            'phone', 'dob', 'sex', 'date_of_joining', 
            'referral_source', 'tenant_details'
        )
        read_only_fields = ('tenant_details',)

    def update(self, instance, validated_data):
        # Handle all property-based profile fields
        for field in ['phone', 'dob', 'sex', 'date_of_joining', 'referral_source']:
            if field in validated_data:
                setattr(instance, field, validated_data.pop(field))
        return super().update(instance, validated_data)

class CustomRegisterSerializer(RegisterSerializer):
    tenant_name = serializers.CharField(max_length=255, required=True)
    phone = serializers.CharField(max_length=20, required=False, allow_blank=True)

    def get_cleaned_data(self):
        data = super().get_cleaned_data()
        data['tenant_name'] = self.validated_data.get('tenant_name', '')
        data['phone'] = self.validated_data.get('phone', '')
        return data

    def custom_signup(self, request, user):
        tenant_name = self.cleaned_data.get('tenant_name')
        if tenant_name:
            tenant, _ = Tenant.objects.get_or_create(name=tenant_name)
            user.tenant = tenant
            user.save()
            
            # Dynamically assign the 'owner' role
            from users.models import Role
            owner_role, _ = Role.objects.get_or_create(name='owner', tenant=tenant)
            user.roles.add(owner_role)
            
            # Use the writable property to set the phone in the profile
            phone = self.cleaned_data.get('phone')
            if phone:
                user.phone = phone

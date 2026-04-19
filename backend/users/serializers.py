from rest_framework import serializers
from .models import User, StaffProfile
from core.serializers import TenantSerializer

class StaffProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = StaffProfile
        fields = ['bio', 'specialization', 'rating', 'dob', 'sex', 'profile_picture', 'date_of_joining', 'referral_source', 'phone']

class StaffMemberSerializer(serializers.ModelSerializer):
    staff_profile = StaffProfileSerializer(read_only=True)
    role_names = serializers.SlugRelatedField(
        many=True,
        read_only=True,
        slug_field='name',
        source='roles'
    )
    
    class Meta:
        model = User
        fields = ['id', 'username', 'first_name', 'last_name', 'email', 'role_names', 'staff_profile', 'phone', 'public_id']

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

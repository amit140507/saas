from rest_framework import serializers
from .models import User, StaffProfile

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

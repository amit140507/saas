from rest_framework import serializers
from .models import StaffProfile


class StaffProfileSerializer(serializers.ModelSerializer):
    """Extended profile fields for a staff member."""
    role_name = serializers.CharField(source='role.name', read_only=True, default=None)
    user_id = serializers.UUIDField(source='user.id', read_only=True)
    full_name = serializers.SerializerMethodField()
    email = serializers.EmailField(source='user.email', read_only=True)
    username = serializers.CharField(source='user.username', read_only=True)
    public_id = serializers.CharField(source='user.public_id', read_only=True)

    class Meta:
        model = StaffProfile
        fields = [
            'id', 'user_id', 'username', 'full_name', 'email', 'public_id',
            'role_name', 'bio', 'specialization', 'rating',
            'dob', 'sex', 'profile_picture', 'phone',
            'date_of_joining', 'client_count',
        ]
        read_only_fields = ['id', 'user_id', 'username', 'full_name', 'email', 'public_id', 'role_name', 'client_count']

    def get_full_name(self, obj):
        return obj.user.get_full_name() or obj.user.username

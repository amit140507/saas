from rest_framework import serializers
from .models import StaffProfile
from .services import create_staff_member, update_staff_member


class StaffProfileSerializer(serializers.ModelSerializer):
    """Extended profile fields for a staff member."""
    role_name = serializers.CharField(source='role.name', read_only=True, default=None)
    user_id = serializers.UUIDField(source='user.id', read_only=True)
    full_name = serializers.SerializerMethodField()
    email = serializers.EmailField(source='user.email', read_only=True)
    username = serializers.CharField(source='user.username', read_only=True)
    public_id = serializers.CharField(source='user.public_id', read_only=True)
    first_name = serializers.CharField(write_only=True, required=False, allow_blank=True)
    last_name = serializers.CharField(write_only=True, required=False, allow_blank=True)
    input_email = serializers.EmailField(write_only=True, required=False)
    role_names = serializers.ListField(
        child=serializers.CharField(),
        write_only=True,
        required=False,
        allow_empty=False,
    )

    class Meta:
        model = StaffProfile
        fields = [
            'id', 'user_id', 'username', 'full_name', 'email', 'public_id',
            'role_name', 'bio', 'specialization', 'years_of_experience',
            'dob', 'sex', 'profile_picture', 'phone',
            'date_of_joining', 'client_count',
            'first_name', 'last_name', 'input_email', 'role_names',
        ]
        read_only_fields = ['id', 'user_id', 'username', 'full_name', 'email', 'public_id', 'role_name', 'client_count']

    def get_full_name(self, obj):
        return obj.user.get_full_name() or obj.user.username

    def to_internal_value(self, data):
        mutable_data = data.copy()
        if 'email' in mutable_data and 'input_email' not in mutable_data:
            mutable_data['input_email'] = mutable_data['email']
        return super().to_internal_value(mutable_data)

    def create(self, validated_data):
        request = self.context['request']
        role_names = validated_data.pop('role_names', ['trainer'])
        user_data = {
            'first_name': validated_data.pop('first_name', ''),
            'last_name': validated_data.pop('last_name', ''),
            'email': validated_data.pop('input_email', ''),
            'username': self.initial_data.get('username') or self.initial_data.get('email'),
        }
        return create_staff_member(request.tenant, user_data, validated_data, role_names[0])

    def update(self, instance, validated_data):
        role_names = validated_data.pop('role_names', None)
        user_data = {
            field: validated_data.pop(field)
            for field in ('first_name', 'last_name')
            if field in validated_data
        }
        if self.initial_data.get('username'):
            user_data['username'] = self.initial_data['username']
        return update_staff_member(
            instance,
            user_data,
            validated_data,
            role_names[0] if role_names else None,
        )

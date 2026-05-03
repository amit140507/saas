from django.db import transaction
from rest_framework import serializers
from django.contrib.auth import get_user_model

from .models import Client
from .services import create_client

User = get_user_model()


class ClientUserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'first_name', 'last_name', 'email', 'public_id']


class ClientSerializer(serializers.ModelSerializer):
    user = ClientUserSerializer(read_only=True)

    class Meta:
        model = Client
        fields = [
            'id', 'user', 'assigned_trainer', 'status', 'goal',
            'dob', 'sex', 'profile_picture',
            'date_of_joining', 'phone', 'referral_source',
            'joined_at', 'activated_at',
        ]
        read_only_fields = ['joined_at', 'activated_at']

    def create(self, validated_data):
        request = self.context['request']
        tenant = request.tenant  # set by TenantMiddleware
        user_data = self.initial_data.get('user', {})
        return create_client(tenant, user_data, validated_data)

    @transaction.atomic
    def update(self, instance, validated_data):
        # Update nested user fields if provided in initial_data
        user_data = self.initial_data.get('user', {})
        if user_data:
            user = instance.user
            for field in ('first_name', 'last_name', 'email'):
                if field in user_data:
                    setattr(user, field, user_data[field])
            user.save(update_fields=[f for f in (
                'first_name', 'last_name', 'email') if f in user_data])

        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        return instance

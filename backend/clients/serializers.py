from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import Client

User = get_user_model()

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'first_name', 'last_name', 'email', 'phone', 'public_id']

class ClientSerializer(serializers.ModelSerializer):
    user = UserSerializer()

    class Meta:
        model = Client
        fields = ['id', 'user', 'assigned_trainer', 'status', 'goal', 'health_conditions', 'dob', 'sex', 'profile_picture', 'date_of_joining', 'referral_source', 'phone']
        
    def create(self, validated_data):
        user_data = validated_data.pop('user')
        request = self.context.get('request')
        tenant = request.user.tenant if request and hasattr(request.user, 'tenant') else None
        
        # Ensure email is used as username if missing
        email = user_data.get('email', '')
        
        user = User.objects.create(
            username=email,
            email=email,
            first_name=user_data.get('first_name', ''),
            last_name=user_data.get('last_name', ''),
            phone=user_data.get('phone', ''),
            tenant=tenant
        )
        
        # Dynamically assign 'client' role
        from users.models import Role
        client_role, _ = Role.objects.get_or_create(name='client', tenant=tenant)
        user.roles.add(client_role)
        # Random secure password for clients initially
        user.set_unusable_password() 
        user.save()

        client = Client.objects.create(
            user=user, 
            tenant=tenant, 
            **validated_data
        )
        return client

    def update(self, instance, validated_data):
        if 'user' in validated_data:
            user_data = validated_data.pop('user')
            user = instance.user
            user.first_name = user_data.get('first_name', user.first_name)
            user.last_name = user_data.get('last_name', user.last_name)
            user.email = user_data.get('email', user.email)
            user.phone = user_data.get('phone', user.phone)
            user.save()
            
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        return instance

from django.test import TestCase
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.utils import timezone
from core.models import Tenant
from users.models import Role, StaffProfile
from .models import Client
import uuid

User = get_user_model()

class ClientModelTest(TestCase):
    def setUp(self):
        self.tenant1 = Tenant.objects.create(name="Tenant 1")
        self.tenant2 = Tenant.objects.create(name="Tenant 2")
        
        self.user1 = User.objects.create_user(
            username="user1@example.com", 
            email="user1@example.com", 
            password="password", 
            tenant=self.tenant1
        )
        self.trainer1 = User.objects.create_user(
            username="trainer1@example.com", 
            email="trainer1@example.com", 
            password="password", 
            is_staff=True,
            tenant=self.tenant1
        )
        # Roles are needed for staff profile creation via signals
        self.trainer_role, _ = Role.objects.get_or_create(name='trainer', tenant=self.tenant1)
        self.trainer1.roles.add(self.trainer_role)
        self.trainer_profile = StaffProfile.objects.get(user=self.trainer1)

    def test_client_str(self):
        client = Client.objects.create(user=self.user1, tenant=self.tenant1)
        self.assertEqual(str(client), f"Client: {self.user1.username}")

    def test_tenant_matching_validation(self):
        # User from tenant2 cannot be a client in tenant1
        user2 = User.objects.create_user(
            username="user2@example.com", 
            email="user2@example.com", 
            password="password", 
            tenant=self.tenant2
        )
        client = Client(user=user2, tenant=self.tenant1)
        with self.assertRaises(ValidationError):
            client.full_clean()

    def test_trainer_tenant_matching_validation(self):
        # Trainer from tenant2 cannot be assigned to a client in tenant1
        trainer2 = User.objects.create_user(
            username="trainer2@example.com", 
            email="trainer2@example.com", 
            password="password", 
            tenant=self.tenant2
        )
        trainer_role2, _ = Role.objects.get_or_create(name='trainer', tenant=self.tenant2)
        trainer2.roles.add(trainer_role2)
        trainer_profile2 = StaffProfile.objects.get(user=trainer2)
        
        client = Client(user=self.user1, tenant=self.tenant1, assigned_trainer=trainer_profile2)
        with self.assertRaises(ValidationError):
            client.full_clean()

    def test_activated_at_auto_set(self):
        client = Client.objects.create(user=self.user1, tenant=self.tenant1, status=Client.StatusChoices.LEAD)
        self.assertIsNone(client.activated_at)
        
        client.status = Client.StatusChoices.ACTIVE
        client.save()
        
        self.assertIsNotNone(client.activated_at)
        self.assertLessEqual(client.activated_at, timezone.now())

class ClientAPITest(APITestCase):
    def setUp(self):
        self.tenant1 = Tenant.objects.create(name="Tenant 1")
        self.tenant2 = Tenant.objects.create(name="Tenant 2")
        
        # Owner for Tenant 1
        self.owner1 = User.objects.create_user(
            username="owner1@example.com", 
            email="owner1@example.com", 
            password="password", 
            tenant=self.tenant1
        )
        self.owner_role1, _ = Role.objects.get_or_create(name='owner', tenant=self.tenant1)
        self.owner1.roles.add(self.owner_role1)
        
        # Another user in Tenant 1
        self.user1 = User.objects.create_user(
            username="user1@example.com", 
            email="user1@example.com", 
            password="password", 
            tenant=self.tenant1
        )
        self.client1 = Client.objects.create(user=self.user1, tenant=self.tenant1)
        
        # User in Tenant 2
        self.owner2 = User.objects.create_user(
            username="owner2@example.com", 
            email="owner2@example.com", 
            password="password", 
            tenant=self.tenant2
        )
        self.owner_role2, _ = Role.objects.get_or_create(name='owner', tenant=self.tenant2)
        self.owner2.roles.add(self.owner_role2)
        
        self.user2 = User.objects.create_user(
            username="user2@example.com", 
            email="user2@example.com", 
            password="password", 
            tenant=self.tenant2
        )
        self.client2 = Client.objects.create(user=self.user2, tenant=self.tenant2)
        
        self.client_list_url = reverse('client-list')

    def test_list_clients_tenant_isolation(self):
        self.client.force_authenticate(user=self.owner1)
        response = self.client.get(self.client_list_url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # owner1 should only see client1, not client2
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['user']['email'], self.user1.email)

    def test_create_client_success(self):
        self.client.force_authenticate(user=self.owner1)
        data = {
            "user": {
                "first_name": "New",
                "last_name": "Client",
                "email": "newclient@example.com",
                "phone": "1234567890"
            },
            "status": "active",
            "goal": "fat_loss"
        }
        response = self.client.post(self.client_list_url, data, format='json')
        
        # Note: If this fails due to missing 'health_conditions' field in model, it's a bug in the code.
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        # Verify user creation
        new_user = User.objects.get(email="newclient@example.com")
        self.assertEqual(new_user.tenant, self.tenant1)
        self.assertTrue(new_user.has_role('client'))
        
        # Verify client creation
        new_client = Client.objects.get(user=new_user)
        self.assertEqual(new_client.status, Client.StatusChoices.ACTIVE)
        self.assertIsNotNone(new_client.activated_at)

    def test_unauthenticated_access_denied(self):
        response = self.client.get(self.client_list_url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

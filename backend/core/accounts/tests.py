from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status

from core.accounts.models import User
from core.tenants.models import Organization, OrganizationMember
from core.tenants.services import create_tenant


class AuthTests(TestCase):
    def setUp(self):
        self.client = APIClient()

    def test_registration(self):
        url = '/api/auth/registration/'
        data = {
            'username': 'testuser',
            'email': 'test@example.com',
            'password1': 'testpassword123!',
            'password2': 'testpassword123!',
        }
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn('access', response.data)

    def test_login(self):
        user = User.objects.create_user(
            username='loginuser',
            password='loginpass123!',
            email='loginuser@example.com',
        )
        url = '/api/auth/login/'
        data = {'username': 'loginuser', 'password': 'loginpass123!'}
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access', response.data)

    def test_forgot_password(self):
        url = '/api/auth/password/reset/'
        data = {'email': 'test@example.com'}
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)


class CreateTenantServiceTests(TestCase):
    def test_create_tenant_sets_owner_membership(self):
        user = User.objects.create_user(username='owner', email='owner@test.com', password='pass123!')
        tenant = create_tenant(user=user, name='Test Gym')

        self.assertIsNotNone(tenant.pk)
        self.assertTrue(Organization.objects.filter(pk=tenant.pk).exists())

        membership = OrganizationMember.objects.get(user=user, tenant=tenant)
        self.assertTrue(membership.is_owner)
        self.assertEqual(membership.role.name, 'owner')

    def test_has_role_owner(self):
        user = User.objects.create_user(username='owner2', email='owner2@test.com', password='pass123!')
        tenant = create_tenant(user=user, name='Gym 2')
        self.assertTrue(user.has_role(tenant, 'owner'))

    def test_is_tenant_owner(self):
        user = User.objects.create_user(username='owner3', email='owner3@test.com', password='pass123!')
        tenant = create_tenant(user=user, name='Gym 3')
        self.assertTrue(user.is_tenant_owner(tenant))

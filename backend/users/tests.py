from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status
from .models import User
from core.models import Tenant

class AuthTests(TestCase):
    def setUp(self):
        self.client = APIClient()

    def test_registration(self):
        url = '/api/auth/registration/'
        data = {
            'username': 'testuser',
            'email': 'test@example.com',
            'password': 'testpassword123',
            'password1': 'testpassword123',
            'password2': 'testpassword123',
            'tenant_name': 'Test Corp'
        }
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn('access', response.data)
        self.assertEqual(User.objects.count(), 1)
        self.assertEqual(Tenant.objects.count(), 1)
        
        user = User.objects.first()
        self.assertEqual(user.username, 'testuser')
        self.assertEqual(user.tenant.name, 'Test Corp')
        # Check roles using the new dynamic system
        self.assertTrue(user.has_role('owner'))

    def test_login(self):
        # Create a user first
        tenant = Tenant.objects.create(name='Login Corp')
        user = User.objects.create_user(username='loginuser', password='loginpass123', email='loginuser@example.com', tenant=tenant)
        
        url = '/api/auth/login/'
        data = {
            'username': 'loginuser',
            'password': 'loginpass123'
        }
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access', response.data)

    def test_forgot_password(self):
        url = '/api/auth/password/reset/'
        data = {'email': 'test@example.com'}
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

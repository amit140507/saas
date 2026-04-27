from django.test import TestCase
from django.utils import timezone
from django.db import IntegrityError
from core.models import Tenant
from users.models import User
from clients.models import Client
from .models import CheckInPlan, DailyLog

class CheckInTests(TestCase):
    def setUp(self):
        # Create a tenant
        self.tenant = Tenant.objects.create(name="Test Gym")
        
        # Create a user
        self.user = User.objects.create_user(
            username="testclient", 
            password="testpassword123",
            tenant=self.tenant
        )
        
        # Create a client profile for the user
        self.client_profile = Client.objects.create(
            user=self.user, 
            tenant=self.tenant,
            status=Client.StatusChoices.ACTIVE
        )

    def test_checkin_plan_creation(self):
        """Test that we can create a CheckInPlan and its __str__ is correct."""
        plan = CheckInPlan.objects.create(
            tenant=self.tenant,
            client=self.client_profile,
            start_date=timezone.now().date(),
            duration_weeks=12
        )
        self.assertEqual(plan.duration_weeks, 12)
        self.assertEqual(plan.client, self.client_profile)
        # Verify __str__ method
        self.assertIn("testclient", str(plan))

    def test_daily_log_creation(self):
        """Test that we can create a DailyLog and its __str__ is correct."""
        plan = CheckInPlan.objects.create(
            tenant=self.tenant,
            client=self.client_profile,
            start_date=timezone.now().date()
        )
        
        today = timezone.now().date()
        log = DailyLog.objects.create(
            tenant=self.tenant,
            plan=plan,
            week_number=1,
            day_of_week=0,  # Sunday
            date=today,
            weight=82.5,
            steps=12000,
            sleep_duration=7.5,
            session_completed=True
        )
        
        self.assertEqual(log.weight, 82.5)
        self.assertEqual(log.steps, 12000)
        self.assertTrue(log.session_completed)
        self.assertIn("W1 D0", str(log))

    def test_daily_log_unique_constraint(self):
        """Test the unique_together constraint for DailyLog (plan, week, day)."""
        plan = CheckInPlan.objects.create(
            tenant=self.tenant,
            client=self.client_profile,
            start_date=timezone.now().date()
        )
        
        today = timezone.now().date()
        # Create first log
        DailyLog.objects.create(
            tenant=self.tenant,
            plan=plan,
            week_number=1,
            day_of_week=0,
            date=today
        )
        
        # Attempting to create another log for the same plan, week, and day should fail
        with self.assertRaises(IntegrityError):
            DailyLog.objects.create(
                tenant=self.tenant,
                plan=plan,
                week_number=1,
                day_of_week=0,
                date=today
            )

    def test_daily_log_ordering(self):
        """Test that DailyLogs are ordered by week_number and day_of_week."""
        plan = CheckInPlan.objects.create(
            tenant=self.tenant,
            client=self.client_profile,
            start_date=timezone.now().date()
        )
        
        today = timezone.now().date()
        # Create logs in non-sequential order
        DailyLog.objects.create(tenant=self.tenant, plan=plan, week_number=1, day_of_week=1, date=today)
        DailyLog.objects.create(tenant=self.tenant, plan=plan, week_number=2, day_of_week=0, date=today)
        DailyLog.objects.create(tenant=self.tenant, plan=plan, week_number=1, day_of_week=0, date=today)
        
        logs = DailyLog.objects.filter(plan=plan)
        self.assertEqual(logs[0].week_number, 1)
        self.assertEqual(logs[0].day_of_week, 0)
        self.assertEqual(logs[1].week_number, 1)
        self.assertEqual(logs[1].day_of_week, 1)
        self.assertEqual(logs[2].week_number, 2)
        self.assertEqual(logs[2].day_of_week, 0)

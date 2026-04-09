import os
import django
from django.utils import timezone

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'saas_backend.settings')
django.setup()

from measurement.models import Measurement, MeasurementGoal
from users.models import User
from core.models import Tenant
from communications.models import WhatsAppLog, WhatsAppTemplate, EmailTemplate

def run_test():
    user = User.objects.get(username='test_wa_user')
    tenant = Tenant.objects.first()
    
    # Ensure templates exist
    WhatsAppTemplate.objects.get_or_create(tenant=tenant, name='goal_achieved', defaults={'category': 'UTILITY', 'language': 'en_US'})
    EmailTemplate.objects.get_or_create(tenant=tenant, name='Goal Achieved', defaults={'subject': 'Goal Achieved!', 'html_body': '<h1>Congrats!</h1>'})
    
    # Clean up old data if necessary
    MeasurementGoal.objects.filter(user=user).delete()
    Measurement.objects.filter(user=user).delete()
    WhatsAppLog.objects.filter(recipient=user).delete()

    goal = MeasurementGoal.objects.create(
        user=user, 
        tenant=tenant, 
        metric='weight', 
        target_value=70.0, 
        current_value=75.0
    )
    print(f"Goal created: {goal.metric} target {goal.target_value}")

    m1 = Measurement.objects.create(
        user=user, 
        tenant=tenant, 
        date=timezone.now().date(), 
        weight=74.0
    )
    goal.refresh_from_db()
    print(f"Measurement 1 (74.0): Goal achieved: {goal.is_achieved}")

    m2 = Measurement.objects.create(
        user=user, 
        tenant=tenant, 
        date=timezone.now().date(), 
        weight=69.0
    )
    goal.refresh_from_db()
    print(f"Measurement 2 (69.0): Goal achieved: {goal.is_achieved}")

    logs = WhatsAppLog.objects.filter(recipient=user)
    print(f"WhatsApp logs count: {logs.count()}")
    for log in logs:
        print(f"Log: {log.status} - {log.error_message}")

if __name__ == "__main__":
    run_test()

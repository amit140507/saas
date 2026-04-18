import os
import django
from django.utils import timezone
from datetime import timedelta

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from billing.models import Subscription, Product
from users.models import User
from core.models import Tenant
from followups.models import FollowUp
from communications.models import WhatsAppLog, WhatsAppTemplate
from django.core.management import call_command

def run_test():
    user = User.objects.get(username='test_wa_user')
    tenant = Tenant.objects.first()
    product = Product.objects.filter(tenant=tenant).first()
    
    # Clean up
    FollowUp.objects.filter(user=user).delete()
    Subscription.objects.filter(user=user).delete()
    WhatsAppLog.objects.filter(recipient=user).delete()
    
    # Create an expiring subscription (3 days from now)
    expiry = timezone.now() + timedelta(days=3)
    sub = Subscription.objects.create(
        user=user,
        tenant=tenant,
        product=product,
        start_date=timezone.now(),
        end_date=expiry,
        status=Subscription.Status.ACTIVE
    )
    print(f"Subscription created for {user.username} expiring on {expiry.date()}")
    
    # Ensure WhatsApp template for 3-day reminder exists
    WhatsAppTemplate.objects.get_or_create(
        tenant=tenant, 
        name='renewal_reminder_3_day', 
        defaults={'category': 'UTILITY', 'language': 'en_US'}
    )
    
    # Run the management command
    print("Running process_followups command...")
    call_command('process_followups')
    
    # Check for FollowUp record
    followup = FollowUp.objects.filter(user=user, followup_type=FollowUp.Type.RENEWAL_3_DAY).first()
    if followup:
        print(f"Follow-up record created: Type={followup.followup_type}, Status={followup.status}")
    else:
        print("Error: No Follow-up record created.")
        
    # Check for WhatsApp log
    log = WhatsAppLog.objects.filter(recipient=user).first()
    if log:
        print(f"WhatsApp log found: Status={log.status}, Error={log.error_message}")
    else:
        print("Error: No WhatsApp log found.")

if __name__ == "__main__":
    run_test()

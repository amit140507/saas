from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta
from billing.models import Subscription
from followups.models import FollowUp
from communications.services import send_whatsapp_message, send_transactional_email
from communications.models import WhatsAppTemplate, EmailTemplate

class Command(BaseCommand):
    help = 'Generates and processes renewal follow-ups for expiring subscriptions'

    def handle(self, *args, **options):
        self.generate_followups()
        self.process_pending_followups()

    def generate_followups(self):
        self.stdout.write("Generating follow-ups...")
        today = timezone.now().date()
        
        # Scenarios: 7 days before, 3 days before, day of expiry
        intervals = [
            (7, FollowUp.Type.RENEWAL_7_DAY),
            (3, FollowUp.Type.RENEWAL_3_DAY),
            (0, FollowUp.Type.EXPIRY_DAY),
        ]

        active_subs = Subscription.objects.filter(status=Subscription.Status.ACTIVE, end_date__isnull=False)
        
        for sub in active_subs:
            expiry_date = sub.end_date.date()
            
            for days, followup_type in intervals:
                target_date = expiry_date - timedelta(days=days)
                
                # Only generate if the target date is in the future or today
                if target_date >= today:
                    FollowUp.objects.get_or_create(
                        tenant=sub.tenant,
                        subscription=sub,
                        followup_type=followup_type,
                        defaults={
                            'user': sub.user,
                            'scheduled_date': target_date,
                            'status': FollowUp.Status.PENDING
                        }
                    )

    def process_pending_followups(self):
        self.stdout.write("Processing pending follow-ups...")
        today = timezone.now().date()
        pending = FollowUp.objects.filter(status=FollowUp.Status.PENDING, scheduled_date__lte=today)
        
        for followup in pending:
            self.stdout.write(f"Following up with {followup.user.username} for {followup.followup_type}")
            success = self.send_notification(followup)
            if success:
                followup.status = FollowUp.Status.COMPLETED
                followup.save()

    def send_notification(self, followup):
        user = followup.user
        sub = followup.subscription
        
        # Mapping followup types to templates
        template_name_map = {
            FollowUp.Type.RENEWAL_7_DAY: 'renewal_reminder_7_day',
            FollowUp.Type.RENEWAL_3_DAY: 'renewal_reminder_3_day',
            FollowUp.Type.EXPIRY_DAY: 'expiry_day_reminder',
        }
        
        template_name = template_name_map.get(followup.followup_type)
        if not template_name:
            return False

        # Try WhatsApp
        wa_template = WhatsAppTemplate.objects.filter(name=template_name, is_active=True).first()
        if wa_template:
            components = [
                {
                    "type": "body",
                    "parameters": [
                        {"type": "text", "text": user.username},
                        {"type": "text", "text": sub.product.name},
                        {"type": "text", "text": sub.end_date.strftime('%Y-%m-%d')}
                    ]
                }
            ]
            send_whatsapp_message(user, wa_template, components=components)
            return True # Consider it success if we attempted WhatsApp

        # Try Email if WhatsApp template is missing
        email_template = EmailTemplate.objects.filter(name=template_name.replace('_', ' ').title(), is_active=True).first()
        if email_template:
            send_transactional_email(user, email_template)
            return True

        return False

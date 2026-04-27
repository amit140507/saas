from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import Measurement
from communications.services import send_whatsapp_message, send_transactional_email
from communications.models import EmailTemplate, WhatsAppTemplate
from django.utils import timezone


def send_goal_notification(user, goal):
    # Try to send WhatsApp if template exists
    wa_template = WhatsAppTemplate.objects.filter(name='goal_achieved', is_active=True).first()
    if wa_template:
        components = [
            {
                "type": "body",
                "parameters": [
                    {"type": "text", "text": user.username},
                    {"type": "text", "text": goal.get_metric_display()},
                    {"type": "text", "text": str(goal.target_value)}
                ]
            }
        ]
        send_whatsapp_message(user, wa_template, components=components)

    # Also try Email
    email_template = EmailTemplate.objects.filter(name='Goal Achieved', is_active=True).first()
    if email_template:
        send_transactional_email(user, email_template)

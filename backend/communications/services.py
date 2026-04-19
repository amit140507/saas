import requests
from django.core.mail import send_mail
from django.conf import settings
from .models import EmailLog, WhatsAppLog

def send_transactional_email(user, template, context=None):
    # ... (existing code)
    rendered_subject = template.subject
    rendered_html = template.html_body
    
    try:
        # Uses Django's configured Email backend
        send_mail(
            subject=rendered_subject,
            message=template.text_body or "Please view in HTML-compatible client.",
            html_message=rendered_html,
            from_email=getattr(settings, 'DEFAULT_FROM_EMAIL', 'noreply@yourgym.com'),
            recipient_list=[user.email],
            fail_silently=False,
        )
        
        # Log success
        EmailLog.objects.create(
            tenant=template.tenant,
            recipient=user,
            recipient_email=user.email,
            subject=rendered_subject,
            status=EmailLog.Status.SUCCESS
        )
        return True
        
    except Exception as e:
        # Log failure
        EmailLog.objects.create(
            tenant=template.tenant,
            recipient=user,
            recipient_email=user.email,
            subject=rendered_subject,
            status=EmailLog.Status.FAILED,
            error_message=str(e)
        )
        return False

def send_whatsapp_message(user, template, components=None):
    """
    Sends a WhatsApp message using Meta's WhatsApp Cloud API.
    'components' should be a list of component objects for the template (header, body, button).
    """
    access_token = getattr(settings, 'WHATSAPP_ACCESS_TOKEN', None)
    phone_number_id = getattr(settings, 'WHATSAPP_PHONE_NUMBER_ID', None)
    version = getattr(settings, 'WHATSAPP_API_VERSION', 'v22.0')
    
    if not (access_token and phone_number_id):
        WhatsAppLog.objects.create(
            tenant=template.tenant,
            recipient=user,
            recipient_phone=user.phone if hasattr(user, 'phone') else '',
            template=template,
            status=WhatsAppLog.Status.FAILED,
            error_message="WhatsApp settings not configured properly."
        )
        return False

    url = f"https://graph.facebook.com/{version}/{phone_number_id}/messages"
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json",
    }
    
    # User phone number might need formatting (removing +, etc.)
    recipient_phone = user.phone if hasattr(user, 'phone') else ''
    if recipient_phone.startswith('+'):
        recipient_phone = recipient_phone[1:]

    payload = {
        "messaging_product": "whatsapp",
        "to": recipient_phone,
        "type": "template",
        "template": {
            "name": template.name,
            "language": {
                "code": template.language
            }
        }
    }
    
    if components:
        payload["template"]["components"] = components

    try:
        response = requests.post(url, headers=headers, json=payload)
        response_data = response.json()
        
        if response.status_code == 200:
            WhatsAppLog.objects.create(
                tenant=template.tenant,
                recipient=user,
                recipient_phone=recipient_phone,
                template=template,
                message_id=response_data.get('messages', [{}])[0].get('id', ''),
                status=WhatsAppLog.Status.SUCCESS
            )
            return True
        else:
            WhatsAppLog.objects.create(
                tenant=template.tenant,
                recipient=user,
                recipient_phone=recipient_phone,
                template=template,
                status=WhatsAppLog.Status.FAILED,
                error_message=f"Meta API Error: {response_data.get('error', {}).get('message', 'Unknown error')}"
            )
            return False
            
    except Exception as e:
        WhatsAppLog.objects.create(
            tenant=template.tenant,
            recipient=user,
            recipient_phone=recipient_phone,
            template=template,
            status=WhatsAppLog.Status.FAILED,
            error_message=str(e)
        )
        return False

class CommunicationService:
    @staticmethod
    def launch_promo(promo):
        """
        Business logic to launch a promotional campaign.
        """
        if promo.status == 'draft':
            promo.status = 'scheduled'
            promo.save(update_fields=['status'])
            # Here we would enqueue a Celery task to process the promo
            pass
        return promo

    @staticmethod
    def queue_notification(notification_data):
        """
        Logic to queue a new notification.
        """
        pass

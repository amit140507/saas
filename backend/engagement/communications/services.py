import requests
from django.core.mail import send_mail
from django.conf import settings
from django.utils import timezone
from .models import EmailLog, MessageTemplate, WhatsAppLog


def render_template_text(value, context=None):
    rendered = value or ''
    for key, replacement in (context or {}).items():
        rendered = rendered.replace('{{' + str(key) + '}}', str(replacement))
        rendered = rendered.replace('{{ ' + str(key) + ' }}', str(replacement))
    return rendered

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
            status=EmailLog.StatusChoices.SENT,
            sent_at=timezone.now(),
        )
        return True
        
    except Exception as e:
        # Log failure
        EmailLog.objects.create(
            tenant=template.tenant,
            recipient=user,
            recipient_email=user.email,
            subject=rendered_subject,
            status=EmailLog.StatusChoices.FAILED,
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
            status='failed',
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
                status='success'
            )
            return True
        else:
            WhatsAppLog.objects.create(
                tenant=template.tenant,
                recipient=user,
                recipient_phone=recipient_phone,
                template=template,
                status='failed',
                error_message=f"Meta API Error: {response_data.get('error', {}).get('message', 'Unknown error')}"
            )
            return False
            
    except Exception as e:
        WhatsAppLog.objects.create(
            tenant=template.tenant,
            recipient=user,
            recipient_phone=recipient_phone,
            template=template,
            status='failed',
            error_message=str(e)
        )
        return False

class CommunicationService:
    @staticmethod
    def send_message_template(template: MessageTemplate, client, context=None):
        context_data = dict(context or {})
        user = client.user
        context_data.setdefault('client_name', user.get_full_name() or user.email or user.username)
        context_data.setdefault('client_email', user.email)
        context_data.setdefault('client_phone', client.phone or '')

        if template.channel == MessageTemplate.ChannelChoices.EMAIL:
            subject = render_template_text(template.subject or template.name, context_data)
            body = render_template_text(template.body, context_data)
            try:
                send_mail(
                    subject=subject,
                    message=body,
                    html_message=body,
                    from_email=getattr(settings, 'DEFAULT_FROM_EMAIL', 'noreply@yourgym.com'),
                    recipient_list=[user.email],
                    fail_silently=False,
                )
                EmailLog.objects.create(
                    tenant=template.tenant,
                    recipient=user,
                    recipient_email=user.email,
                    subject=subject,
                    template_name=template.name,
                    context_data=context_data,
                    status=EmailLog.StatusChoices.SENT,
                    sent_at=timezone.now(),
                    related_object_type='MessageTemplate',
                    related_object_id=str(template.id),
                )
                return True, 'Email sent successfully.'
            except Exception as exc:
                EmailLog.objects.create(
                    tenant=template.tenant,
                    recipient=user,
                    recipient_email=user.email,
                    subject=subject,
                    template_name=template.name,
                    context_data=context_data,
                    status=EmailLog.StatusChoices.FAILED,
                    error_message=str(exc),
                    related_object_type='MessageTemplate',
                    related_object_id=str(template.id),
                )
                return False, str(exc)

        if template.channel == MessageTemplate.ChannelChoices.WHATSAPP:
            access_token = getattr(settings, 'WHATSAPP_ACCESS_TOKEN', None)
            phone_number_id = getattr(settings, 'WHATSAPP_PHONE_NUMBER_ID', None)
            version = getattr(settings, 'WHATSAPP_API_VERSION', 'v22.0')
            recipient_phone = (client.phone or '').strip()

            if recipient_phone.startswith('+'):
                recipient_phone = recipient_phone[1:]

            if not (access_token and phone_number_id and recipient_phone):
                WhatsAppLog.objects.create(
                    tenant=template.tenant,
                    recipient=user,
                    recipient_phone=recipient_phone,
                    template=None,
                    status='failed',
                    error_message='WhatsApp settings or recipient phone are missing.',
                )
                return False, 'WhatsApp settings or recipient phone are missing.'

            payload = {
                'messaging_product': 'whatsapp',
                'to': recipient_phone,
                'type': 'template',
                'template': {
                    'name': template.name,
                    'language': {'code': context_data.get('language', 'en_US')},
                },
            }

            try:
                response = requests.post(
                    f'https://graph.facebook.com/{version}/{phone_number_id}/messages',
                    headers={
                        'Authorization': f'Bearer {access_token}',
                        'Content-Type': 'application/json',
                    },
                    json=payload,
                    timeout=15,
                )
                response_data = response.json()
                if response.status_code == 200:
                    WhatsAppLog.objects.create(
                        tenant=template.tenant,
                        recipient=user,
                        recipient_phone=recipient_phone,
                        template=None,
                        message_id=response_data.get('messages', [{}])[0].get('id', ''),
                        status='success',
                    )
                    return True, 'WhatsApp sent successfully.'

                error_message = response_data.get('error', {}).get('message', 'Unknown WhatsApp API error')
                WhatsAppLog.objects.create(
                    tenant=template.tenant,
                    recipient=user,
                    recipient_phone=recipient_phone,
                    template=None,
                    status='failed',
                    error_message=error_message,
                )
                return False, error_message
            except Exception as exc:
                WhatsAppLog.objects.create(
                    tenant=template.tenant,
                    recipient=user,
                    recipient_phone=recipient_phone,
                    template=None,
                    status='failed',
                    error_message=str(exc),
                )
                return False, str(exc)

        return False, f'{template.channel} is not supported for test sends.'

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

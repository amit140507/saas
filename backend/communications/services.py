from django.core.mail import send_mail
from django.conf import settings
from .models import EmailLog

def send_transactional_email(user, template, context=None):
    """
    Simulates parsing the template with context and sending the email.
    """
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

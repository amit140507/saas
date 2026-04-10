from rest_framework import viewsets, permissions
from django.core.mail import send_mail
from django.conf import settings
from .models import SupportTicket
from .serializers import SupportTicketSerializer

class SupportTicketViewSet(viewsets.ModelViewSet):
    queryset = SupportTicket.objects.all()
    serializer_class = SupportTicketSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return self.queryset.filter(user=self.request.user)

    def perform_create(self, serializer):
        ticket = serializer.save()
        
        # Send email to admin
        subject = f"New Support Ticket: {ticket.get_topic_display()}"
        message = (
            f"User: {ticket.user.email}\n"
            f"Topic: {ticket.get_topic_display()}\n\n"
            f"Description:\n{ticket.description}"
        )
        admin_email = getattr(settings, 'SUPPORT_ADMIN_EMAIL', settings.DEFAULT_FROM_EMAIL)
        
        try:
            send_mail(
                subject,
                message,
                settings.DEFAULT_FROM_EMAIL,
                [admin_email],
                fail_silently=False,
            )
        except Exception as e:
            # log error or handle it as needed
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Failed to send support email: {e}")

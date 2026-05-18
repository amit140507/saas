from rest_framework import viewsets, permissions
from django.core.mail import send_mail
from django.conf import settings
from .models import SupportTicket
from .serializers import SupportTicketSerializer
from core.tenants.permissions import IsTenantMember
from core.tenants.request_context import require_request_tenant

class SupportTicketViewSet(viewsets.ModelViewSet):
    queryset = SupportTicket.objects.all()
    serializer_class = SupportTicketSerializer
    permission_classes = [permissions.IsAuthenticated, IsTenantMember]

    def get_queryset(self):
        return self.queryset.filter(
            tenant=require_request_tenant(self.request),
            raised_by=self.request.user,
        )

    def perform_create(self, serializer):
        ticket = serializer.save()
        
        # Send email to admin
        subject = f"New Support Ticket: {ticket.get_category_display()}"
        message = (
            f"User: {ticket.raised_by.email}\n"
            f"Category: {ticket.get_category_display()}\n"
            f"Subject: {ticket.subject}\n\n"
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

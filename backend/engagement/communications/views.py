from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework import serializers

from core.clients.models import ClientProfile
from .models import (
    MessageTemplate, Notification, Promo,
    EmailTemplate, EmailLog, WhatsAppTemplate, WhatsAppLog
)
from .serializers import (
    MessageTemplateSerializer, NotificationSerializer, PromoSerializer,
    EmailTemplateSerializer, EmailLogSerializer, WhatsAppTemplateSerializer, WhatsAppLogSerializer
)
from .services import CommunicationService
from core.tenants.permissions import IsTenantMember
from core.tenants.request_context import require_request_tenant

class TenantScopedViewSet(viewsets.ModelViewSet):
    """
    Base viewset that automatically scopes queries to the active request tenant.
    """
    permission_classes = [IsTenantMember]

    def get_queryset(self):
        qs = super().get_queryset()
        tenant = require_request_tenant(self.request)
        return qs.filter(tenant=tenant)

    def perform_create(self, serializer):
        serializer.save(tenant=require_request_tenant(self.request))


class MessageTemplateViewSet(TenantScopedViewSet):
    queryset = MessageTemplate.objects.all()
    serializer_class = MessageTemplateSerializer
    filterset_fields = ['channel', 'category', 'is_active']

    def perform_create(self, serializer):
        serializer.save(
            created_by=self.request.user,
            tenant=require_request_tenant(self.request),
        )

    @action(detail=True, methods=['post'], url_path='test-send')
    def test_send(self, request, pk=None):
        template = self.get_object()
        tenant = require_request_tenant(request)
        serializer = MessageTemplateTestSendSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        client = (
            ClientProfile.objects
            .filter(tenant=tenant, id=serializer.validated_data['recipient_id'])
            .select_related('org_client__user')
            .first()
        )
        if client is None:
            return Response(
                {'success': False, 'message': 'Recipient client was not found for this tenant.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        success, message = CommunicationService.send_message_template(
            template=template,
            client=client,
            context=serializer.validated_data.get('context_data') or {},
        )
        return Response(
            {'success': success, 'message': message},
            status=status.HTTP_200_OK if success else status.HTTP_400_BAD_REQUEST,
        )


class MessageTemplateTestSendSerializer(serializers.Serializer):
    recipient_id = serializers.UUIDField()
    context_data = serializers.JSONField(required=False)


class NotificationViewSet(TenantScopedViewSet):
    queryset = Notification.objects.all()
    serializer_class = NotificationSerializer
    filterset_fields = ['channel', 'status', 'recipient']


class PromoViewSet(TenantScopedViewSet):
    queryset = Promo.objects.all()
    serializer_class = PromoSerializer
    filterset_fields = ['status', 'channel', 'target_audience']

    def perform_create(self, serializer):
        serializer.save(
            created_by=self.request.user,
            tenant=require_request_tenant(self.request),
        )

    @action(detail=True, methods=['post'])
    def launch(self, request, pk=None):
        """
        Trigger the promo campaign launch via the service layer.
        """
        promo = self.get_object()
        CommunicationService.launch_promo(promo)
        return Response({"status": "Promo launching initiated."}, status=status.HTTP_200_OK)


class EmailTemplateViewSet(TenantScopedViewSet):
    queryset = EmailTemplate.objects.all()
    serializer_class = EmailTemplateSerializer
    filterset_fields = ['is_active']


class EmailLogViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Email logs should be read-only.
    """
    queryset = EmailLog.objects.all()
    serializer_class = EmailLogSerializer
    permission_classes = [IsTenantMember]
    filterset_fields = ['status', 'recipient']

    def get_queryset(self):
        qs = super().get_queryset()
        return qs.filter(tenant=require_request_tenant(self.request))


class WhatsAppTemplateViewSet(TenantScopedViewSet):
    queryset = WhatsAppTemplate.objects.all()
    serializer_class = WhatsAppTemplateSerializer
    filterset_fields = ['category', 'is_active']


class WhatsAppLogViewSet(viewsets.ReadOnlyModelViewSet):
    """
    WhatsApp logs should be read-only.
    """
    queryset = WhatsAppLog.objects.all()
    serializer_class = WhatsAppLogSerializer
    permission_classes = [IsTenantMember]
    filterset_fields = ['status', 'recipient']

    def get_queryset(self):
        qs = super().get_queryset()
        return qs.filter(tenant=require_request_tenant(self.request))

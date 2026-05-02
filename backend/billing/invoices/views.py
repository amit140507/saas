from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.core.exceptions import ValidationError

from .models import Invoice
from .serializers import InvoiceSerializer, InvoiceActionSerializer
from .services import InvoiceService

class InvoiceViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Invoices are mostly read-only via API. 
    Creation and state changes happen via business logic / services.
    """
    serializer_class = InvoiceSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Invoice.objects.filter(tenant=self.request.user.tenant_id)

    @action(detail=True, methods=['post'], url_path='generate-pdf')
    def generate_pdf(self, request, pk=None):
        invoice = self.get_object()
        try:
            updated_invoice = InvoiceService.generate_invoice_pdf(invoice)
            return Response(InvoiceSerializer(updated_invoice).data, status=status.HTTP_200_OK)
        except ValidationError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'], url_path='mark-paid')
    def mark_paid(self, request, pk=None):
        invoice = self.get_object()
        try:
            updated_invoice = InvoiceService.mark_as_paid(invoice)
            return Response(InvoiceSerializer(updated_invoice).data, status=status.HTTP_200_OK)
        except ValidationError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'])
    def void(self, request, pk=None):
        invoice = self.get_object()
        try:
            updated_invoice = InvoiceService.void_invoice(invoice)
            return Response(InvoiceSerializer(updated_invoice).data, status=status.HTTP_200_OK)
        except ValidationError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

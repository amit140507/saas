from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from django.shortcuts import get_object_or_404
from django.conf import settings
from .models import Order
from .serializers import (
    AdminOrderSerializer,
    InvoiceGenerateSerializer,
    OrderSerializer,
)


class OrderViewSet(viewsets.ModelViewSet):
    serializer_class = OrderSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        
        # Superusers can see all orders
        if user.is_superuser:
            qs = Order.objects.all()
        # Normal users need a tenant
        elif user.tenant:
            # Admins, Owners, and staff can see all orders in their tenant
            if user.has_role('admin') or user.has_role('owner') or user.is_staff:
                qs = Order.objects.filter(tenant=user.tenant)
            else:
                qs = Order.objects.filter(user=user, tenant=user.tenant)
        else:
            return Order.objects.none()
        
        # Optional status filter
        status_filter = self.request.query_params.get('status')
        if status_filter:
            qs = qs.filter(status=status_filter)
        
        # Optional search by user name
        search = self.request.query_params.get('search')
        if search:
            qs = qs.filter(
                user__first_name__icontains=search
            ) | qs.filter(
                user__last_name__icontains=search
            ) | qs.filter(
                user__email__icontains=search
            )
        
        return qs.select_related(
            'user', 'product', 'product__product', 'coupon', 'invoice'
        ).order_by('-created_at')

    def perform_create(self, serializer):
        # Automatically assign the current user and their tenant to the Order
        serializer.save(user=self.request.user, tenant=self.request.user.tenant)

    @action(detail=True, methods=['post'], url_path='skip-payment')
    def skip_payment(self, request, pk=None):
        """TEMPORARY: Skip payment and mark order as paid (for development only)."""
        order = self.get_object()
        if order.status == 'paid':
            return Response({"error": "Order is already paid."}, status=status.HTTP_400_BAD_REQUEST)
        order.status = 'paid'
        order.save(update_fields=['status'])
        return Response({"message": "Order marked as paid (payment skipped).", "order_id": order.id})

    @action(detail=False, methods=['post'], url_path='admin-create')
    def admin_create(self, request):
        """Admin endpoint to create an order on behalf of a client."""
        user = request.user
        if not user.is_superuser and not user.is_staff and not user.has_role('admin') and not user.has_role('owner'):
            return Response({"error": "Admin access required."}, status=status.HTTP_403_FORBIDDEN)

        serializer = AdminOrderSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        order = serializer.save(tenant=user.tenant)

        response_data = AdminOrderSerializer(order).data

        # If payment method is payment_link, generate the token
        if order.payment_method == 'payment_link':
            token = order.generate_payment_link_token()
            frontend_url = getattr(settings, 'FRONTEND_USER_URL', 'http://localhost:3000')
            payment_link = f"{frontend_url}/pay/{token}"
            response_data['payment_link'] = payment_link

        return Response(response_data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'], url_path='generate-invoice')
    def generate_invoice(self, request, pk=None):
        """Queue async invoice PDF generation (paid orders only)."""
        order = self.get_object()
        if order.status != Order.Status.PAID:
            return Response(
                {'error': 'Invoice can only be generated for paid orders.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        ser = InvoiceGenerateSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        from .tasks import generate_invoice_task

        generate_invoice_task.delay(order.id, force=ser.validated_data['force'])
        return Response({'queued': True, 'order_id': order.id})


class PaymentLinkCheckoutView(APIView):
    """Public endpoint for payment link checkout. No auth required — access is via token."""
    permission_classes = [permissions.AllowAny]

    def get(self, request, token):
        order = get_object_or_404(Order, payment_link_token=token)

        if order.status == 'paid':
            return Response({"error": "This order has already been paid."}, status=status.HTTP_400_BAD_REQUEST)

        return Response({
            "order_id": order.id,
            "user_name": f"{order.user.first_name} {order.user.last_name}".strip() or order.user.username,
            "product_name": f"{order.product.product.name} - {order.product.name}",
            "subtotal": str(order.subtotal),
            "discount": str(order.discount),
            "total": str(order.total),
            "status": order.status,
        })

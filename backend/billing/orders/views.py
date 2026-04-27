from django.shortcuts import get_object_or_404
from rest_framework import viewsets, permissions, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated

from payments.models import Transaction
from payments.gateway import GatewayFactory
from .models import Order
from .serializers import OrderSerializer

import logging

logger = logging.getLogger(__name__)


class OrderViewSet(viewsets.ModelViewSet):
    serializer_class = OrderSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        tenant = getattr(user, 'tenant', None)
        if not tenant:
            return Order.objects.none()

        if user.is_superuser:
            return Order.objects.all()

        if user.has_role('admin') or user.has_role('owner') or user.is_staff:
            qs = Order.objects.filter(tenant=tenant)
        elif hasattr(user, 'client_profile'):
            qs = Order.objects.filter(tenant=tenant, client=user.client_profile)
        else:
            return Order.objects.none()

        status_filter = self.request.query_params.get('status')
        if status_filter:
            qs = qs.filter(status=status_filter)

        return qs.prefetch_related('items').order_by('-created_at')

    def perform_create(self, serializer):
        serializer.save(
            tenant=self.request.user.tenant,
            created_by=self.request.user,
        )


class PaymentLinkCheckoutView(APIView):
    """
    Public view to initiate a checkout session from a shared payment link token.
    No authentication required as the token identifies the guest.
    """
    permission_classes = [AllowAny]

    def get(self, request, token):
        order = get_object_or_404(Order, payment_link_token=token)

        if order.status == Order.StatusChoices.CONFIRMED:
            return Response(
                {"error": "This order has already been paid and confirmed."},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            # 1. Fetch the correct gateway adapter based on Tenant settings
            adapter = GatewayFactory.get_adapter(order.tenant)

            # 2. Log a pending transaction in our database
            transaction = Transaction.objects.create(
                tenant=order.tenant,
                order=order,
                amount=order.total,
                status='pending'
            )

            # 3. Create the checkout session via the Provider (Razorpay, Stripe, etc.)
            checkout_data = adapter.create_checkout_session(transaction)

            # 4. Save the gateway's specific tracking ID
            transaction.gateway_transaction_id = checkout_data.get('provider_order_id', '')
            transaction.save()

            return Response(checkout_data)

        except ValueError as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            logger.error(f"Payment Link Gateway error: {str(e)}")
            return Response(
                {"error": "Payment gateway error. Please try again later."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

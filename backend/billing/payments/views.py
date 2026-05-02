from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.shortcuts import get_object_or_404
from orders.models import Order
from django.utils import timezone
from .models import Payment, Transaction, PaymentGatewayConfig
from .gateway import GatewayFactory, RazorpayAdapter, TestGatewayAdapter
from orders.services import OrderService
import logging

logger = logging.getLogger(__name__)

class CreateCheckoutSessionView(APIView):
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        order_id = request.data.get('order_id')
        if not order_id:
            return Response({"error": "order_id is required"}, status=400)
            
        # Ensure user actually owns this order
        order = get_object_or_404(Order, id=order_id, client=request.user.client)
            
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
            
            # 3. Create the checkout session via the Provider (Razorpay, BillDesk, Stripe, Test)
            checkout_data = adapter.create_checkout_session(transaction)
            
            # 4. Save the gateway's specific tracking ID
            transaction.gateway_transaction_id = checkout_data.get('provider_order_id', '')
            transaction.save()
            
            return Response(checkout_data)
            
        except ValueError as e:
            return Response({"error": str(e)}, status=400)
        except Exception as e:
            logger.error(f"Gateway error: {str(e)}")
            return Response({"error": "Payment gateway error. Please try again later."}, status=500)


class UniversalWebhookView(APIView):
    # Webhooks must be public so Razorpay/Stripe servers can ping them
    permission_classes = [AllowAny]
    
    def post(self, request):
        data = request.data
        provider_order_id = None
        adapter_class_used = None
        
        # Try to extract from known adapters
        for AdapterClass in [RazorpayAdapter, TestGatewayAdapter]:
            order_id = AdapterClass.extract_order_id(data)
            if order_id:
                provider_order_id = order_id
                adapter_class_used = AdapterClass
                break
                
        if not provider_order_id:
            return Response({"error": "Unrecognized webhook payload"}, status=400)
            
        transaction = get_object_or_404(Transaction, gateway_transaction_id=provider_order_id)
        
        try:
            # Retrieve the specific adapter configured for this Tenant
            adapter = GatewayFactory.get_adapter(transaction.tenant)
            
            # The adapter executes cryptographically secure signature verification natively
            is_valid = adapter.verify_payment(data)
            
            if is_valid:
                if transaction.status == 'successful':
                    return Response({"status": "Already processed"})  # idempotency

                transaction.status = 'successful'
                transaction.save()

                # Determine gateway payment id (e.g. razorpay_payment_id or generic)
                payment_id = data.get('razorpay_payment_id') or data.get('test_payment_id') or provider_order_id

                # ✅ Create Payment record
                Payment.objects.create(
                    tenant=transaction.tenant,
                    order=transaction.order,
                    client=transaction.order.client,
                    gateway=adapter.provider_name,
                    gateway_payment_id=payment_id,
                    gateway_order_id=provider_order_id,
                    amount=transaction.amount,
                    status=Payment.StatusChoices.SUCCESS,
                    paid_at=timezone.now(),
                    gateway_response=data
                )

                # ✅ Call business logic
                OrderService.mark_as_paid(transaction.order)
                
                return Response({"status": "Payment successfully verified"})
            else:
                transaction.status = 'failed'
                transaction.save()
                return Response({"error": "Invalid signature"}, status=400)
                
        except Exception as e:
            return Response({"error": str(e)}, status=400)

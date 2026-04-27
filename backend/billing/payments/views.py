from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.shortcuts import get_object_or_404
from orders.models import Order
from .models import Transaction, PaymentGatewayConfig
from .gateway import GatewayFactory
import logging

logger = logging.getLogger(__name__)

class CreateCheckoutSessionView(APIView):
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        order_id = request.data.get('order_id')
        if not order_id:
            return Response({"error": "order_id is required"}, status=400)
            
        # Ensure user actually owns this order
        order = get_object_or_404(Order, id=order_id, user=request.user)
        
        if order.status == 'paid':
            return Response({"error": "Order is already paid"}, status=400)
            
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
            
            # 3. Create the checkout session via the Provider (Razorpay, BillDesk, Stripe)
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
        # We look up the transaction automatically from the payload
        data = request.data
        
        razorpay_order_id = data.get('razorpay_order_id')
        
        if razorpay_order_id:
            return self.handle_razorpay(data, razorpay_order_id)
            
        return Response({"error": "Unrecognized webhook payload"}, status=400)
        
    def handle_razorpay(self, data, provider_order_id):
        transaction = get_object_or_404(Transaction, gateway_transaction_id=provider_order_id)
        
        try:
            # Retrieve the specific adapter configured for this Tenant
            adapter = GatewayFactory.get_adapter(transaction.tenant)
            
            # The adapter executes cryptographically secure signature verification natively
            is_valid = adapter.verify_payment(data)
            
            if is_valid:
                transaction.status = 'successful'
                transaction.save()
                
                # Fulfil the actual order!
                transaction.order.status = 'paid'
                transaction.order.save()
                
                return Response({"status": "Payment successfully verified"})
            else:
                transaction.status = 'failed'
                transaction.save()
                return Response({"error": "Invalid signature"}, status=400)
                
        except Exception as e:
            return Response({"error": str(e)}, status=400)

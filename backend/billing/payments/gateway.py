import razorpay
from .models import PaymentGatewayConfig

class BasePaymentAdapter:
    def __init__(self, api_key, api_secret):
        self.api_key = api_key
        self.api_secret = api_secret
        
    def create_checkout_session(self, transaction):
        raise NotImplementedError("Each adapter must implement create_checkout_session")
        
    def verify_payment(self, verification_data):
        raise NotImplementedError("Each adapter must implement verify_payment")


class RazorpayAdapter(BasePaymentAdapter):
    def __init__(self, api_key, api_secret):
        super().__init__(api_key, api_secret)
        self.client = razorpay.Client(auth=(self.api_key, self.api_secret))
        
    def create_checkout_session(self, transaction):
        """
        Contacts Razorpay servers to initiate a payment window.
        Razorpay expects amounts in paise (multiply by 100 for INR).
        """
        data = {
            "amount": int(transaction.amount * 100),
            "currency": "INR",
            "receipt": f"receipt_{transaction.id}",
            "payment_capture": 1
        }
        razorpay_order = self.client.order.create(data=data)
        return {
            "provider": "razorpay",
            "provider_order_id": razorpay_order['id'],
            "key": self.api_key,
            "amount": razorpay_order['amount'],
            "currency": razorpay_order['currency']
        }
        
    def verify_payment(self, verification_data):
        """
        Securely verifies the server ping from Razorpay using the cryptographic signature.
        Expects: razorpay_order_id, razorpay_payment_id, razorpay_signature
        """
        try:
            self.client.utility.verify_payment_signature(verification_data)
            return True
        except razorpay.errors.SignatureVerificationError:
            return False


class GatewayFactory:
    """
    Universally loads the correct Provider Adapter based strictly on what the Gym configured
    in their database settings. 
    """
    @staticmethod
    def get_adapter(tenant):
        config = PaymentGatewayConfig.objects.filter(tenant=tenant, is_active=True).first()
        if not config:
            raise ValueError(f"No active payment gateway configured for tenant {tenant.name}")
            
        if config.provider_name == 'razorpay':
            return RazorpayAdapter(config.api_key, config.api_secret)
        elif config.provider_name == 'billdesk':
            # return BillDeskAdapter(...)  # Future adapter skeleton
            pass
            
        raise ValueError(f"Unsupported gateway provider: {config.provider_name}")

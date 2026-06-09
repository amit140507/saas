import json

import razorpay
from django.conf import settings

from .models import PaymentGatewayConfig


class BasePaymentAdapter:
    provider_name = ""

    def __init__(self, *, api_key="", api_secret="", webhook_secret=""):
        self.api_key = api_key
        self.api_secret = api_secret
        self.webhook_secret = webhook_secret

    def create_order(self, intent):
        raise NotImplementedError

    def verify_webhook(self, request):
        raise NotImplementedError


class RazorpayAdapter(BasePaymentAdapter):
    provider_name = "razorpay"

    def __init__(self, *, api_key="", api_secret="", webhook_secret=""):
        super().__init__(api_key=api_key, api_secret=api_secret, webhook_secret=webhook_secret)
        self.client = razorpay.Client(auth=(self.api_key, self.api_secret))

    def create_order(self, intent):
        razorpay_order = self.client.order.create(
            data={
                "amount": int(intent.amount * 100),
                "currency": intent.currency,
                "receipt": f"intent_{intent.id}",
                "notes": {
                    "intent_id": str(intent.id),
                    "source": intent.source,
                },
            }
        )
        return {
            "gateway": self.provider_name,
            "provider_order_id": razorpay_order["id"],
            "key": self.api_key,
            "amount": razorpay_order["amount"],
            "currency": razorpay_order["currency"],
            "intent_id": str(intent.id),
        }

    def verify_webhook(self, request):
        signature = request.headers.get("X-Razorpay-Signature", "")
        raw_body = request.body.decode("utf-8")
        if not self.webhook_secret:
            raise ValueError("Razorpay webhook secret is not configured.")

        self.client.utility.verify_webhook_signature(raw_body, signature, self.webhook_secret)
        payload = json.loads(raw_body or "{}")
        event_type = payload.get("event")
        payment_entity = payload.get("payload", {}).get("payment", {}).get("entity", {})
        order_id = payment_entity.get("order_id")
        payment_id = payment_entity.get("id")

        return {
            "event_type": event_type,
            "provider_order_id": order_id,
            "provider_payment_id": payment_id,
            "status": payment_entity.get("status"),
            "amount": payment_entity.get("amount"),
            "raw_payload": payload,
        }


class TestGatewayAdapter(BasePaymentAdapter):
    provider_name = "test"

    def create_order(self, intent):
        return {
            "gateway": self.provider_name,
            "provider_order_id": f"test_order_{intent.id}",
            "key": self.api_key or "test_key",
            "amount": int(intent.amount * 100),
            "currency": intent.currency,
            "intent_id": str(intent.id),
        }

    def verify_webhook(self, request):
        payload = request.data
        if payload.get("status") != "success":
            raise ValueError("Invalid test gateway webhook payload.")
        return {
            "event_type": payload.get("event", "test.payment.success"),
            "provider_order_id": payload.get("provider_order_id"),
            "provider_payment_id": payload.get("provider_payment_id") or payload.get("provider_order_id"),
            "status": "captured",
            "amount": payload.get("amount"),
            "raw_payload": payload,
        }


class GatewayFactory:
    @staticmethod
    def _env_config(provider_name):
        if provider_name == "razorpay":
            return {
                "provider_name": "razorpay",
                "api_key": getattr(settings, "RAZORPAY_KEY_ID", ""),
                "api_secret": getattr(settings, "RAZORPAY_KEY_SECRET", ""),
                "webhook_secret": getattr(settings, "RAZORPAY_WEBHOOK_SECRET", ""),
            }
        if provider_name == "test":
            return {
                "provider_name": "test",
                "api_key": "test_key",
                "api_secret": "test_secret",
                "webhook_secret": "",
            }
        return None

    @staticmethod
    def get_gateway_config(tenant):
        config = (
            PaymentGatewayConfig.objects
            .filter(tenant=tenant, is_active=True)
            .order_by("-id")
            .first()
        )
        if config:
            return {
                "provider_name": config.provider_name,
                "api_key": config.api_key,
                "api_secret": config.api_secret,
                "webhook_secret": config.webhook_secret,
            }

        default_provider = getattr(settings, "PAYMENT_DEFAULT_GATEWAY", "").strip()
        env_config = GatewayFactory._env_config(default_provider)
        if env_config and env_config["api_key"] and env_config["api_secret"]:
            return env_config
        raise ValueError("No active payment gateway is configured.")

    @staticmethod
    def get_adapter(tenant):
        config = GatewayFactory.get_gateway_config(tenant)
        provider_name = config["provider_name"]
        if provider_name == "razorpay":
            return RazorpayAdapter(
                api_key=config["api_key"],
                api_secret=config["api_secret"],
                webhook_secret=config.get("webhook_secret", ""),
            )
        if provider_name == "test":
            return TestGatewayAdapter(
                api_key=config["api_key"],
                api_secret=config["api_secret"],
                webhook_secret=config.get("webhook_secret", ""),
            )
        raise ValueError(f"Unsupported gateway provider: {provider_name}")

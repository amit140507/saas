from rest_framework import serializers
from .models import Invoice
from billing.orders.serializers import OrderSerializer # assuming this exists or I will just serialize the ID

class InvoiceSerializer(serializers.ModelSerializer):
    # order_details = OrderSerializer(source='order', read_only=True)
    
    class Meta:
        model = Invoice
        fields = '__all__'
        read_only_fields = ('id', 'tenant', 'invoice_number', 'generated_at', 'created_at', 'updated_at', 'deleted_at', 'pdf_url', 'storage_key')

class InvoiceActionSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=Invoice.StatusChoices.choices)

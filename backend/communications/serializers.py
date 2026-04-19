from rest_framework import serializers
from .models import (
    MessageTemplate, Notification, Promo,
    EmailTemplate, EmailLog, WhatsAppTemplate, WhatsAppLog
)

class MessageTemplateSerializer(serializers.ModelSerializer):
    class Meta:
        model = MessageTemplate
        fields = '__all__'
        read_only_fields = ('id', 'created_at', 'updated_at', 'created_by', 'tenant')

class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = '__all__'
        read_only_fields = ('id', 'created_at', 'sent_at', 'read_at', 'status', 'error_message', 'external_message_id', 'tenant')

class PromoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Promo
        fields = '__all__'
        read_only_fields = ('id', 'created_at', 'sent_at', 'total_sent', 'total_delivered', 'total_opened', 'created_by', 'tenant', 'status')

class EmailTemplateSerializer(serializers.ModelSerializer):
    class Meta:
        model = EmailTemplate
        fields = '__all__'
        read_only_fields = ('id', 'tenant')

class EmailLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = EmailLog
        fields = '__all__'
        read_only_fields = ('id', 'sent_at', 'tenant')

class WhatsAppTemplateSerializer(serializers.ModelSerializer):
    class Meta:
        model = WhatsAppTemplate
        fields = '__all__'
        read_only_fields = ('id', 'tenant')

class WhatsAppLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = WhatsAppLog
        fields = '__all__'
        read_only_fields = ('id', 'sent_at', 'tenant')

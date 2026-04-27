from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    MessageTemplateViewSet, NotificationViewSet, PromoViewSet,
    EmailTemplateViewSet, EmailLogViewSet, WhatsAppTemplateViewSet, WhatsAppLogViewSet
)

router = DefaultRouter()
router.register(r'message-templates', MessageTemplateViewSet, basename='message-template')
router.register(r'notifications', NotificationViewSet, basename='notification')
router.register(r'promos', PromoViewSet, basename='promo')
router.register(r'email-templates', EmailTemplateViewSet, basename='email-template')
router.register(r'email-logs', EmailLogViewSet, basename='email-log')
router.register(r'whatsapp-templates', WhatsAppTemplateViewSet, basename='whatsapp-template')
router.register(r'whatsapp-logs', WhatsAppLogViewSet, basename='whatsapp-log')

urlpatterns = [
    path('', include(router.urls)),
]

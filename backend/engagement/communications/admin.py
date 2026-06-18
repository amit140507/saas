from django.contrib import admin
from .models import EmailLog, Notification

@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ('recipient', 'channel', 'subject', 'status', 'created_at')
    list_filter = ('channel', 'status', 'created_at')
    search_fields = ('recipient__email', 'subject', 'body')
    readonly_fields = ('created_at', 'sent_at', 'read_at')


@admin.register(EmailLog)
class EmailLogAdmin(admin.ModelAdmin):
    list_display = ('recipient_email', 'subject', 'status', 'template_name', 'created_at', 'sent_at')
    list_filter = ('status', 'template_name', 'created_at', 'sent_at')
    search_fields = ('recipient_email', 'subject', 'template_name', 'related_object_id')
    readonly_fields = ('id', 'created_at', 'sent_at')

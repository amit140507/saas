from django.contrib import admin
from .models import SupportTicket

@admin.register(SupportTicket)
class SupportTicketAdmin(admin.ModelAdmin):
    list_display = ('user', 'topic', 'status', 'created_at', 'updated_at')
    list_filter = ('status', 'topic', 'created_at')
    search_fields = ('user__email', 'description')
    readonly_fields = ('created_at', 'updated_at')

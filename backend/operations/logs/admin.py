from django.contrib import admin
from .models import AuditLog


@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display = ('timestamp', 'actor', 'action', 'resource', 'resource_id', 'tenant')
    list_filter = ('action',)
    search_fields = ('resource', 'resource_id')
    readonly_fields = ('id', 'actor', 'action', 'resource', 'resource_id', 'changes',
                       'ip_address', 'user_agent', 'extra', 'timestamp', 'tenant')

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False

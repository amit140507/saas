from django.contrib import admin
from .models import StaffProfile

@admin.register(StaffProfile)
class StaffProfileAdmin(admin.ModelAdmin):
    list_display = ('user', 'tenant', 'phone', 'specialization', 'rating', 'sex', 'date_of_joining')
    list_filter = ('tenant', 'specialization', 'sex', 'date_of_joining')
    search_fields = ('user__username', 'user__email', 'specialization')
    fieldsets = (
        (None, {'fields': ('user', 'tenant')}),
        ('Professional Info', {'fields': ('specialization', 'rating', 'bio')}),
        ('Personal Info', {'fields': ('phone', 'dob', 'sex', 'profile_picture', 'date_of_joining', 'referral_source')}),
    )

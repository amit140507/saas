from django.contrib import admin
from .models import BloodReport, BloodMarkerReading

class BloodMarkerReadingInline(admin.StackedInline):
    model = BloodMarkerReading
    extra = 1

@admin.register(BloodReport)
class BloodReportAdmin(admin.ModelAdmin):
    list_display = ('user', 'date', 'lab_name', 'has_file')
    list_filter = ('date', 'lab_name')
    search_fields = ('user__email', 'lab_name', 'notes')
    inlines = [BloodMarkerReadingInline]
    readonly_fields = ('created_at', 'updated_at')

    def has_file(self, obj):
        return obj.report_file is not None
    has_file.boolean = True
    has_file.short_description = 'Has File?'

@admin.register(BloodMarkerReading)
class BloodMarkerReadingAdmin(admin.ModelAdmin):
    list_display = ('report', 'marker_name', 'value', 'unit', 'is_normal')
    list_filter = ('is_normal', 'marker_type')
    search_fields = ('report__user__email', 'marker_name')

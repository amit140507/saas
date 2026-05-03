from django.contrib import admin
from .models import BloodReport, BloodMarker

class BloodMarkerInline(admin.StackedInline):
    model = BloodMarker
    extra = 1

@admin.register(BloodReport)
class BloodReportAdmin(admin.ModelAdmin):
    list_display = ('client', 'report_date', 'lab_name', 'has_file')
    list_filter = ('report_date', 'lab_name')
    search_fields = ('client__user__email', 'lab_name', 'notes')
    inlines = [BloodMarkerInline]
    readonly_fields = ('created_at', 'reviewed_at')

    def has_file(self, obj):
        return obj.report_file is not None
    has_file.boolean = True
    has_file.short_description = 'Has File?'

@admin.register(BloodMarker)
class BloodMarkerAdmin(admin.ModelAdmin):
    list_display = ('report', 'marker_name', 'value', 'unit', 'is_abnormal')
    list_filter = ('is_abnormal',)
    search_fields = ('report__client__user__email', 'marker_name')

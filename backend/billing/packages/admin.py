from django.contrib import admin
from .models import Package, PackageFeature, PackagePlan


class PackageFeatureInline(admin.TabularInline):
    model = PackageFeature
    extra = 1


@admin.register(Package)
class PackageAdmin(admin.ModelAdmin):
    list_display = ('name', 'max_freezes', 'is_active', 'tenant')
    list_filter = ('is_active', 'tenant')
    search_fields = ('name',)
    inlines = [PackageFeatureInline]


# @admin.register(PackagePlan)
# class PackagePlanAdmin(admin.ModelAdmin):
#     list_display = ('name', 'package', 'price', 'duration_in_days', 'tenant', 'is_active')
#     list_filter = ('is_active', 'tenant')
#     search_fields = ('name', 'package__name')


@admin.register(PackagePlan)
class PackagePlanAdmin(admin.ModelAdmin):
    list_display = ("name", "package", "price", "duration_in_days", "tenant", "is_active")
    list_filter = ("tenant", "package", "is_active")

    def formfield_for_foreignkey(self, db_field, request, **kwargs):
        if db_field.name == "package":
            tenant_id = self.get_package_plan_tenant_id(request)

            if tenant_id:
                kwargs["queryset"] = Package.objects.filter(tenant_id=tenant_id)
            else:
                kwargs["queryset"] = Package.objects.none()

        return super().formfield_for_foreignkey(db_field, request, **kwargs)

    def get_package_plan_tenant_id(self, request):
        object_id = request.resolver_match.kwargs.get("object_id")
        if object_id:
            package_plan = PackagePlan.objects.filter(pk=object_id).only("tenant_id").first()
            if package_plan:
                return package_plan.tenant_id

        return request.POST.get("tenant") or request.GET.get("tenant")

    def save_model(self, request, obj, form, change):
        if obj.package_id:
            obj.tenant = obj.package.tenant

        super().save_model(request, obj, form, change)

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import OrganizationListView, RoleViewSet, PermissionViewSet, OrganizationMemberViewSet

router = DefaultRouter()
router.register(r'roles', RoleViewSet, basename='roles')
router.register(r'permissions', PermissionViewSet, basename='permissions')
router.register(r'members', OrganizationMemberViewSet, basename='members')

urlpatterns = [
    path('', OrganizationListView.as_view(), name='organization-list'),
    path('<uuid:tenant_id>/', include(router.urls)),
]

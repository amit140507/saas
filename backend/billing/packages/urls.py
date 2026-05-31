from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import FeatureCatalogViewSet, PackageViewSet

router = DefaultRouter()
router.register(r'packages', PackageViewSet, basename='packages')
router.register(r'features', FeatureCatalogViewSet, basename='features')

urlpatterns = [
    path('', include(router.urls)),
]

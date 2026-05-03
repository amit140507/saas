from django.urls import path, include

urlpatterns = [
    path('auth/', include('authentication.urls')),
    path('organizations/', include('core.tenants.urls')),
    path('clients/', include('core.clients.urls')),
    path('staff/', include('core.staff.urls')),
    path('users/', include('core.accounts.urls')),
    path('meal/', include('meal.urls')),
]

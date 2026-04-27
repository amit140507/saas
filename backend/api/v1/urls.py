from django.urls import path, include

urlpatterns = [
    path('auth/', include('authentication.urls')),
    path('organizations/', include('core.tenants.urls')),
    path('clients/', include('core.clients.urls')),
    path('staff/', include('core.staff.urls')),
    path('users/', include('core.accounts.urls')),
    # path('orders/', include('orders.urls')),
    # path('reports/', include('reports.urls')),
    # path('payments/', include('payments.urls')),
    # path('measurement/', include('measurement.urls')),
    # path('diet-plans/', include('diet_plans.urls')),
    # path('checkins/', include('checkins.urls')),
    # path('users/', include('users.urls')),
    # path('packages/', include('packages.urls')),
    # path('support/', include('support.urls')),
    # path('communications/', include('communications.urls')),
]

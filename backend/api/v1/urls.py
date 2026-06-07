from django.urls import path, include

urlpatterns = [
    path('auth/', include('authentication.urls')),
    path('organizations/', include('core.tenants.urls')),
    path('clients/', include('core.clients.urls')),
    path('staff/', include('core.staff.urls')),
    path('users/', include('core.accounts.urls')),
    path('', include('billing.packages.urls')),
    path('', include('billing.coupons.urls')),
    path('subscriptions/', include('billing.subscriptions.urls')),
    path('meal/', include('meal.urls')),
    path('orders/', include('billing.orders.urls'))
]

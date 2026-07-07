from django.urls import path, include

urlpatterns = [
    path('', include('meal.api.urls')),
]

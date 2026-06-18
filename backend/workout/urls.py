from django.urls import include, path

urlpatterns = [
    path('', include('workout.api.urls')),
]


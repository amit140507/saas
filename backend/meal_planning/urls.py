from django.urls import path
from .views import GenerateDietPlanPDFView

urlpatterns = [
    path('generate/', GenerateDietPlanPDFView.as_view(), name='generate_diet_plan'),
]

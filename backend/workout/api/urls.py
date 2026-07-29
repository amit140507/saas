from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    ExerciseViewSet,
    MuscleViewSet,
    MuscleGroupViewSet,
    WorkoutDayViewSet,
    WorkoutExerciseViewSet,
    WorkoutPlanAssignmentViewSet,
    WorkoutPlanViewSet,
)

router = DefaultRouter()
router.register(r'plans', WorkoutPlanViewSet, basename='workoutplan')
router.register(r'assignments', WorkoutPlanAssignmentViewSet, basename='workoutplanassignment')
router.register(r'days', WorkoutDayViewSet, basename='workoutday')
router.register(r'exercises', ExerciseViewSet, basename='exercise')
router.register(r'muscle-groups', MuscleGroupViewSet, basename='musclegroup')
router.register(r'muscles', MuscleViewSet, basename='muscle')
router.register(r'workout-exercises', WorkoutExerciseViewSet, basename='workoutexercise')

urlpatterns = [
    path('', include(router.urls)),
]

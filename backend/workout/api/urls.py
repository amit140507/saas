from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    ExerciseViewSet,
    MuscleViewSet,
    MuscleGroupViewSet,
    SetLogViewSet,
    WorkoutDayViewSet,
    WorkoutExerciseViewSet,
    WorkoutLogViewSet,
    WorkoutPlanAssignmentViewSet,
    WorkoutPlanViewSet,
    WorkoutSessionViewSet,
)

router = DefaultRouter()
router.register(r'plans', WorkoutPlanViewSet, basename='workoutplan')
router.register(r'assignments', WorkoutPlanAssignmentViewSet, basename='workoutplanassignment')
router.register(r'days', WorkoutDayViewSet, basename='workoutday')
router.register(r'exercises', ExerciseViewSet, basename='exercise')
router.register(r'muscle-groups', MuscleGroupViewSet, basename='musclegroup')
router.register(r'muscles', MuscleViewSet, basename='muscle')
router.register(r'workout-exercises', WorkoutExerciseViewSet, basename='workoutexercise')
router.register(r'sessions', WorkoutSessionViewSet, basename='workoutsession')
router.register(r'logs', WorkoutLogViewSet, basename='workoutlog')
router.register(r'sets', SetLogViewSet, basename='setlog')

urlpatterns = [
    path('', include(router.urls)),
]

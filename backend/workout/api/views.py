from rest_framework import viewsets

from workout.models.planning import (
    Exercise,
    Muscle,
    MuscleGroup,
    WorkoutDay,
    WorkoutExercise,
    WorkoutPlan,
    WorkoutPlanAssignment,
)
from workout.models.tracking import SetLog, WorkoutLog, WorkoutSession
from workout.selectors import get_tenant_queryset

from .serializers import (
    ExerciseSerializer,
    MuscleSerializer,
    MuscleGroupSerializer,
    SetLogSerializer,
    WorkoutDaySerializer,
    WorkoutExerciseSerializer,
    WorkoutLogSerializer,
    WorkoutPlanAssignmentSerializer,
    WorkoutPlanSerializer,
    WorkoutSessionSerializer,
)


class TenantScopedViewSet(viewsets.ModelViewSet):
    def get_queryset(self):
        return get_tenant_queryset(self.model, self.request.tenant)


class MuscleGroupViewSet(viewsets.ModelViewSet):
    queryset = MuscleGroup.objects.all()
    serializer_class = MuscleGroupSerializer
    search_fields = ['name']


class MuscleViewSet(viewsets.ModelViewSet):
    queryset = Muscle.objects.select_related('muscle_group')
    serializer_class = MuscleSerializer
    search_fields = ['name', 'muscle_group__name']


class WorkoutPlanViewSet(TenantScopedViewSet):
    model = WorkoutPlan
    serializer_class = WorkoutPlanSerializer


class WorkoutPlanAssignmentViewSet(TenantScopedViewSet):
    model = WorkoutPlanAssignment
    serializer_class = WorkoutPlanAssignmentSerializer


class WorkoutDayViewSet(TenantScopedViewSet):
    model = WorkoutDay
    serializer_class = WorkoutDaySerializer


class ExerciseViewSet(TenantScopedViewSet):
    model = Exercise
    serializer_class = ExerciseSerializer
    search_fields = ['name']


class WorkoutExerciseViewSet(viewsets.ModelViewSet):
    serializer_class = WorkoutExerciseSerializer

    def get_queryset(self):
        return WorkoutExercise.objects.filter(workout_day__tenant=self.request.tenant)


class WorkoutSessionViewSet(TenantScopedViewSet):
    model = WorkoutSession
    serializer_class = WorkoutSessionSerializer


class WorkoutLogViewSet(TenantScopedViewSet):
    model = WorkoutLog
    serializer_class = WorkoutLogSerializer


class SetLogViewSet(TenantScopedViewSet):
    model = SetLog
    serializer_class = SetLogSerializer

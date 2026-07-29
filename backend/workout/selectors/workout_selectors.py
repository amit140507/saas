from workout.models import WorkoutPlanAssignment


def get_tenant_queryset(model, tenant):
    return model.objects.filter(tenant=tenant)


def get_workout_plan_assignments(tenant, client=None, status=None):
    queryset = WorkoutPlanAssignment.objects.filter(tenant=tenant)
    if client is not None:
        queryset = queryset.filter(client=client)
    if status:
        queryset = queryset.filter(status=status)
    return queryset

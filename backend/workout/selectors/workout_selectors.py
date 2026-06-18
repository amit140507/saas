from workout.models import WorkoutPlanAssignment, WorkoutSession


def get_tenant_queryset(model, tenant):
    return model.objects.filter(tenant=tenant)


def get_workout_plan_assignments(tenant, client=None, status=None):
    queryset = WorkoutPlanAssignment.objects.filter(tenant=tenant)
    if client is not None:
        queryset = queryset.filter(client=client)
    if status:
        queryset = queryset.filter(status=status)
    return queryset


def get_client_workout_sessions(tenant, client, start_date=None, end_date=None):
    queryset = WorkoutSession.objects.filter(tenant=tenant, client=client)
    if start_date:
        queryset = queryset.filter(session_date__gte=start_date)
    if end_date:
        queryset = queryset.filter(session_date__lte=end_date)
    return queryset


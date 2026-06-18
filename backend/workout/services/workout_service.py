from django.db import transaction

from workout.models import (
    Exercise,
    ExerciseMedia,
    ExerciseMuscle,
    SetLog,
    WorkoutLog,
    WorkoutPlanAssignment,
    WorkoutSession,
)


def _normalize_muscle_links(primary_muscle, muscle_links=None):
    normalized = []
    seen = set()

    if primary_muscle:
        normalized.append({'muscle': primary_muscle, 'is_primary': True})
        seen.add(primary_muscle.pk)

    for link in muscle_links or []:
        muscle = link.get('muscle')
        if not muscle or muscle.pk in seen:
            continue

        normalized.append({
            'muscle': muscle,
            'is_primary': bool(link.get('is_primary', False)),
        })
        seen.add(muscle.pk)

    return normalized


def _sync_exercise_relations(exercise, *, muscle_links=None, media_items=None):
    if muscle_links is not None:
        exercise.muscles.all().delete()
        ExerciseMuscle.objects.bulk_create([
            ExerciseMuscle(
                exercise=exercise,
                muscle=link['muscle'],
                is_primary=link['is_primary'],
            )
            for link in _normalize_muscle_links(exercise.primary_muscle, muscle_links)
        ])

    if media_items is not None:
        exercise.media.all().delete()
        ExerciseMedia.objects.bulk_create([
            ExerciseMedia(exercise=exercise, youtube_url=item['youtube_url'])
            for item in media_items
            if item.get('youtube_url')
        ])


@transaction.atomic
def save_exercise(*, instance=None, muscle_links=None, media_items=None, **exercise_data):
    if instance is None:
        exercise = Exercise.objects.create(**exercise_data)
        relation_links = muscle_links if muscle_links is not None else []
        relation_media = media_items if media_items is not None else []
    else:
        exercise = instance
        for field, value in exercise_data.items():
            setattr(exercise, field, value)
        exercise.save()
        relation_links = muscle_links
        relation_media = media_items

    _sync_exercise_relations(
        exercise,
        muscle_links=relation_links,
        media_items=relation_media,
    )
    return exercise


@transaction.atomic
def assign_workout_plan(*, tenant, client, plan, assigned_by, start_date, end_date=None, notes=None):
    return WorkoutPlanAssignment.objects.create(
        tenant=tenant,
        client=client,
        plan=plan,
        assigned_by=assigned_by,
        start_date=start_date,
        end_date=end_date,
        notes=notes,
    )


@transaction.atomic
def create_workout_session(
    *,
    tenant,
    client,
    session_date,
    plan_assignment=None,
    workout_day=None,
):
    return WorkoutSession.objects.create(
        tenant=tenant,
        client=client,
        session_date=session_date,
        plan_assignment=plan_assignment,
        workout_day=workout_day,
    )


@transaction.atomic
def record_set_log(
    *,
    tenant,
    workout_log,
    set_number,
    reps,
    weight,
    rest_sec,
    is_pr=False,
):
    return SetLog.objects.create(
        tenant=tenant,
        workout_log=workout_log,
        set_number=set_number,
        reps=reps,
        weight=weight,
        rest_sec=rest_sec,
        is_pr=is_pr,
    )


@transaction.atomic
def create_workout_log(
    *,
    tenant,
    session,
    exercise,
    plan_exercise=None,
    planned_sets=None,
    planned_reps=None,
    planned_weight=None,
    notes='',
):
    return WorkoutLog.objects.create(
        tenant=tenant,
        session=session,
        exercise=exercise,
        plan_exercise=plan_exercise,
        planned_sets=planned_sets,
        planned_reps=planned_reps,
        planned_weight=planned_weight,
        notes=notes,
    )

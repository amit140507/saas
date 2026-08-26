from datetime import timedelta

from django.db import transaction
from django.utils import timezone

from workout.models import (
    Exercise,
    ExerciseMedia,
    ExerciseMuscle,
    WorkoutDay,
    WorkoutExercise,
    WorkoutPlanAssignment,
)


def _normalize_muscle_links(primary_muscle, muscle_links=None):
    normalized = []

    if primary_muscle:
        normalized.append({'muscle': primary_muscle, 'is_primary': True})

    for link in muscle_links or []:
        muscle = link.get('muscle')
        if not muscle:
            continue

        normalized.append({
            'muscle': muscle,
            'is_primary': bool(link.get('is_primary', False)),
        })

    return normalized


def _sync_exercise_relations(exercise, *, muscle_links=None, media_items=None):
    if muscle_links is not None:
        exercise.muscles.all().delete()
        ExerciseMuscle.objects.bulk_create([
            ExerciseMuscle(
                exercise=exercise,
                muscle=link['muscle'],
                sequence=sequence,
                is_primary=link['is_primary'],
            )
            for sequence, link in enumerate(
                _normalize_muscle_links(exercise.primary_muscle, muscle_links),
                start=1,
            )
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
def assign_workout_plan(*, tenant, client, plan, assigned_by, start_date, end_date=None, status=None, notes=None):
    assignment = WorkoutPlanAssignment.objects.create(
        tenant=tenant,
        client=client,
        plan=plan,
        assigned_by=assigned_by,
        start_date=start_date,
        end_date=end_date,
        status=status or WorkoutPlanAssignment.StatusChoices.ACTIVE,
        notes=notes,
    )
    snapshot_workout_plan_for_assignment(assignment)
    return assignment


def snapshot_workout_plan_for_assignment(assignment):
    """
    Copy the current reusable plan template into the client assignment.
    Existing assignment days are replaced so a new assignment has one immutable
    client-facing snapshot, independent from future template edits.
    """
    assignment.workout_days.all().delete()

    template_days = assignment.plan.template_days.prefetch_related('exercises__exercise').all()
    day_pairs = []

    for template_day in template_days:
        assignment_day = WorkoutDay.objects.create(
            tenant=assignment.tenant,
            plan_assignment=assignment,
            name=template_day.name,
            day_number=template_day.day_number,
            day_type=template_day.day_type,
            notes=template_day.notes,
        )
        day_pairs.append((template_day, assignment_day))

    for template_day, assignment_day in day_pairs:
        WorkoutExercise.objects.bulk_create([
            WorkoutExercise(
                workout_day=assignment_day,
                exercise=template_exercise.exercise,
                sequence=template_exercise.sequence,
                body_part=template_exercise.body_part,
                video_url=template_exercise.video_url,
                weight=template_exercise.weight,
                sets=template_exercise.sets,
                reps=template_exercise.reps,
                rest=template_exercise.rest,
                notes=template_exercise.notes,
            )
            for template_exercise in template_day.exercises.all()
        ])


@transaction.atomic
def replace_client_workout_assignment(
    *,
    assignment,
    client=None,
    plan=None,
    assigned_by=None,
    start_date=None,
    end_date=None,
    status=None,
    notes=None,
):
    replacement_start = start_date or timezone.localdate()
    close_date = replacement_start
    if assignment.start_date and replacement_start > assignment.start_date:
        close_date = replacement_start - timedelta(days=1)

    assignment.status = WorkoutPlanAssignment.StatusChoices.COMPLETED
    assignment.end_date = close_date
    assignment.save(update_fields=['status', 'end_date', 'updated_at'])

    return assign_workout_plan(
        tenant=assignment.tenant,
        client=client or assignment.client,
        plan=plan or assignment.plan,
        assigned_by=assigned_by or assignment.assigned_by,
        start_date=replacement_start,
        end_date=end_date,
        status=status or WorkoutPlanAssignment.StatusChoices.ACTIVE,
        notes=notes if notes is not None else assignment.notes,
    )

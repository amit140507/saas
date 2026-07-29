from rest_framework import serializers
from django.db import transaction

from workout.services import assign_workout_plan, replace_client_workout_assignment, save_exercise
from workout.models.planning import (
    Exercise,
    ExerciseMedia,
    ExerciseMuscle,
    Muscle,
    MuscleGroup,
    WorkoutDay,
    WorkoutExercise,
    WorkoutPlan,
    WorkoutPlanAssignment,
)


class MuscleGroupSerializer(serializers.ModelSerializer):
    class Meta:
        model = MuscleGroup
        fields = '__all__'


class MuscleSerializer(serializers.ModelSerializer):
    muscle_group_name = serializers.ReadOnlyField(source='muscle_group.name')

    class Meta:
        model = Muscle
        fields = '__all__'


class ExerciseMediaSerializer(serializers.ModelSerializer):
    class Meta:
        model = ExerciseMedia
        fields = '__all__'


class ExerciseMuscleSerializer(serializers.ModelSerializer):
    muscle_name = serializers.ReadOnlyField(source='muscle.name')
    muscle_group = serializers.ReadOnlyField(source='muscle.muscle_group_id')
    muscle_group_name = serializers.ReadOnlyField(source='muscle.muscle_group.name')

    class Meta:
        model = ExerciseMuscle
        fields = '__all__'


class ExerciseMusclePayloadSerializer(serializers.Serializer):
    muscle = serializers.PrimaryKeyRelatedField(queryset=Muscle.objects.all())
    is_primary = serializers.BooleanField(default=False)


class ExerciseMediaPayloadSerializer(serializers.Serializer):
    youtube_url = serializers.URLField()


class ExerciseSerializer(serializers.ModelSerializer):
    primary_muscle_name = serializers.ReadOnlyField(source='primary_muscle.name')
    muscle_group = serializers.ReadOnlyField(source='primary_muscle.muscle_group_id')
    muscle_group_name = serializers.ReadOnlyField(source='primary_muscle.muscle_group.name')
    media = ExerciseMediaSerializer(many=True, read_only=True)
    muscles = ExerciseMuscleSerializer(many=True, read_only=True)
    muscle_links = ExerciseMusclePayloadSerializer(many=True, write_only=True, required=False)
    media_items = ExerciseMediaPayloadSerializer(many=True, write_only=True, required=False)

    class Meta:
        model = Exercise
        fields = '__all__'

    def create(self, validated_data):
        muscle_links = validated_data.pop('muscle_links', None)
        media_items = validated_data.pop('media_items', None)
        return save_exercise(
            muscle_links=muscle_links,
            media_items=media_items,
            **validated_data,
        )

    def update(self, instance, validated_data):
        muscle_links = validated_data.pop('muscle_links', None)
        media_items = validated_data.pop('media_items', None)
        return save_exercise(
            instance=instance,
            muscle_links=muscle_links,
            media_items=media_items,
            **validated_data,
        )


class WorkoutExerciseSerializer(serializers.ModelSerializer):
    exercise_name = serializers.ReadOnlyField(source='exercise.name')
    exercise_video_urls = serializers.SerializerMethodField()

    class Meta:
        model = WorkoutExercise
        fields = '__all__'

    def get_exercise_video_urls(self, obj):
        return [
            media.youtube_url
            for media in obj.exercise.media.all()
            if media.youtube_url
        ]


class WorkoutDaySerializer(serializers.ModelSerializer):
    exercises = WorkoutExerciseSerializer(many=True, read_only=True)

    class Meta:
        model = WorkoutDay
        fields = '__all__'


class WorkoutExerciseTemplatePayloadSerializer(serializers.Serializer):
    exercise = serializers.PrimaryKeyRelatedField(queryset=Exercise.objects.all())
    sequence = serializers.IntegerField(min_value=1, required=False)
    body_part = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    video_url = serializers.URLField(required=False, allow_blank=True, allow_null=True)
    weight = serializers.FloatField(required=False, allow_null=True)
    sets = serializers.IntegerField(min_value=1)
    reps = serializers.CharField(max_length=50)
    rest = serializers.IntegerField(min_value=0)
    notes = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    exercise_type = serializers.ChoiceField(
        choices=WorkoutExercise.ExerciseType.choices,
        default=WorkoutExercise.ExerciseType.FREE_WEIGHT,
    )


class WorkoutDayTemplatePayloadSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=100)
    day_number = serializers.IntegerField(min_value=1)
    notes = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    exercises = WorkoutExerciseTemplatePayloadSerializer(many=True, required=False)


class WorkoutPlanSerializer(serializers.ModelSerializer):
    created_by_name = serializers.ReadOnlyField(source='created_by.get_full_name')
    template_days = WorkoutDaySerializer(many=True, read_only=True)
    days = WorkoutDayTemplatePayloadSerializer(many=True, write_only=True, required=False)

    class Meta:
        model = WorkoutPlan
        fields = [
            'id',
            'tenant',
            'title',
            'difficulty',
            'description',
            'goal',
            'duration_weeks',
            'created_by',
            'created_by_name',
            'is_active',
            'created_at',
            'updated_at',
            'template_days',
            'days',
        ]
        read_only_fields = ['created_by', 'created_at', 'updated_at']

    @transaction.atomic
    def create(self, validated_data):
        days = validated_data.pop('days', None)
        request = self.context.get('request')
        if request and request.user and request.user.is_authenticated:
            validated_data.setdefault('created_by', request.user)

        plan = super().create(validated_data)
        if days is not None:
            self._sync_template_days(plan, days)
        return plan

    @transaction.atomic
    def update(self, instance, validated_data):
        days = validated_data.pop('days', None)
        plan = super().update(instance, validated_data)
        if days is not None:
            self._sync_template_days(plan, days)
        return plan

    def _sync_template_days(self, plan, days):
        plan.template_days.all().delete()
        workout_days = []

        for index, day_data in enumerate(days, start=1):
            exercises = day_data.pop('exercises', [])
            workout_day = WorkoutDay.objects.create(
                tenant=plan.tenant,
                plan=plan,
                name=day_data['name'],
                day_number=day_data.get('day_number') or index,
                notes=day_data.get('notes') or '',
            )
            workout_days.append((workout_day, exercises))

        for workout_day, exercises in workout_days:
            WorkoutExercise.objects.bulk_create([
                WorkoutExercise(
                    workout_day=workout_day,
                    exercise=exercise_data['exercise'],
                    sequence=exercise_data.get('sequence') or sequence,
                    body_part=exercise_data.get('body_part') or None,
                    video_url=exercise_data.get('video_url') or None,
                    weight=exercise_data.get('weight'),
                    sets=exercise_data['sets'],
                    reps=exercise_data['reps'],
                    rest=exercise_data['rest'],
                    notes=exercise_data.get('notes') or '',
                    exercise_type=exercise_data.get('exercise_type') or WorkoutExercise.ExerciseType.FREE_WEIGHT,
                )
                for sequence, exercise_data in enumerate(exercises, start=1)
            ])


class WorkoutPlanAssignmentSerializer(serializers.ModelSerializer):
    plan_title = serializers.ReadOnlyField(source='plan.title')
    client_name = serializers.ReadOnlyField(source='client.user.get_full_name')
    workout_days = WorkoutDaySerializer(many=True, read_only=True)

    class Meta:
        model = WorkoutPlanAssignment
        fields = '__all__'

    def create(self, validated_data):
        request = self.context.get('request')
        assigned_by = validated_data.pop('assigned_by', None)
        if request and request.user and request.user.is_authenticated:
            assigned_by = assigned_by or request.user

        return assign_workout_plan(
            assigned_by=assigned_by,
            **validated_data,
        )

    def update(self, instance, validated_data):
        if self._should_create_replacement(instance, validated_data):
            request = self.context.get('request')
            assigned_by = validated_data.pop('assigned_by', None)
            if request and request.user and request.user.is_authenticated:
                assigned_by = assigned_by or request.user

            return replace_client_workout_assignment(
                assignment=instance,
                client=validated_data.get('client'),
                plan=validated_data.get('plan'),
                assigned_by=assigned_by,
                start_date=validated_data.get('start_date'),
                end_date=validated_data.get('end_date'),
                status=validated_data.get('status'),
                notes=validated_data.get('notes'),
            )

        return super().update(instance, validated_data)

    def _should_create_replacement(self, instance, validated_data):
        if instance.status != WorkoutPlanAssignment.StatusChoices.ACTIVE:
            return False

        versioned_fields = ('client', 'plan', 'start_date')
        for field in versioned_fields:
            if field in validated_data and getattr(instance, field) != validated_data[field]:
                return True

        return False

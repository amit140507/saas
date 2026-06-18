from rest_framework import serializers

from workout.services import save_exercise
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
from workout.models.tracking import SetLog, WorkoutLog, WorkoutSession


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

    class Meta:
        model = WorkoutExercise
        fields = '__all__'


class WorkoutDaySerializer(serializers.ModelSerializer):
    exercises = WorkoutExerciseSerializer(source='workoutexercise_set', many=True, read_only=True)

    class Meta:
        model = WorkoutDay
        fields = '__all__'


class WorkoutPlanSerializer(serializers.ModelSerializer):
    created_by_name = serializers.ReadOnlyField(source='created_by.get_full_name')

    class Meta:
        model = WorkoutPlan
        fields = '__all__'


class WorkoutPlanAssignmentSerializer(serializers.ModelSerializer):
    plan_title = serializers.ReadOnlyField(source='plan.title')
    client_name = serializers.ReadOnlyField(source='client.user.get_full_name')

    class Meta:
        model = WorkoutPlanAssignment
        fields = '__all__'


class SetLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = SetLog
        fields = '__all__'


class WorkoutLogSerializer(serializers.ModelSerializer):
    exercise_name = serializers.ReadOnlyField(source='exercise.name')
    sets = SetLogSerializer(many=True, read_only=True)

    class Meta:
        model = WorkoutLog
        fields = '__all__'


class WorkoutSessionSerializer(serializers.ModelSerializer):
    logs = WorkoutLogSerializer(many=True, read_only=True)

    class Meta:
        model = WorkoutSession
        fields = '__all__'

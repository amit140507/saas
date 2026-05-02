from rest_framework import serializers
from .models import WeeklyMeasurement, MeasurementPhoto

class WeeklyMeasurementSerializer(serializers.ModelSerializer):
    photos = serializers.ListField(
        child=serializers.ImageField(),
        write_only=True,
        required=False
    )

    class Meta:
        model = WeeklyMeasurement
        fields = '__all__'
        read_only_fields = ['created_at', 'updated_at']

    def validate_photos(self, value):
        if len(value) > 4:
            raise serializers.ValidationError("Max 4 photos allowed")
        return value

    def create(self, validated_data):
        photos = validated_data.pop('photos', [])

        # create measurement
        measurement = WeeklyMeasurement.objects.create(**validated_data)

        # bulk create photos (efficient)
        photo_objs = [
            MeasurementPhoto(measurement=measurement, image=photo)
            for photo in photos
        ]
        MeasurementPhoto.objects.bulk_create(photo_objs)

        return measurement
from rest_framework import serializers

from .models import MeasurementPhoto, WeeklyMeasurement


class MeasurementPhotoSerializer(serializers.ModelSerializer):
    class Meta:
        model = MeasurementPhoto
        fields = ['id', 'photo_type', 'image', 'uploaded_at']
        read_only_fields = fields


class WeeklyMeasurementSerializer(serializers.ModelSerializer):
    photos = MeasurementPhotoSerializer(many=True, read_only=True)

    class Meta:
        model = WeeklyMeasurement
        fields = [
            'id',
            'tenant',
            'client',
            'weight',
            'chest',
            'abdomen',
            'glutes',
            'arm_left',
            'arm_right',
            'thighs_left',
            'thighs_right',
            'calf_left',
            'calf_right',
            'notes',
            'measured_at',
            'created_at',
            'updated_at',
            'photos',
        ]
        read_only_fields = ['id', 'tenant', 'measured_at', 'created_at', 'updated_at', 'photos']

    def validate_client(self, value):
        request = self.context.get('request')
        tenant = getattr(request, 'tenant', None) if request else None
        if tenant and value.tenant_id != tenant.id:
            raise serializers.ValidationError("Client must belong to the current tenant.")
        return value

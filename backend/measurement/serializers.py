from rest_framework import serializers
from .models import Measurement


class MeasurementSerializer(serializers.ModelSerializer):
    class Meta:
        model = Measurement
        fields = ['id', 'date', 'chest', 'hips', 'biceps', 'thighs', 'waist', 'weight', 'photo', 'created_at']
        read_only_fields = ['id', 'created_at']

    def create(self, validated_data):
        validated_data['user'] = self.context['request'].user
        validated_data['tenant'] = self.context['request'].user.tenant  # Assuming user has a tenant
        return super().create(validated_data)
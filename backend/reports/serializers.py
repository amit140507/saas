"""
Reports serializers updated for new BloodReport/BloodMarker schema.
"""
from rest_framework import serializers
from .models import BloodReport, BloodMarker


class BloodMarkerSerializer(serializers.ModelSerializer):
    class Meta:
        model = BloodMarker
        fields = ('id', 'marker_name', 'value', 'unit', 'normal_min', 'normal_max', 'is_abnormal')
        extra_kwargs = {
            'is_abnormal': {'required': False},
            'unit': {'required': False},
            'normal_min': {'required': False},
            'normal_max': {'required': False},
        }


class BloodReportSerializer(serializers.ModelSerializer):
    markers = BloodMarkerSerializer(many=True, required=False)

    class Meta:
        model = BloodReport
        fields = (
            'id', 'client', 'report_date', 'lab_name', 'notes',
            'report_file', 'reviewed_by', 'reviewed_at',
            'markers', 'created_at',
        )
        read_only_fields = ('client',)

    def to_internal_value(self, data):
        if hasattr(data, 'copy'):
            ret = data.copy()
        else:
            ret = data
        markers = ret.get('markers')
        if isinstance(markers, str):
            import json
            try:
                ret['markers'] = json.loads(markers)
            except (ValueError, TypeError):
                ret['markers'] = []
        return super().to_internal_value(ret)

    def create(self, validated_data):
        markers_data = validated_data.pop('markers', [])
        blood_report = BloodReport.objects.create(**validated_data)
        for marker in markers_data:
            BloodMarker.objects.create(report=blood_report, **marker)
        return blood_report

    def update(self, instance, validated_data):
        markers_data = validated_data.pop('markers', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        if markers_data is not None:
            instance.markers.all().delete()
            for marker in markers_data:
                BloodMarker.objects.create(report=instance, **marker)
        return instance

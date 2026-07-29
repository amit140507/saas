"""
Reports serializers updated for new BloodReport/BloodMarker schema.
"""
from rest_framework import serializers
from .models import BloodReport, BloodMarker
from core.clients.models import ClientProfile


MARKER_FIELDS = {
    'marker_name',
    'value',
    'unit',
    'normal_min',
    'normal_max',
    'is_abnormal',
}


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
    client = serializers.PrimaryKeyRelatedField(
        queryset=ClientProfile.objects.none(),
        required=False,
    )

    class Meta:
        model = BloodReport
        fields = (
            'id', 'client', 'report_date', 'lab_name', 'notes',
            'report_file', 'reviewed_by', 'reviewed_at',
            'markers', 'created_at',
        )
        read_only_fields = ('reviewed_by', 'reviewed_at', 'created_at')
        extra_kwargs = {
            'report_file': {'required': False},
        }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        request = self.context.get('request')
        tenant = getattr(request, 'tenant', None) if request else None
        if tenant:
            self.fields['client'].queryset = ClientProfile.objects.filter(tenant=tenant)

    def to_internal_value(self, data):
        if hasattr(data, 'copy'):
            ret = data.copy()
        else:
            ret = data
        if 'date' in ret and 'report_date' not in ret:
            ret['report_date'] = ret.get('date')
        if 'readings' in ret and 'markers' not in ret:
            ret['markers'] = ret.get('readings')
        markers = ret.get('markers')
        if isinstance(markers, str):
            import json
            try:
                ret['markers'] = json.loads(markers)
            except (ValueError, TypeError):
                ret['markers'] = []
        if isinstance(ret.get('markers'), list):
            ret['markers'] = [
                {key: value for key, value in marker.items() if key in MARKER_FIELDS}
                for marker in ret['markers']
                if isinstance(marker, dict)
            ]
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

from rest_framework import serializers
from .models import BloodReport, BloodMarkerReading

class BloodMarkerReadingSerializer(serializers.ModelSerializer):
    class Meta:
        model = BloodMarkerReading
        fields = ('id', 'marker_name', 'marker_type', 'value', 'unit', 'reference_range', 'is_normal')
        extra_kwargs = {
            'is_normal': {'required': False},
            'marker_type': {'required': False},
            'unit': {'required': False},
            'reference_range': {'required': False},
        }

class BloodReportSerializer(serializers.ModelSerializer):
    readings = BloodMarkerReadingSerializer(many=True, required=False)
    
    class Meta:
        model = BloodReport
        fields = ('id', 'user', 'date', 'lab_name', 'notes', 'report_file', 'readings', 'created_at', 'updated_at')
        read_only_fields = ('user',)

    def to_internal_value(self, data):
        # When using FormData, things like 'readings' might be a JSON string.
        # We need to parse it back into a list/dict structure for DRF to handle it.
        if hasattr(data, 'copy'):
            ret = data.copy()
        else:
            ret = data

        readings = ret.get('readings')
        if isinstance(readings, str):
            import json
            try:
                ret['readings'] = json.loads(readings)
            except (ValueError, TypeError):
                ret['readings'] = []
        
        return super().to_internal_value(ret)

    def create(self, validated_data):
        readings_data = validated_data.pop('readings', [])
        # Ensure we don't have duplicate keys for user/tenant
        validated_data.pop('user', None)
        validated_data.pop('tenant', None)
        
        user = self.context['request'].user
        tenant = getattr(user, 'tenant', None)
        
        blood_report = BloodReport.objects.create(user=user, tenant=tenant, **validated_data)
        
        for reading in readings_data:
            # Pop tenant if it exists in reading data to avoid duplicates
            reading.pop('tenant', None)
            BloodMarkerReading.objects.create(report=blood_report, tenant=tenant, **reading)
            
        return blood_report

    def update(self, instance, validated_data):
        readings_data = validated_data.pop('readings', None)
        
        # Update BloodReport fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        
        if readings_data is not None:
            # Simple approach: clear and recreation readings
            instance.readings.all().delete()
            tenant = instance.tenant
            for reading in readings_data:
                BloodMarkerReading.objects.create(report=instance, tenant=tenant, **reading)
                
        return instance

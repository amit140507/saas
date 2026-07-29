from rest_framework import serializers
from .models import CheckIn, CheckinLog

class CheckInLogSerializer(serializers.ModelSerializer):
    hunger_level_display = serializers.CharField(
        source='get_hunger_level_display',
        read_only=True
    )

    class Meta:
        model = CheckinLog
        fields = '__all__'

class CheckInSerializer(serializers.ModelSerializer):
    daily_logs = CheckInLogSerializer(many=True, read_only=True)
    
    class Meta:
        model = CheckIn
        fields = '__all__'



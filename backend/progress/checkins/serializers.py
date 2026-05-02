from rest_framework import serializers
from .models import CheckIn, DailyLog

class DailyLogSerializer(serializers.ModelSerializer):
    hunger_level_display = serializers.CharField(
        source='get_hunger_level_display',
        read_only=True
    )

    class Meta:
        model = DailyLog
        fields = '__all__'

class CheckInSerializer(serializers.ModelSerializer):
    daily_logs = DailyLogSerializer(many=True, read_only=True)
    
    class Meta:
        model = CheckIn
        fields = '__all__'



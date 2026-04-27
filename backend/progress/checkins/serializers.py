from rest_framework import serializers
from .models import CheckInPlan, DailyLog

class DailyLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = DailyLog
        fields = '__all__'

class CheckInPlanSerializer(serializers.ModelSerializer):
    daily_logs = DailyLogSerializer(many=True, read_only=True)
    
    class Meta:
        model = CheckInPlan
        fields = '__all__'

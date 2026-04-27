from rest_framework import serializers
from checkins.models import DailyLog
from checkins.serializers import DailyLogSerializer

class CheckInService:
    @staticmethod
    def bulk_update_logs(logs_data: list):
        """
        Receives an array of DailyLogs data and updates or creates them.
        """
        if not isinstance(logs_data, list):
            raise ValueError("Expected a list of logs")

        updated_logs = []
        for data in logs_data:
            log_id = data.get('id')
            if log_id:
                try:
                    log = DailyLog.objects.get(id=log_id)
                    serializer = DailyLogSerializer(log, data=data, partial=True)
                except DailyLog.DoesNotExist:
                    raise serializers.ValidationError(f"DailyLog with id {log_id} does not exist.")
            else:
                serializer = DailyLogSerializer(data=data)
                
            serializer.is_valid(raise_exception=True)
            serializer.save()
            updated_logs.append(serializer.data)
            
        return updated_logs

from rest_framework import serializers
from progress.checkins.models import CheckinLog
from progress.checkins.serializers import CheckInLogSerializer

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
                    log = CheckinLog.objects.get(id=log_id)
                    serializer = CheckInLogSerializer(log, data=data, partial=True)
                except CheckinLog.DoesNotExist:
                    raise serializers.ValidationError(f"CheckinLog with id {log_id} does not exist.")
            else:
                serializer = CheckInLogSerializer(data=data)
                
            serializer.is_valid(raise_exception=True)
            serializer.save()
            updated_logs.append(serializer.data)
            
        return updated_logs

from django.apps import AppConfig


class MeasurementConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'measurement'

    def ready(self):
        import measurement.signals  # noqa: F401

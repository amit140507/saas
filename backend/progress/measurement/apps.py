from django.apps import AppConfig


class MeasurementConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'progress.measurement'
    verbose_name = 'Measurements'

    def ready(self):
        import progress.measurement.signals  # noqa: F401

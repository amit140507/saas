from django.apps import AppConfig


class CommonConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'core.common'
    label = 'core_common'
    verbose_name = 'Core Common'

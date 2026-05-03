import os
from celery import Celery

# Set the default Django settings module for the 'celery' program.
try:
    import dotenv
    from pathlib import Path
    
    # Detect environment: local, staging, prod
    app_env = os.environ.get('APP_ENV', 'local')
    env_file = f'.env.{app_env}'
    
    env_path = Path('.') / env_file
    if env_path.exists():
        dotenv.load_dotenv(dotenv_path=env_path)
    else:
        # Fallback to .env if specific one doesn't exist
        dotenv.load_dotenv()
except ImportError:
    pass

# Default to config.settings.{app_env}
app_env = os.environ.get('APP_ENV', 'local')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', f'config.settings.{app_env}')

app = Celery('config')

# Using a string here means the worker doesn't have to serialize
# the configuration object to child processes.
# - namespace='CELERY' means all celery-related configuration keys
#   should have a `CELERY_` prefix.
app.config_from_object('django.conf:settings', namespace='CELERY')

# Load task modules from all registered Django apps.
app.autodiscover_tasks()

@app.task(bind=True, ignore_result=True)
def debug_task(self):
    print(f'Request: {self.request!r}')

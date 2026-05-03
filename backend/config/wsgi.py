"""
WSGI config for config project.

It exposes the WSGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/4.2/howto/deployment/wsgi/
"""

import os

from django.core.wsgi import get_wsgi_application

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

application = get_wsgi_application()

#!/usr/bin/env python
"""Django's command-line utility for administrative tasks."""
import os
import sys


def main():
    """Run administrative tasks."""
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
    try:
        from django.core.management import execute_from_command_line
    except ImportError as exc:
        raise ImportError(
            "Couldn't import Django. Are you sure it's installed and "
            "available on your PYTHONPATH environment variable? Did you "
            "forget to activate a virtual environment?"
        ) from exc
    execute_from_command_line(sys.argv)


if __name__ == '__main__':
    main()

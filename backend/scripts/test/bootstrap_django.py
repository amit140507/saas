"""Helpers for running manual smoke scripts with Django settings loaded."""

from __future__ import annotations

import os
import sys
from pathlib import Path


def load_django():
    """Load the same env file and settings module pattern used by manage.py."""
    backend_dir = Path(__file__).resolve().parents[2]
    app_env = os.environ.get("APP_ENV", "local")

    try:
        import dotenv
    except ImportError:
        dotenv = None

    if dotenv is not None:
        env_path = backend_dir / f".env.{app_env}"
        if env_path.exists():
            dotenv.load_dotenv(dotenv_path=env_path)
        else:
            dotenv.load_dotenv(dotenv_path=backend_dir / ".env.local")

    if str(backend_dir) not in sys.path:
        sys.path.insert(0, str(backend_dir))

    os.environ.setdefault("DJANGO_SETTINGS_MODULE", f"config.settings.{app_env}")

    import django

    django.setup()

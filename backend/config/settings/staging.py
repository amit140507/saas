from .base import *

DEBUG = True

ALLOWED_HOSTS = os.environ.get('ALLOWED_HOSTS', '').split(',')

CORS_ALLOW_ALL_ORIGINS = False
CORS_ALLOWED_ORIGINS = [
    origin
    for origin in [
        os.environ.get('FRONTEND_URL'),
        *os.environ.get('CORS_ALLOWED_ORIGINS', '').split(','),
    ]
    if origin
]

# Security Settings
SECURE_SSL_REDIRECT = os.environ.get('SECURE_SSL_REDIRECT', 'False').lower() == 'true'
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True

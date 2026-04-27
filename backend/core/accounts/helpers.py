import string
import secrets

def generate_public_id(length: int = 6) -> str:
    """Generates a cryptographically secure random digit string ID."""
    # secrets.choice ensures cryptographic security over random.choices
    return ''.join(secrets.choice(string.digits) for _ in range(length))

def generate_unique_public_id(model, field_name: str = 'public_id', length: int = 10, max_attempts: int = 10) -> str:
    """
    Generates a unique random string ID by verifying against the database.
    Raises RuntimeError if a unique ID cannot be generated after max_attempts.
    """
    for _ in range(max_attempts):
        pid = generate_public_id(length=length)
        if not model.objects.filter(**{field_name: pid}).exists():
            return pid
            
    # Raise a more specific error rather than a generic Exception
    raise RuntimeError(f"Could not generate a unique {field_name} for {model.__name__} after {max_attempts} attempts.")

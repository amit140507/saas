import random
import string

def generate_public_id():
    """Generates a random 6-digit string ID."""
    return ''.join(random.choices(string.digits, k=6))

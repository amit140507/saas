import os
import django
import sys

# Add the current directory to sys.path so config can be found
sys.path.append(os.getcwd())

# Initialize Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.core.mail import send_mail
from django.conf import settings

def test_email():
    print("--- Django SMTP Test ---")
    print(f"Host: {settings.EMAIL_HOST}")
    print(f"Port: {settings.EMAIL_PORT}")
    print(f"User: {settings.EMAIL_HOST_USER or 'Not Set'}")
    print(f"TLS: {settings.EMAIL_USE_TLS}")
    print(f"SSL: {getattr(settings, 'EMAIL_USE_SSL', 'Not Set')}")
    print("------------------------")
    
    try:
        print("Attempting to send email...")
        # Sending to the same address as the sender for testing
        recipient = settings.EMAIL_HOST_USER
        if not recipient:
            print("❌ Error: EMAIL_HOST_USER is not set. Please check your .env file.")
            return

        sent = send_mail(
            subject='SaaS App - SMTP Test',
            message='Congratulations! If you are reading this, your SMTP configuration is working correctly.',
            from_email=settings.DEFAULT_FROM_EMAIL or recipient,
            recipient_list=[recipient],
            fail_silently=False,
        )
        
        if sent:
            print(f"[SUCCESS] An email has been sent to {recipient}")
            print("Please check your inbox (and spam folder).")
        else:
            print("[FAILED] Error: send_mail returned 0. No email was sent.")
            
    except Exception as e:
        print(f"[ERROR] SMTP Error: {str(e)}")
        
        if "Authentication failed" in str(e) or "Username and Password not accepted" in str(e):
            print("\nTIP: Check if you are using a Gmail 'App Password'.")
        elif "Timeout" in str(e) or "Connection refused" in str(e):
            print("\nTIP: Check if your port (465/587) matches your TLS/SSL settings.")
            print("   Port 587 -> EMAIL_USE_TLS = True")
            print("   Port 465 -> EMAIL_USE_SSL = True")

if __name__ == "__main__":
    test_email()

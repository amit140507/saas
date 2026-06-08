"""Manual smoke test for sending email through Django SMTP settings."""

from __future__ import annotations

from bootstrap_django import load_django


load_django()

from django.conf import settings
from django.core.mail import send_mail


def run_smtp_smoke_test():
    print("--- Django SMTP Smoke Test ---")
    print(f"Host: {settings.EMAIL_HOST}")
    print(f"Port: {settings.EMAIL_PORT}")
    print(f"User: {settings.EMAIL_HOST_USER or 'Not Set'}")
    print(f"TLS: {settings.EMAIL_USE_TLS}")
    print(f"SSL: {getattr(settings, 'EMAIL_USE_SSL', 'Not Set')}")
    print("------------------------------")

    recipient = settings.EMAIL_HOST_USER
    if not recipient:
        raise RuntimeError("EMAIL_HOST_USER is not set. Please check your env file.")

    sent = send_mail(
        subject="SaaS App - SMTP Smoke Test",
        message="Congratulations. Your SMTP configuration is working correctly.",
        from_email=settings.DEFAULT_FROM_EMAIL or recipient,
        recipient_list=[recipient],
        fail_silently=False,
    )

    if sent:
        print(f"[SUCCESS] An email has been sent to {recipient}")
        print("Please check your inbox and spam folder.")
        return

    raise RuntimeError("send_mail returned 0. No email was sent.")


def main():
    try:
        run_smtp_smoke_test()
    except Exception as exc:
        print(f"[ERROR] SMTP smoke test failed: {exc}")

        message = str(exc)
        if "Authentication failed" in message or "Username and Password not accepted" in message:
            print("TIP: Check if you are using a Gmail app password.")
        elif "Timeout" in message or "Connection refused" in message:
            print("TIP: Check if your port matches your TLS/SSL settings.")
            print("Port 587 -> EMAIL_USE_TLS = True")
            print("Port 465 -> EMAIL_USE_SSL = True")

        raise SystemExit(1) from exc


if __name__ == "__main__":
    main()

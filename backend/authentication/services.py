from dataclasses import dataclass

from allauth.account.models import EmailAddress
from allauth.socialaccount.adapter import get_adapter as get_social_adapter
from allauth.socialaccount.models import SocialAccount, SocialLogin
from django.conf import settings
from django.contrib.auth import get_user_model
from django.contrib.auth.tokens import default_token_generator
from django.core import signing
from django.core.mail import send_mail
from django.db import transaction
from django.template.loader import render_to_string
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode

from core.clients.models import ClientProfile
from core.tenants.models import OrganizationMember
from core.tenants.services import create_tenant


User = get_user_model()
GOOGLE_ONBOARDING_TOKEN_SALT = "authentication.google.onboarding"
GOOGLE_ONBOARDING_TOKEN_MAX_AGE = getattr(
    settings,
    "GOOGLE_ONBOARDING_TOKEN_MAX_AGE",
    15 * 60,
)


@dataclass
class GoogleAuthResult:
    user: User | None = None
    requires_onboarding: bool = False
    onboarding_token: str | None = None


class GoogleAuthError(Exception):
    def __init__(self, detail):
        super().__init__(str(detail))
        self.detail = detail


def check_user_availability(*, username: str = "", email: str = "", exclude_user=None):
    user_model = get_user_model()
    response_data = {}

    if username:
        username_queryset = user_model.objects.all()
        if exclude_user is not None:
            username_queryset = username_queryset.exclude(pk=exclude_user.pk)
        response_data["username_available"] = not username_queryset.filter(
            username=username,
        ).exists()

    if email:
        email_queryset = user_model.objects.all()
        if exclude_user is not None:
            email_queryset = email_queryset.exclude(pk=exclude_user.pk)
        response_data["email_available"] = not email_queryset.filter(
            email__iexact=email,
        ).exists()

    return response_data


def get_user_by_email(email: str):
    normalized_email = (email or "").strip()
    if not normalized_email:
        return None
    return User.objects.filter(email__iexact=normalized_email).first()


def is_social_account_linked(provider: str, uid: str) -> bool:
    return SocialAccount.objects.filter(provider=provider, uid=uid).exists()


def link_social_account(*, request, sociallogin, user):
    sociallogin.connect(request, user)
    return sociallogin.account


def issue_google_onboarding_token(*, sociallogin) -> str:
    payload = {
        "sociallogin": sociallogin.serialize(),
    }
    return signing.dumps(payload, salt=GOOGLE_ONBOARDING_TOKEN_SALT)


def load_google_onboarding_sociallogin(token: str):
    try:
        payload = signing.loads(
            token,
            salt=GOOGLE_ONBOARDING_TOKEN_SALT,
            max_age=GOOGLE_ONBOARDING_TOKEN_MAX_AGE,
        )
    except signing.BadSignature as exc:
        raise GoogleAuthError("Invalid or expired onboarding token.") from exc

    try:
        return SocialLogin.deserialize(payload["sociallogin"])
    except Exception as exc:
        raise GoogleAuthError("Invalid onboarding payload.") from exc


def handle_google_login(*, request, sociallogin) -> GoogleAuthResult:
    existing_user = get_user_by_email(sociallogin.user.email)

    if existing_user:
        if not is_social_account_linked(sociallogin.account.provider, sociallogin.account.uid):
            link_social_account(
                request=request,
                sociallogin=sociallogin,
                user=existing_user,
            )

        return GoogleAuthResult(user=existing_user)

    return GoogleAuthResult(
        requires_onboarding=True,
        onboarding_token=issue_google_onboarding_token(sociallogin=sociallogin),
    )


def handle_google_signup(*, sociallogin) -> GoogleAuthResult:
    existing_user = get_user_by_email(sociallogin.user.email)
    if existing_user:
        raise GoogleAuthError("User is already registered with this e-mail address.")

    return GoogleAuthResult(
        requires_onboarding=True,
        onboarding_token=issue_google_onboarding_token(sociallogin=sociallogin),
    )


@transaction.atomic
def complete_google_owner_onboarding(*, request, onboarding_token: str, tenant_name: str, phone: str = ""):
    sociallogin = load_google_onboarding_sociallogin(onboarding_token)

    if get_user_by_email(sociallogin.user.email):
        raise GoogleAuthError("User is already registered with this e-mail address.")

    if is_social_account_linked(sociallogin.account.provider, sociallogin.account.uid):
        raise GoogleAuthError("This Google account is already linked to a user.")

    try:
        user = get_social_adapter().save_user(request, sociallogin, form=None)
    except Exception as exc:
        raise GoogleAuthError("Unable to create user from Google account.") from exc

    EmailAddress.objects.update_or_create(
        user=user,
        email=user.email,
        defaults={"verified": True, "primary": True},
    )

    try:
        onboard_owner_user(
            user=user,
            tenant_name=tenant_name,
            phone=phone,
        )
    except Exception as exc:
        raise GoogleAuthError("Unable to complete onboarding.") from exc

    return user


@transaction.atomic
def onboard_owner_user(*, user, tenant_name: str, phone: str = ""):
    tenant = create_tenant(user=user, name=tenant_name)
    membership = OrganizationMember.objects.select_related("role").get(
        user=user,
        tenant=tenant,
    )

    profile_defaults = {}
    if phone:
        profile_defaults["phone"] = phone

    client_profile, created = ClientProfile.objects.get_or_create(
        org_client=membership,
        defaults={
            "tenant": tenant,
            **profile_defaults,
        },
    )
    if not created:
        update_fields = []
        if client_profile.tenant_id != tenant.id:
            client_profile.tenant = tenant
            update_fields.append("tenant")
        if phone and client_profile.phone != phone:
            client_profile.phone = phone
            update_fields.append("phone")
        if update_fields:
            client_profile.save(update_fields=update_fields)

    return {
        "tenant": tenant,
        "membership": membership,
        "client_profile": client_profile,
    }


def send_password_reset_email(*, user):
    uid = urlsafe_base64_encode(force_bytes(user.pk))
    token = default_token_generator.make_token(user)

    rest_auth_settings = getattr(settings, "REST_AUTH", {})
    url_pattern = rest_auth_settings.get(
        "PASSWORD_RESET_CONFIRM_URL",
        f"{settings.FRONTEND_URL}/reset-password/{{uid}}/{{token}}/",
    )
    reset_url = url_pattern.replace("{uid}", uid).replace("{token}", token)
    context = {
        "user": user,
        "uid": uid,
        "token": token,
        "reset_url": reset_url,
    }
    subject = render_to_string(
        "authentication/emails/password_reset_subject.txt",
        context,
    ).strip()
    email_msg = render_to_string(
        "authentication/emails/password_reset_message.txt",
        context,
    )

    send_mail(
        subject=subject,
        message=email_msg,
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[user.email],
        fail_silently=False,
    )

from allauth.socialaccount.helpers import complete_social_login
from allauth.socialaccount.providers.oauth2.client import OAuth2Error
from django.http import HttpResponseBadRequest
from django.urls.exceptions import NoReverseMatch
from requests.exceptions import HTTPError
from rest_framework.reverse import reverse


class GoogleOAuthError(Exception):
    def __init__(self, detail):
        super().__init__(str(detail))
        self.detail = detail


def build_google_social_login(*, attrs, request, view, get_social_login):
    adapter_class = getattr(view, "adapter_class", None)
    if not adapter_class:
        raise GoogleOAuthError("Define adapter_class in view.")

    adapter = adapter_class(request)
    app = adapter.get_provider().app
    social_token, token = _build_social_token(
        attrs=attrs,
        adapter=adapter,
        app=app,
        request=request,
        view=view,
        adapter_class=adapter_class,
    )

    try:
        login = _build_social_login(
            attrs=attrs,
            adapter=adapter,
            app=app,
            get_social_login=get_social_login,
            social_token=social_token,
            token=token,
        )
    except HTTPError as exc:
        raise GoogleOAuthError("Google authentication failed.") from exc

    _complete_social_login(request=request, login=login)
    return login


def _build_social_token(*, attrs, adapter, app, request, view, adapter_class):
    access_token = attrs.get("access_token")
    code = attrs.get("code")
    id_token = attrs.get("id_token")

    if access_token:
        tokens_to_parse = {"access_token": access_token}
        token = access_token
        if id_token:
            tokens_to_parse["id_token"] = id_token
    elif code:
        callback_url = _get_callback_url(
            view=view,
            adapter_class=adapter_class,
            request=request,
        )
        client_class = getattr(view, "client_class", None)

        if not client_class:
            raise GoogleOAuthError("Define client_class in view.")

        client = client_class(
            request,
            app.client_id,
            app.secret,
            adapter.access_token_method,
            adapter.access_token_url,
            callback_url,
            scope_delimiter=adapter.scope_delimiter,
            headers=adapter.headers,
            basic_auth=adapter.basic_auth,
        )
        try:
            token = client.get_access_token(code)
        except OAuth2Error as exc:
            raise GoogleOAuthError("Failed to exchange code for access token.") from exc

        access_token = token["access_token"]
        tokens_to_parse = {"access_token": access_token}

        for key in ["refresh_token", "id_token", adapter.expires_in_key]:
            if key in token:
                tokens_to_parse[key] = token[key]
    else:
        raise GoogleOAuthError("access_token or code is required.")

    social_token = adapter.parse_token(tokens_to_parse)
    social_token.app = app
    return social_token, token


def _build_social_login(*, attrs, adapter, app, get_social_login, social_token, token):
    id_token = attrs.get("id_token")

    if adapter.provider_id == "google" and id_token:
        return get_social_login(
            adapter,
            app,
            social_token,
            response={"id_token": id_token},
        )

    return get_social_login(adapter, app, social_token, token)


def _complete_social_login(*, request, login):
    response = complete_social_login(request, login)
    if isinstance(response, HttpResponseBadRequest):
        raise GoogleOAuthError(response.content)


def _get_callback_url(*, view, adapter_class, request):
    callback_url = getattr(view, "callback_url", None)
    if callback_url:
        return callback_url

    try:
        return reverse(
            viewname=f"{adapter_class.provider_id}_callback",
            request=request,
        )
    except NoReverseMatch as exc:
        raise GoogleOAuthError("Define callback_url in view.") from exc

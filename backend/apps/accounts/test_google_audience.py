"""Google ID token audience check (mobile webClientId vs GOOGLE_CLIENT_IDS)."""
from unittest import mock

from django.test import SimpleTestCase, override_settings

from apps.accounts.social.exceptions import SocialAuthError
from apps.accounts.social.google import GoogleVerifier

WEB = "111-web.apps.googleusercontent.com"
MOBILE = "222-web.apps.googleusercontent.com"


def _tokeninfo(aud):
    resp = mock.Mock(status_code=200)
    resp.json.return_value = {"iss": "https://accounts.google.com", "aud": aud, "azp": "android-client",
                              "sub": "42", "email": "A@B.com", "email_verified": "true"}
    return resp


class GoogleAudienceTests(SimpleTestCase):
    @override_settings(SOCIAL_AUTH={"google": {"client_ids": [WEB]}})
    def test_rejects_token_for_other_client(self):
        with mock.patch("apps.accounts.social.google.requests.get", return_value=_tokeninfo(MOBILE)):
            with self.assertRaisesMessage(SocialAuthError, "different app"):
                GoogleVerifier().verify("t")

    @override_settings(SOCIAL_AUTH={"google": {"client_ids": [WEB, f" {MOBILE}"]}})
    def test_accepts_any_listed_client_even_with_spaces(self):
        with mock.patch("apps.accounts.social.google.requests.get", return_value=_tokeninfo(MOBILE)):
            profile = GoogleVerifier().verify("t")
        self.assertEqual(profile.email, "a@b.com")

    @override_settings(SOCIAL_AUTH={"google": {"client_ids": [WEB]}})
    def test_rejects_foreign_issuer(self):
        resp = _tokeninfo(WEB); resp.json.return_value["iss"] = "evil.example"
        with mock.patch("apps.accounts.social.google.requests.get", return_value=resp):
            with self.assertRaises(SocialAuthError):
                GoogleVerifier().verify("t")

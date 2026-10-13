from io import StringIO
from unittest import mock

from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.core.management import call_command
from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from apps.reloadly import services
from apps.reloadly.services import ReloadlyClient, ReloadlyError

CREDS = dict(RELOADLY_CLIENT_ID="cid-123456", RELOADLY_CLIENT_SECRET="sec", RELOADLY_MODE="live",
             SECURE_SSL_REDIRECT=False)


class Resp:
    def __init__(self, status, data=None, text=None):
        self.status_code, self._data = status, data
        self.text = text if text is not None else ("" if data is None else str(data))
        self.ok = 200 <= status < 300

    def json(self):
        if self._data is None:
            raise ValueError("no json")
        return self._data


TOKEN = Resp(200, {"access_token": "tok", "expires_in": 5184000})
COUNTRIES = [{"isoName": "GH", "name": "Ghana"}, {"isoName": "AE", "name": "United Arab Emirates"}]


@override_settings(**CREDS)
class ReloadlyClientTests(TestCase):
    def setUp(self):
        services._TOKENS.clear()

    def test_token_is_shared_between_clients(self):
        with mock.patch.object(services.requests, "post", return_value=TOKEN) as post, \
             mock.patch.object(services.requests, "request", return_value=Resp(200, COUNTRIES)):
            ReloadlyClient().countries()
            ReloadlyClient().countries()
        self.assertEqual(post.call_count, 1)

    def test_auth_refusal_is_logged_with_reloadly_reply(self):
        bad = Resp(401, {"error": "access_denied", "error_description": "Access Denied"})
        with mock.patch.object(services.requests, "post", return_value=bad), \
             self.assertLogs("apps.reloadly.services", level="ERROR") as logs:
            with self.assertRaisesMessage(ReloadlyError, "Access Denied"):
                ReloadlyClient().countries()
        self.assertIn("HTTP 401", logs.output[0])
        self.assertIn("mode=live", logs.output[0])

    def test_api_error_is_logged(self):
        with mock.patch.object(services.requests, "post", return_value=TOKEN), \
             mock.patch.object(services.requests, "request", return_value=Resp(403, {"message": "IP not allowed"})), \
             self.assertLogs("apps.reloadly.services", level="ERROR") as logs:
            with self.assertRaisesMessage(ReloadlyError, "IP not allowed"):
                ReloadlyClient().countries()
        self.assertIn("HTTP 403", logs.output[0])

    @override_settings(RELOADLY_CLIENT_ID="", RELOADLY_CLIENT_SECRET="")
    def test_missing_credentials(self):
        with mock.patch.dict("os.environ", {"RELOADLY_CLIENT_ID": "", "RELOADLY_CLIENT_SECRET": ""}), \
             self.assertLogs("apps.reloadly.services", level="ERROR"):
            with self.assertRaisesMessage(ReloadlyError, "isn't configured"):
                ReloadlyClient().countries()


@override_settings(**CREDS)
class CountriesViewTests(TestCase):
    def setUp(self):
        services._TOKENS.clear()
        cache.delete_many(["reloadly:countries:live", "reloadly:countries:live:last"])
        u = get_user_model().objects.create_user(email="c@oam.test", password="x-Pass-12345")
        self.api = APIClient()
        self.api.force_authenticate(u)

    def tearDown(self):
        cache.delete_many(["reloadly:countries:live", "reloadly:countries:live:last"])

    def test_cached_and_served_stale_when_reloadly_down(self):
        with mock.patch.object(services.requests, "post", return_value=TOKEN), \
             mock.patch.object(services.requests, "request", return_value=Resp(200, COUNTRIES)) as req:
            self.assertEqual(self.api.get("/api/v1/reloadly/countries/").json()["countries"], COUNTRIES)
            self.api.get("/api/v1/reloadly/countries/")
        self.assertEqual(req.call_count, 1)  # second call came from the cache

        cache.delete("reloadly:countries:live")  # fresh copy expired
        with mock.patch.object(services.requests, "post", return_value=TOKEN), \
             mock.patch.object(services.requests, "request", side_effect=services.requests.ConnectionError("down")):
            r = self.api.get("/api/v1/reloadly/countries/")
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.json()["countries"], COUNTRIES)

    def test_502_when_nothing_cached(self):
        with mock.patch.object(services.requests, "post", return_value=Resp(401, {"error_description": "Access Denied"})), \
             self.assertLogs("apps.reloadly.services", level="ERROR"):
            r = self.api.get("/api/v1/reloadly/countries/")
        self.assertEqual(r.status_code, 502)
        self.assertEqual(r.json()["detail"], "Access Denied")


@override_settings(**CREDS)
class CheckCommandTests(TestCase):
    def setUp(self):
        services._TOKENS.clear()

    def test_reports_ok_and_never_prints_secret(self):
        def fake(method, url, **kw):
            return Resp(200, {"balance": 12.5, "currencyCode": "USD"}) if url.endswith("/accounts/balance") else Resp(200, COUNTRIES)
        out = StringIO()
        with mock.patch.object(services.requests, "post", return_value=TOKEN), \
             mock.patch.object(services.requests, "request", side_effect=fake):
            call_command("reloadly_check", stdout=out)
        text = out.getvalue()
        self.assertIn("Login:         OK", text)
        self.assertIn("Countries:     OK (2)", text)
        self.assertIn("12.5 USD", text)
        self.assertNotIn("sec", text.replace("secret", ""))

    def test_reports_login_failure_with_hints(self):
        out = StringIO()
        with mock.patch.object(services.requests, "post", return_value=Resp(401, {"error_description": "Access Denied"})), \
             self.assertLogs("apps.reloadly.services", level="ERROR"):
            call_command("reloadly_check", stdout=out)
        self.assertIn("Login:         FAILED - Access Denied", out.getvalue())
        self.assertIn("RELOADLY_MODE=live", out.getvalue())


class ModeTests(TestCase):
    def test_production_words_mean_live(self):
        for word in ("live", "production", "PROD", " Production "):
            with override_settings(RELOADLY_MODE=word):
                self.assertEqual(services._mode(), "live", word)
                self.assertEqual(ReloadlyClient().base_url, services.LIVE_BASE)

    def test_anything_else_is_sandbox(self):
        for word in ("sandbox", "test", ""):
            with override_settings(RELOADLY_MODE=word):
                self.assertEqual(ReloadlyClient().base_url, services.SANDBOX_BASE)

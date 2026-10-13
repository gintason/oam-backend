from io import StringIO
from unittest import mock

from django.core.mail import EmailMultiAlternatives, get_connection
from django.core.management import call_command
from django.test import TestCase, override_settings

from apps.common import email_backends

API = "apps.common.email_backends.ApiEmailBackend"


class Resp:
    def __init__(self, status=200, text="{}"):
        self.status_code, self.text = status, text


def _msg():
    m = EmailMultiAlternatives("123456 is your code", "Your code is 123456", "O.A.M <no-reply@oam-app.com>",
                               ["Ada <ada@example.com>"])
    m.attach_alternative("<b>123456</b>", "text/html")
    return m


class ApiBackendTests(TestCase):
    @override_settings(EMAIL_BACKEND=API, EMAIL_API_PROVIDER="resend", EMAIL_API_KEY="re_key")
    def test_resend_payload(self):
        with mock.patch.object(email_backends.requests, "post", return_value=Resp(200)) as post:
            self.assertEqual(_msg().send(), 1)
        url, kw = post.call_args[0][0], post.call_args[1]
        self.assertEqual(url, email_backends.RESEND_URL)
        self.assertEqual(kw["headers"]["Authorization"], "Bearer re_key")
        self.assertEqual(kw["json"]["from"], "O.A.M <no-reply@oam-app.com>")
        self.assertEqual(kw["json"]["to"], ["Ada <ada@example.com>"])
        self.assertEqual(kw["json"]["html"], "<b>123456</b>")
        self.assertEqual(kw["json"]["text"], "Your code is 123456")

    @override_settings(EMAIL_BACKEND=API, EMAIL_API_PROVIDER="brevo", EMAIL_API_KEY="xkeysib")
    def test_brevo_payload(self):
        with mock.patch.object(email_backends.requests, "post", return_value=Resp(201)) as post:
            self.assertEqual(_msg().send(), 1)
        kw = post.call_args[1]
        self.assertEqual(post.call_args[0][0], email_backends.BREVO_URL)
        self.assertEqual(kw["headers"]["api-key"], "xkeysib")
        self.assertEqual(kw["json"]["sender"], {"email": "no-reply@oam-app.com", "name": "O.A.M"})
        self.assertEqual(kw["json"]["to"], [{"email": "ada@example.com", "name": "Ada"}])
        self.assertEqual(kw["json"]["htmlContent"], "<b>123456</b>")

    @override_settings(EMAIL_BACKEND=API, EMAIL_API_PROVIDER="resend", EMAIL_API_KEY="re_key")
    def test_rejection_raises_or_is_silent(self):
        with mock.patch.object(email_backends.requests, "post", return_value=Resp(403, '{"message":"domain not verified"}')):
            with self.assertRaisesMessage(RuntimeError, "domain not verified"):
                _msg().send()
            with self.assertLogs("accounts", level="ERROR"):
                self.assertEqual(get_connection(fail_silently=True).send_messages([_msg()]), 0)

    @override_settings(EMAIL_BACKEND=API, EMAIL_API_PROVIDER="resend", EMAIL_API_KEY="re_key")
    def test_otp_email_uses_api(self):
        from apps.accounts.emails import send_otp_email
        with mock.patch.object(email_backends.requests, "post", return_value=Resp(200)) as post:
            ok = send_otp_email(destination="ada@example.com", code="654321", purpose="signup", ttl_minutes=5)
        self.assertTrue(ok)
        self.assertIn("654321", post.call_args[1]["json"]["subject"])

    @override_settings(EMAIL_BACKEND=API, EMAIL_API_PROVIDER="brevo", EMAIL_API_KEY="secret-key-value")
    def test_command_reports_and_hides_key(self):
        out = StringIO()
        with mock.patch.object(email_backends.requests, "post", return_value=Resp(201)):
            call_command("send_test_email", "ada@example.com", stdout=out)
        self.assertIn("Sent to ada@example.com", out.getvalue())
        self.assertNotIn("secret-key-value", out.getvalue())

"""oam-security: brute-force limits, PIN lockout, is_staff on /auth/me/."""
from unittest import mock

from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.test import TestCase
from rest_framework.exceptions import Throttled
from rest_framework.test import APIClient
from rest_framework.throttling import SimpleRateThrottle

User = get_user_model()
LOGIN = "/api/v1/auth/login/"


def rates(**over):
    base = {"auth_login": "1000/min", "auth_login_account": "1000/hour", "auth_otp": "1000/min",
            "auth_otp_account": "1000/hour", "auth_reset": "1000/hour", "auth_reset_account": "1000/hour",
            "auth_register": "1000/hour", "auth_social": "1000/min"}
    base.update(over)
    return mock.patch.object(SimpleRateThrottle, "THROTTLE_RATES", base)


class SecurityTests(TestCase):
    def setUp(self):
        cache.clear()
        self.user = User.objects.create_user(email="ada@test.test", password="Str0ng-pass!x", first_name="Ada")
        self.user.is_verified = True
        self.user.save()
        self.c = APIClient()

    def login(self, ident, pw, ip="10.0.0.1"):
        return self.c.post(LOGIN, {"identifier": ident, "password": pw}, format="json", REMOTE_ADDR=ip)

    def test_per_account_limit_survives_ip_rotation(self):
        with rates(auth_login_account="3/hour"):
            for i in range(3):
                self.assertEqual(self.login("ada@test.test", "wrong", ip=f"10.0.0.{i + 1}").status_code, 401)
            r = self.login("ada@test.test", "wrong", ip="10.0.0.99")
            self.assertEqual(r.status_code, 429)
            # Case / whitespace changes don't reset the counter.
            self.assertEqual(self.login("  ADA@test.test ", "wrong", ip="10.0.0.100").status_code, 429)

    def test_per_ip_limit(self):
        with rates(auth_login="2/min"):
            self.assertEqual(self.login("a@x.test", "x").status_code, 401)
            self.assertEqual(self.login("b@x.test", "x").status_code, 401)
            self.assertEqual(self.login("c@x.test", "x").status_code, 429)

    def test_correct_login_still_works_under_limits(self):
        with rates():
            r = self.login("ada@test.test", "Str0ng-pass!x")
            self.assertEqual(r.status_code, 200)
            self.assertIn("is_staff", r.data["user"])
            self.assertFalse(r.data["user"]["is_staff"])

    def test_pin_lockout_after_five_wrong(self):
        self.user.set_transaction_pin("1234")
        self.user.save()
        for _ in range(5):
            self.assertFalse(self.user.check_transaction_pin("0000"))
        with self.assertRaises(Throttled):
            self.user.check_transaction_pin("1234")      # even the right PIN is refused while locked
        cache.clear()                                     # lock expires
        self.assertTrue(self.user.check_transaction_pin("1234"))

    def test_correct_pin_resets_counter(self):
        self.user.set_transaction_pin("1234")
        self.user.save()
        for _ in range(4):
            self.user.check_transaction_pin("0000")
        self.assertTrue(self.user.check_transaction_pin("1234"))
        for _ in range(4):
            self.assertFalse(self.user.check_transaction_pin("0000"))   # counter restarted: no lock yet

    def test_is_staff_is_read_only(self):
        self.c.force_authenticate(self.user)
        r = self.c.patch("/api/v1/auth/me/", {"is_staff": True}, format="json")
        self.assertIn(r.status_code, (200, 400))
        self.user.refresh_from_db()
        self.assertFalse(self.user.is_staff)
        self.assertIn("is_staff", self.c.get("/api/v1/auth/me/").data)

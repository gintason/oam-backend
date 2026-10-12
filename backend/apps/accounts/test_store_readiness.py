"""App-store requirements: in-app account deletion and Sign in with Apple."""
import time
from decimal import Decimal
from unittest import mock

import jwt
from cryptography.hazmat.primitives.asymmetric import rsa
from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from apps.accounts.social.apple import AppleVerifier
from apps.accounts.social.exceptions import SocialAuthError
from apps.accounts.tokens import tokens_for

User = get_user_model()
URL = "/api/v1/auth/delete-account/"


class AccountDeletionTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(email="ada@test.test", password="Secret123!", phone="+2348030000001",
                                             first_name="Ada", is_verified=True)
        self.client = APIClient()
        self.client.force_authenticate(self.user)

    def post(self, data):
        return self.client.post(URL, data, format="json", secure=True)

    def test_status_endpoint(self):
        r = self.client.get(URL, secure=True)
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.data, {"requires_password": True, "blockers": []})

    def test_wrong_password(self):
        r = self.post({"password": "nope"})
        self.assertEqual(r.status_code, 400)
        self.assertTrue(User.objects.get(pk=self.user.pk).is_active)

    def test_blocked_while_wallet_has_money(self):
        from apps.wallet.services import WalletService
        WalletService.credit(WalletService.get_or_create_wallet(self.user, "NGN"), Decimal("500"))
        r = self.post({"password": "Secret123!"})
        self.assertEqual(r.status_code, 409)
        self.assertIn("Withdraw or spend it first", r.data["detail"])
        self.assertTrue(User.objects.get(pk=self.user.pk).is_active)

    def test_deletes_and_signs_out(self):
        refresh = tokens_for(self.user)["refresh"]
        r = self.post({"password": "Secret123!"})
        self.assertEqual(r.status_code, 200)
        u = User.objects.get(pk=self.user.pk)
        self.assertFalse(u.is_active)
        self.assertTrue(u.email.endswith("@deleted.invalid"))
        self.assertIsNone(u.phone)
        self.assertEqual(u.first_name, "Deleted")
        self.assertFalse(u.has_usable_password())
        anon = APIClient()
        login = anon.post("/api/v1/auth/login/", {"identifier": "ada@test.test", "password": "Secret123!"},
                          format="json", secure=True)
        self.assertNotEqual(login.status_code, 200)                 # can't sign in again
        again = anon.post("/api/v1/auth/token/refresh/", {"refresh": refresh}, format="json", secure=True)
        self.assertNotEqual(again.status_code, 200)                 # old sessions are dead
        # The email/phone can be used to sign up afresh.
        User.objects.create_user(email="ada@test.test", password="x", phone="+2348030000001")

    def test_social_only_account_confirms_with_delete(self):
        social = User.objects.create_user(email="apple@test.test", password=None, auth_provider="apple", is_verified=True)
        c = APIClient(); c.force_authenticate(social)
        self.assertEqual(c.post(URL, {}, format="json", secure=True).status_code, 400)
        r = c.post(URL, {"confirm": "delete"}, format="json", secure=True)
        self.assertEqual(r.status_code, 200)
        self.assertFalse(User.objects.get(pk=social.pk).is_active)


class SignInWithAppleTests(TestCase):
    def setUp(self):
        self.key = rsa.generate_private_key(public_exponent=65537, key_size=2048)

    def token(self, aud):
        now = int(time.time())
        return jwt.encode({"iss": "https://appleid.apple.com", "aud": aud, "sub": "001234.abc", "email": "a@privaterelay.appleid.com",
                           "email_verified": "true", "iat": now, "exp": now + 600}, self.key, algorithm="RS256")

    def verify(self, token):
        signing = mock.Mock(key=self.key.public_key())
        with mock.patch("apps.accounts.social.apple.PyJWKClient") as client:
            client.return_value.get_signing_key_from_jwt.return_value = signing
            return AppleVerifier().verify(token, {"first_name": "Ada", "last_name": "Obi"})

    def test_ios_app_token_accepted_by_default(self):
        profile = self.verify(self.token("com.oam.mobile"))
        self.assertEqual(profile.provider_user_id, "001234.abc")
        self.assertEqual(profile.first_name, "Ada")

    def test_token_for_another_app_rejected(self):
        with self.assertRaises(SocialAuthError):
            self.verify(self.token("com.someone.else"))

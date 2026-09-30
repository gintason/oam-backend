#!/usr/bin/env python3
"""
OAM backend security hardening.

Run from the backend folder (the one with manage.py), after unzipping
oam-security-backend.zip there:

    python3 apply_security_backend.py --check    # preview
    python3 apply_security_backend.py            # apply (backs up as *.bak-security)

Safe to run more than once. What it does:
  1. Brute-force limits on login / OTP / password reset / register / Google
     sign-in — per IP and per account (apps/accounts/throttles.py).
  2. Transaction-PIN lockout: 5 wrong PINs → paused 15 minutes
     (apps/accounts/pin_lockout.py, wired into User.check_transaction_pin).
  3. Settings: Redis-backed cache when REDIS_URL is set, throttle rates,
     password-strength rules, 30-minute access tokens, API docs admin-only
     in production.
  4. /auth/me/ returns is_staff (read-only) so the web can show admin links
     without probing admin-only endpoints (the 403 in the console).
"""
from __future__ import annotations

import re
import shutil
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
CHECK = "--check" in sys.argv
MARK = "oam-security"
changed, skipped, problems = [], [], []


def read(rel):
    p = ROOT / rel
    return p.read_text(encoding="utf-8") if p.exists() else None


def write(rel, text):
    changed.append(rel)
    if CHECK:
        return
    p = ROOT / rel
    bak = p.with_name(p.name + ".bak-security")
    if p.exists() and not bak.exists():
        shutil.copy2(p, bak)
    p.write_text(text, encoding="utf-8")


SETTINGS_BLOCK = f'''

# --------------------------------------------------------------------------- #
# {MARK}: security hardening
# --------------------------------------------------------------------------- #
# Shared cache (throttle counters, PIN lockouts) — Redis when available so the
# limits hold across every worker; per-process memory otherwise.
_SEC_REDIS = env("REDIS_URL", default="")
if _SEC_REDIS:
    CACHES = {{"default": {{"BACKEND": "django.core.cache.backends.redis.RedisCache",
                          "LOCATION": _SEC_REDIS, "KEY_PREFIX": "oam"}}}}

# Brute-force limits for the public auth endpoints (see apps/accounts/throttles.py).
REST_FRAMEWORK = {{
    **REST_FRAMEWORK,
    "DEFAULT_THROTTLE_RATES": {{
        **REST_FRAMEWORK.get("DEFAULT_THROTTLE_RATES", {{}}),
        "auth_login": env("THROTTLE_AUTH_LOGIN", default="10/min"),           # per IP
        "auth_login_account": env("THROTTLE_AUTH_LOGIN_ACCOUNT", default="20/hour"),  # per email/phone
        "auth_otp": "10/min",
        "auth_otp_account": "15/hour",
        "auth_reset": "5/hour",
        "auth_reset_account": "5/hour",
        "auth_register": "20/hour",
        "auth_social": "30/min",
    }},
}}

# Password strength for new passwords (register / reset). The serializers
# already call validate_password(); until now no rules were configured.
AUTH_PASSWORD_VALIDATORS = [
    {{"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"}},
    {{"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator", "OPTIONS": {{"min_length": 8}}}},
    {{"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"}},
    {{"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"}},
]

# Short-lived access tokens: a leaked token is only useful briefly. The web and
# mobile apps refresh silently with the (rotating, blacklisted) refresh token.
SIMPLE_JWT = {{**SIMPLE_JWT,
              "ACCESS_TOKEN_LIFETIME": timedelta(minutes=env.int("JWT_ACCESS_MINUTES", default=30))}}

# Transaction PIN lockout (apps/accounts/pin_lockout.py).
PIN_MAX_ATTEMPTS = env.int("PIN_MAX_ATTEMPTS", default=5)
PIN_LOCK_MINUTES = env.int("PIN_LOCK_MINUTES", default=15)

# API schema / Swagger: public in development, admin-only in production.
if not DEBUG:
    SPECTACULAR_SETTINGS = {{**SPECTACULAR_SETTINGS,
                            "SERVE_PERMISSIONS": ["rest_framework.permissions.IsAdminUser"]}}
'''


def patch_settings():
    rel = "config/settings/base.py"
    s = read(rel)
    if s is None:
        problems.append(f"{rel}: not found")
        return
    if f"{MARK}: security hardening" in s:
        skipped.append(rel)
        return
    for need in ("REST_FRAMEWORK", "SIMPLE_JWT", "SPECTACULAR_SETTINGS", "from datetime import timedelta"):
        if need not in s:
            problems.append(f"{rel}: expected `{need}` — settings block not added")
            return
    write(rel, s.rstrip("\n") + "\n" + SETTINGS_BLOCK)


# view class -> (IP scope, per-account scope or None)
VIEW_SCOPES = {
    "RegisterView": ("auth_register", None),
    "VerifyOTPView": ("auth_otp", "auth_otp_account"),
    "ResendOTPView": ("auth_otp", "auth_otp_account"),
    "LoginView": ("auth_login", "auth_login_account"),
    "SocialAuthView": ("auth_social", None),
    "PasswordResetRequestView": ("auth_reset", "auth_reset_account"),
    "PasswordResetConfirmView": ("auth_otp", "auth_otp_account"),
}


def patch_views():
    rel = "apps/accounts/views.py"
    s = read(rel)
    if s is None:
        problems.append(f"{rel}: not found")
        return
    if "AUTH_THROTTLES" in s:
        skipped.append(rel)
        return
    for cls, (scope, acct) in VIEW_SCOPES.items():
        m = re.search(rf"^class {cls}\(APIView\):\n(?:(?:[ \t]*(?:\"\"\".*?\"\"\"|#[^\n]*)\n)|\n)*?([ \t]+)permission_classes = \[AllowAny\]\n",
                      s, flags=re.M | re.S)
        if not m:
            problems.append(f"{rel}: {cls} (permission_classes = [AllowAny]) not found — not throttled")
            continue
        ind = m.group(1)
        extra = f"{ind}throttle_classes = AUTH_THROTTLES   # {MARK}: brute-force limits\n{ind}throttle_scope = \"{scope}\"\n"
        if acct:
            extra += f"{ind}identifier_throttle_scope = \"{acct}\"\n"
        s = s[:m.end()] + extra + s[m.end():]
    imp = "from .otp import issue_otp, verify_otp"
    if imp not in s:
        problems.append(f"{rel}: import anchor not found")
        return
    s = s.replace(imp, imp + f"\nfrom .throttles import AUTH_THROTTLES  # {MARK}", 1)
    write(rel, s)


def patch_serializer():
    rel = "apps/accounts/serializers.py"
    s = read(rel)
    if s is None:
        problems.append(f"{rel}: not found")
        return
    old_f = '''        fields = ("id", "email", "phone", "first_name", "last_name",
                  "preferred_language", "auth_provider", "is_verified")
        read_only_fields = ("id", "auth_provider", "is_verified")'''
    new_f = '''        fields = ("id", "email", "phone", "first_name", "last_name",
                  "preferred_language", "auth_provider", "is_verified", "is_staff")
        read_only_fields = ("id", "auth_provider", "is_verified", "is_staff")'''
    if new_f in s:
        skipped.append(rel)
        return
    if old_f not in s:
        problems.append(f"{rel}: UserSerializer fields not in the expected shape — add \"is_staff\" "
                        "to fields AND read_only_fields yourself")
        return
    write(rel, s.replace(old_f, new_f, 1))


def patch_model():
    rel = "apps/accounts/models.py"
    s = read(rel)
    if s is None:
        problems.append(f"{rel}: not found")
        return
    if "pin_lockout" in s:
        skipped.append(rel)
        return
    old = '''    def check_transaction_pin(self, raw_pin: str) -> bool:
        """Verify a raw PIN against the stored hash."""
        from django.contrib.auth.hashers import check_password
        if not self.transaction_pin:
            return False
        return check_password(str(raw_pin), self.transaction_pin)'''
    new = '''    def check_transaction_pin(self, raw_pin: str) -> bool:
        """Verify a raw PIN against the stored hash.

        oam-security: after too many wrong PINs this raises Throttled (HTTP 429)
        instead of checking, so the 4-digit PIN can't be brute-forced.
        """
        from django.contrib.auth.hashers import check_password
        from .pin_lockout import ensure_not_locked, record_result
        if not self.transaction_pin:
            return False
        ensure_not_locked(self.pk)
        ok = check_password(str(raw_pin), self.transaction_pin)
        record_result(self.pk, ok)
        return ok'''
    if old not in s:
        problems.append(f"{rel}: check_transaction_pin not in the expected shape — PIN lockout not wired")
        return
    write(rel, s.replace(old, new, 1))


def main():
    if not (ROOT / "manage.py").exists():
        sys.exit("Run this from the backend folder (the one with manage.py).")
    for f in ("apps/accounts/throttles.py", "apps/accounts/pin_lockout.py"):
        if not (ROOT / f).exists():
            sys.exit(f"{f} is missing — unzip oam-security-backend.zip here first.")
    patch_settings()
    patch_views()
    patch_serializer()
    patch_model()
    print(("Would change: " if CHECK else "Changed: ") + (", ".join(changed) or "nothing"))
    if skipped:
        print("Already done: " + ", ".join(skipped))
    if problems:
        print("\nNEEDS ATTENTION:")
        for p in problems:
            print("  - " + p)
        sys.exit(2)
    print("\nNext: python manage.py test apps.accounts --settings=config.settings.test")


if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""
Admin: "Close & anonymise selected accounts" for users who can't be deleted.

Django's "Delete selected users" refuses anyone with wallet/payment history
(those records are protected so the books balance). This adds an action on
Admin > Users that does what the app's "Delete account" does: sign-in blocked,
personal details erased, listings/profiles/jobs taken down, financial records
kept (anonymised). Users with money still in their wallet are skipped.

Also fixes a bug in account deletion: riders weren't taken offline/suspended.

Needs apps/accounts/deletion.py (from oam-store-release-backend.zip).
Unzip in the backend root (with manage.py), then:
    python3 apply_admin_close.py
No migrations. Redeploy afterwards.
"""
import json, shutil, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
FILES = json.loads('{"apps/accounts/admin_close.py": "\\"\\"\\"\\nAdmin action: close & anonymise user accounts.\\n\\nDjango\'s built-in \\"Delete selected users\\" can\'t remove anyone with money\\nhistory: wallets, ledger accounts, payments and transfers are PROTECTed so the\\nbooks always balance (and a money app must keep these records by law). This\\naction does what the app\'s own \\"Delete account\\" does instead: the person can\\nnever sign in again, their personal details are erased and their listings,\\nprofiles and jobs are taken down, while the financial records stay, anonymised.\\n\\"\\"\\"\\nfrom django.contrib import admin, messages\\nfrom django.template.response import TemplateResponse\\n\\nfrom .deletion import delete_account, deletion_blockers\\nfrom .models import User\\n\\n\\ndef _is_closed(user) -> bool:\\n    return not user.is_active and (user.email or \\"\\").endswith(\\"@deleted.invalid\\")\\n\\n\\ndef _skip_reason(request, user) -> str | None:\\n    if user.pk == request.user.pk:\\n        return \\"that\'s your own account\\"\\n    if user.is_superuser:\\n        return \\"superuser accounts can\'t be closed here\\"\\n    if _is_closed(user):\\n        return \\"already closed\\"\\n    reasons = deletion_blockers(user)\\n    return \\" \\".join(reasons) if reasons else None\\n\\n\\n@admin.action(description=\\"Close & anonymise selected accounts (keeps financial records)\\",\\n              permissions=[\\"change\\"])\\ndef close_and_anonymise(modeladmin, request, queryset):\\n    users = list(queryset)\\n    rows = [(u, _skip_reason(request, u)) for u in users]\\n\\n    if request.POST.get(\\"confirm\\") != \\"yes\\":\\n        return TemplateResponse(request, \\"admin/accounts/close_confirm.html\\", {\\n            **modeladmin.admin_site.each_context(request),\\n            \\"title\\": \\"Close & anonymise accounts\\",\\n            \\"opts\\": modeladmin.model._meta,\\n            \\"rows\\": rows,\\n            \\"closable\\": [u for u, r in rows if r is None],\\n            \\"action_checkbox_name\\": admin.helpers.ACTION_CHECKBOX_NAME,\\n        })\\n\\n    closed = 0\\n    for user, reason in rows:\\n        if reason is not None:\\n            modeladmin.message_user(request, f\\"Skipped {user.identifier}: {reason}\\", messages.WARNING)\\n            continue\\n        label = user.identifier\\n        delete_account(user)\\n        modeladmin.log_change(request, user, \\"Closed & anonymised from admin\\")\\n        closed += 1\\n        modeladmin.message_user(request, f\\"Closed {label}\\", messages.SUCCESS)\\n    if not closed:\\n        modeladmin.message_user(request, \\"No accounts were closed.\\", messages.INFO)\\n    return None\\n\\n\\n_user_admin = admin.site._registry.get(User)\\nif _user_admin is not None:\\n    _user_admin.actions = [*(_user_admin.actions or []), close_and_anonymise]\\n", "apps/accounts/templates/admin/accounts/close_confirm.html": "{% extends \\"admin/base_site.html\\" %}\\n{% block breadcrumbs %}\\n<div class=\\"breadcrumbs\\">\\n  <a href=\\"{% url \'admin:index\' %}\\">Home</a> &rsaquo;\\n  <a href=\\"{% url \'admin:accounts_user_changelist\' %}\\">Users</a> &rsaquo; Close &amp; anonymise\\n</div>\\n{% endblock %}\\n{% block content %}\\n<p>Closing an account works like the app\'s own <strong>Delete account</strong>:</p>\\n<ul>\\n  <li>the person can never sign in again (all sessions are signed out);</li>\\n  <li>their name, email, phone, PIN and devices are erased;</li>\\n  <li>their listings, artisan profile, CV, jobs and rider status are taken down;</li>\\n  <li>wallet, payment and delivery records are <strong>kept, anonymised</strong>, so your books still balance.</li>\\n</ul>\\n<p><strong>This can\'t be undone.</strong></p>\\n\\n<table>\\n  <thead><tr><th>Account</th><th>Result</th></tr></thead>\\n  <tbody>\\n  {% for user, reason in rows %}\\n    <tr>\\n      <td>{{ user.identifier }}</td>\\n      <td>{% if reason %}<span style=\\"color:#b45309\\">Will be skipped: {{ reason }}</span>{% else %}<span style=\\"color:#0b7327\\">Will be closed</span>{% endif %}</td>\\n    </tr>\\n  {% endfor %}\\n  </tbody>\\n</table>\\n\\n<form method=\\"post\\" style=\\"margin-top:20px\\">{% csrf_token %}\\n  {% for user, reason in rows %}<input type=\\"hidden\\" name=\\"{{ action_checkbox_name }}\\" value=\\"{{ user.pk }}\\">{% endfor %}\\n  <input type=\\"hidden\\" name=\\"action\\" value=\\"close_and_anonymise\\">\\n  <input type=\\"hidden\\" name=\\"confirm\\" value=\\"yes\\">\\n  {% if closable %}\\n    <input type=\\"submit\\" class=\\"default\\" style=\\"background:#ba2121\\" value=\\"Yes, close {{ closable|length }} account{{ closable|length|pluralize }}\\">\\n  {% endif %}\\n  <a href=\\"{% url \'admin:accounts_user_changelist\' %}\\" class=\\"button cancel-link\\">Go back</a>\\n</form>\\n{% endblock %}\\n", "apps/accounts/test_admin_close.py": "from decimal import Decimal\\n\\nfrom django.contrib.auth import get_user_model\\nfrom django.test import TestCase, override_settings\\n\\nfrom apps.wallet.services import WalletService\\n\\nUser = get_user_model()\\nURL = \\"/admin/accounts/user/\\"\\n\\n\\n@override_settings(SECURE_SSL_REDIRECT=False)\\nclass CloseAndAnonymiseAdminTests(TestCase):\\n    def setUp(self):\\n        self.admin = User.objects.create_superuser(email=\\"boss@oam.test\\", password=\\"Admin-pass-123!\\")\\n        self.client.force_login(self.admin)\\n        self.plain = User.objects.create_user(email=\\"plain@oam.test\\", password=\\"x-Pass-12345\\")\\n        # A user with money history: the built-in delete is blocked by PROTECTed ledger rows.\\n        self.money = User.objects.create_user(email=\\"money@oam.test\\", password=\\"x-Pass-12345\\")\\n        w = WalletService.get_or_create_wallet(self.money, \\"NGN\\")\\n        WalletService.credit(w, Decimal(\\"500\\"), description=\\"fund\\")\\n        WalletService.debit(w, Decimal(\\"500\\"), description=\\"spend\\")\\n        self.rich = User.objects.create_user(email=\\"rich@oam.test\\", password=\\"x-Pass-12345\\")\\n        WalletService.credit(WalletService.get_or_create_wallet(self.rich, \\"NGN\\"), Decimal(\\"200\\"), description=\\"fund\\")\\n\\n    def post(self, ids, **extra):\\n        return self.client.post(URL, {\\"action\\": \\"close_and_anonymise\\", \\"_selected_action\\": [str(i) for i in ids], **extra}, follow=True)\\n\\n    def test_action_listed(self):\\n        r = self.client.get(URL)\\n        self.assertContains(r, \\"Close &amp; anonymise selected accounts\\")\\n\\n    def test_confirmation_page_changes_nothing(self):\\n        r = self.post([self.money.pk, self.rich.pk])\\n        self.assertContains(r, \\"Will be closed\\")\\n        self.assertContains(r, \\"Will be skipped\\")\\n        self.money.refresh_from_db()\\n        self.assertTrue(self.money.is_active)\\n\\n    def test_confirm_closes_user_with_money_history_and_keeps_wallet(self):\\n        from apps.wallet.models import Wallet\\n        r = self.post([self.money.pk, self.plain.pk], confirm=\\"yes\\")\\n        self.assertEqual(r.status_code, 200)\\n        for u in (self.money, self.plain):\\n            u.refresh_from_db()\\n            self.assertFalse(u.is_active)\\n            self.assertTrue(u.email.endswith(\\"@deleted.invalid\\"))\\n            self.assertFalse(u.has_usable_password())\\n        self.assertTrue(Wallet.objects.filter(user=self.money).exists())\\n\\n    def test_skips_balance_superuser_and_self(self):\\n        other_super = User.objects.create_superuser(email=\\"su2@oam.test\\", password=\\"Admin-pass-123!\\")\\n        r = self.post([self.rich.pk, other_super.pk, self.admin.pk], confirm=\\"yes\\")\\n        self.assertContains(r, \\"Skipped rich@oam.test\\")\\n        self.assertContains(r, \\"No accounts were closed.\\")\\n        for u in (self.rich, other_super, self.admin):\\n            u.refresh_from_db()\\n            self.assertTrue(u.is_active)\\n\\n\\n@override_settings(SECURE_SSL_REDIRECT=False)\\nclass RiderClosedTests(TestCase):\\n    def test_closing_a_rider_takes_them_offline_and_suspends(self):\\n        from apps.deliveries.models import RiderProfile\\n        from apps.accounts.deletion import delete_account\\n        u = User.objects.create_user(email=\\"rider@oam.test\\", password=\\"x-Pass-12345\\")\\n        r = RiderProfile.objects.create(user=u, full_name=\\"Rider\\", phone=\\"0800000000\\", vehicle_type=\\"motorcycle\\",\\n                                        verification_status=\\"approved\\", availability=\\"online\\")\\n        with self.assertNoLogs(\\"accounts\\", level=\\"ERROR\\"):\\n            delete_account(u)\\n        r.refresh_from_db()\\n        self.assertEqual(r.availability, RiderProfile.Availability.OFFLINE)\\n        self.assertEqual(r.verification_status, RiderProfile.Verification.SUSPENDED)\\n"}')

def die(msg):
    print(msg); sys.exit(1)

if not (ROOT / "manage.py").exists():
    die("Run this from the backend root (the folder with manage.py).")
deletion = ROOT / "apps/accounts/deletion.py"
admin_py = ROOT / "apps/accounts/admin.py"
if not deletion.exists():
    die("apps/accounts/deletion.py is missing - install oam-store-release-backend.zip first, then run this again.")
if not admin_py.exists():
    die("apps/accounts/admin.py not found.")

d = deletion.read_text(encoding="utf-8")
bad = "            verification=RiderProfile.Verification.SUSPENDED)"
good = "            verification_status=RiderProfile.Verification.SUSPENDED)"
if bad in d:
    shutil.copy2(deletion, deletion.with_name("deletion.py.bak-adminclose"))
    deletion.write_text(d.replace(bad, good), encoding="utf-8")
    print("Fixed rider step in apps/accounts/deletion.py")
elif good in d:
    print("deletion.py already fixed")
else:
    print("note: rider line in deletion.py not found - left as is")

for rel, text in FILES.items():
    p = ROOT / rel
    p.parent.mkdir(parents=True, exist_ok=True)
    if p.exists() and p.read_text(encoding="utf-8") == text:
        print("up to date:", rel); continue
    p.write_text(text, encoding="utf-8"); print("wrote:", rel)

a = admin_py.read_text(encoding="utf-8")
if "admin_close" not in a:
    shutil.copy2(admin_py, admin_py.with_name("admin.py.bak-adminclose"))
    admin_py.write_text(a.rstrip("\n") + "\n\n\n# \"Close & anonymise\" action (financial records are kept; see admin_close.py).\nfrom . import admin_close  # noqa: E402,F401\n", encoding="utf-8")
    print("Hooked the action into apps/accounts/admin.py")
else:
    print("admin.py already hooked")
print("Done. Test: python manage.py test apps.accounts.test_admin_close")

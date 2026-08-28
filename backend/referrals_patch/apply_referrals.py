#!/usr/bin/env python3
"""
Referral & Earnings System for OAM — backend.

Adds a new app `apps.referrals`:
  * Models: ReferralProfile, ReferralRelationship, ReferralCommissionLog,
    ReferralNotification (+ hand-written 0001 migration).
  * Commission engine: a referrer earns 5% of OAM's profit on a referred user's
    transaction, but ONLY when OAM's NGN profit on that transaction is >= ₦5,000.
    The commission is credited atomically to the referrer's NGN wallet (drawn
    from OAM revenue), logged immutably, and an in-app notification is raised.
  * Signal hook: settlement points (bills, subscription, boost) fire
    `settle_referral(...)` which, on commit, sends `transaction_settled`; the
    receiver evaluates the threshold and pays out.
  * Endpoints: POST /api/v1/referrals/generate-link/, GET /api/v1/referrals/dashboard/.
  * Registration accepts an optional `referral_code` (or a full /refer-slug-code link).

Wires (guarded edits): settings INSTALLED_APPS, config/urls.py, accounts
register serializer + view, and the three settlement points.

RUN FROM BACKEND ROOT:
    python3 referrals_patch/apply_referrals.py
    python manage.py migrate
"""
import os
import sys

ROOT = sys.argv[1] if len(sys.argv) > 1 else "."


def _p(*parts):
    return os.path.join(ROOT, *parts)


def write(path, content):
    full = _p(path)
    os.makedirs(os.path.dirname(full), exist_ok=True)
    with open(full, "w", encoding="utf-8") as f:
        f.write(content)
    print(f"  + wrote {path}")


def edit(path, subs):
    full = _p(path)
    if not os.path.exists(full):
        sys.exit(f"ABORT: expected file not found: {path}")
    s = open(full, encoding="utf-8").read()
    for old, new in subs:
        if new in s:
            print(f"  = {path}: already applied, skipping one edit")
            continue
        if s.count(old) != 1:
            sys.exit(f"ABORT: anchor not found exactly once in {path}:\n---\n{old[:160]}\n---")
        s = s.replace(old, new, 1)
    open(full, "w", encoding="utf-8").write(s)
    print(f"  + patched {path}")


# ============================================================ app files
write("apps/referrals/__init__.py", "")

write("apps/referrals/apps.py", '''from django.apps import AppConfig


class ReferralsConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.referrals"

    def ready(self):
        # Connect the commission receiver to the transaction_settled signal.
        from . import services  # noqa: F401
''')

write("apps/referrals/models.py", '''from django.conf import settings
from django.db import models

from apps.common.models import TimeStampedModel


class ReferralProfile(TimeStampedModel):
    """A user's referral identity: their customisable slug + unique code."""
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
                                related_name="referral_profile")
    custom_slug = models.SlugField(max_length=40)
    referral_code = models.CharField(max_length=16, unique=True, db_index=True)
    total_earnings = models.DecimalField(max_digits=20, decimal_places=2, default=0)   # NGN
    total_referrals_count = models.PositiveIntegerField(default=0)

    def link(self) -> str:
        return f"https://oam-app.com/refer-{self.custom_slug}-{self.referral_code}"

    def __str__(self):
        return f"{self.user} · {self.referral_code}"


class ReferralRelationship(TimeStampedModel):
    """Records that `referee` signed up through `referrer`."""
    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        ACTIVE = "active", "Active"      # becomes ACTIVE once they earn a commission

    referrer = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
                                 related_name="referrals_made")
    referee = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
                                   related_name="referred_by")
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.PENDING)

    def __str__(self):
        return f"{self.referrer} -> {self.referee} [{self.status}]"


class ReferralCommissionLog(TimeStampedModel):
    """Immutable record of a paid referral commission (one per source txn)."""
    referrer = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
                                 related_name="referral_commissions")
    referee = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
                                null=True, blank=True, related_name="referral_commissions_generated")
    source_transaction_id = models.CharField(max_length=120, unique=True, db_index=True)
    oam_profit_amount = models.DecimalField(max_digits=20, decimal_places=2)   # NGN
    commission_amount = models.DecimalField(max_digits=20, decimal_places=2)   # NGN

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.referrer} +{self.commission_amount} ({self.source_transaction_id})"


class ReferralNotification(TimeStampedModel):
    """Lightweight in-app notification (surfaced by the dashboard endpoint)."""
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
                             related_name="referral_notifications")
    message = models.CharField(max_length=255)
    seen = models.BooleanField(default=False)

    class Meta:
        ordering = ["-created_at"]
''')

write("apps/referrals/signals.py", '''import django.dispatch

# Fired (on transaction commit) whenever a user completes a transaction that
# realised OAM profit. Args: user, oam_profit (Decimal), currency, source_reference.
transaction_settled = django.dispatch.Signal()
''')

write("apps/referrals/hooks.py", '''"""
Tiny integration surface for other apps. A settlement point calls
`settle_referral(...)` after finalising a transaction; we defer the actual
evaluation to transaction commit so a commission failure can never roll back
(or block) the underlying settlement.
"""
from django.db import transaction

from .signals import transaction_settled


def settle_referral(*, user, oam_profit, currency="NGN", source_reference):
    if user is None or not source_reference:
        return

    def _fire():
        transaction_settled.send(
            sender="referrals", user=user, oam_profit=oam_profit,
            currency=currency, source_reference=source_reference,
        )

    transaction.on_commit(_fire)
''')

write("apps/referrals/services.py", '''import re
import secrets
from decimal import Decimal, ROUND_DOWN

from django.db import transaction
from django.db.models import F
from django.dispatch import receiver
from django.utils.text import slugify

from apps.wallet.services import WalletService, REVENUE_ACCOUNT

from .models import (ReferralProfile, ReferralRelationship,
                     ReferralCommissionLog, ReferralNotification)
from .signals import transaction_settled

COMMISSION_RATE = Decimal("0.05")            # 5%
PROFIT_THRESHOLD_NGN = Decimal("5000")       # only pays out at/above this OAM profit

# NGN per 1 unit of currency (inverse of the display rates), for the threshold
# check + payout when a referred transaction is not in NGN.
_NGN_PER_UNIT = {
    "NGN": Decimal("1"),
    "USD": Decimal("1538.46"),
    "GBP": Decimal("1960.78"),
    "EUR": Decimal("1666.67"),
}


class ReferralService:
    # ---------------- identity / link ----------------
    @staticmethod
    def _new_code() -> str:
        while True:
            raw = secrets.token_hex(4)  # 8 hex chars
            code = raw.lower()
            if not ReferralProfile.objects.filter(referral_code=code).exists():
                return code

    @staticmethod
    def _slug_base(user) -> str:
        base = user.first_name or (user.email or "").split("@")[0] or "oam"
        return slugify(base)[:40] or "oam"

    @staticmethod
    def ensure_profile(user) -> ReferralProfile:
        prof = ReferralProfile.objects.filter(user=user).first()
        if prof:
            return prof
        return ReferralProfile.objects.create(
            user=user, custom_slug=ReferralService._slug_base(user),
            referral_code=ReferralService._new_code(),
        )

    @staticmethod
    def set_slug(user, slug: str) -> ReferralProfile:
        prof = ReferralService.ensure_profile(user)
        clean = slugify(slug or "")[:40]
        if clean:
            prof.custom_slug = clean
            prof.save(update_fields=["custom_slug", "updated_at"])
        return prof

    @staticmethod
    def resolve_code(code):
        """Accept a bare code, or a full '/refer-slug-CODE' link, and return the profile."""
        if not code:
            return None
        text = str(code).strip()
        # the code is the trailing alphanumeric run
        m = re.search(r"([A-Za-z0-9]{6,})\\s*$", text)
        key = (m.group(1) if m else text).lower()
        return ReferralProfile.objects.filter(referral_code=key).select_related("user").first()

    # ---------------- relationship ----------------
    @staticmethod
    @transaction.atomic
    def attach_referral(user, code):
        """Link a newly-registered `user` to the owner of `code` (once)."""
        prof = ReferralService.resolve_code(code)
        if not prof or prof.user_id == user.id:
            return None
        if ReferralRelationship.objects.filter(referee=user).exists():
            return None
        rel = ReferralRelationship.objects.create(referrer=prof.user, referee=user)
        ReferralProfile.objects.filter(pk=prof.pk).update(
            total_referrals_count=F("total_referrals_count") + 1)
        return rel

    # ---------------- commission engine ----------------
    @staticmethod
    def _to_ngn(amount, currency) -> Decimal:
        rate = _NGN_PER_UNIT.get(str(currency or "NGN").upper(), Decimal("1"))
        return Decimal(str(amount)) * rate

    @staticmethod
    @transaction.atomic
    def reward_if_qualifies(*, user, oam_profit, currency="NGN", source_reference):
        """Pay the referrer 5% if OAM's NGN profit on this txn >= ₦5,000. Idempotent."""
        rel = (ReferralRelationship.objects
               .select_related("referrer", "referee")
               .filter(referee=user).first())
        if not rel:
            return None

        profit_ngn = ReferralService._to_ngn(oam_profit, currency)
        if profit_ngn < PROFIT_THRESHOLD_NGN:
            return None
        if ReferralCommissionLog.objects.filter(source_transaction_id=source_reference).exists():
            return None  # already paid for this transaction

        commission = (profit_ngn * COMMISSION_RATE).quantize(Decimal("0.01"), rounding=ROUND_DOWN)
        if commission <= 0:
            return None

        referrer = rel.referrer
        wallet = WalletService.get_or_create_wallet(referrer, "NGN")
        WalletService.credit(
            wallet, commission, source_code=REVENUE_ACCOUNT,
            description=f"Referral commission ({rel.referee.first_name or 'a referral'})",
            reference=source_reference, idempotency_key=f"referral:{source_reference}",
            metadata={"type": "REFERRAL_COMMISSION", "referee": str(rel.referee_id),
                      "source": str(source_reference)},
        )
        log = ReferralCommissionLog.objects.create(
            referrer=referrer, referee=rel.referee, source_transaction_id=str(source_reference),
            oam_profit_amount=profit_ngn.quantize(Decimal("0.01")), commission_amount=commission,
        )
        ReferralProfile.objects.filter(user=referrer).update(
            total_earnings=F("total_earnings") + commission)
        if rel.status != ReferralRelationship.Status.ACTIVE:
            ReferralRelationship.objects.filter(pk=rel.pk).update(
                status=ReferralRelationship.Status.ACTIVE)
        ReferralService._notify(referrer, commission, rel.referee)
        return log

    @staticmethod
    def _notify(referrer, amount, referee):
        """In-app notification. Push (Expo/FCM) can hook in here once device tokens exist."""
        try:
            ReferralNotification.objects.create(
                user=referrer,
                message=(f"You earned ₦{amount:,.2f} from a referral transaction "
                         f"by {referee.first_name or 'a referral'}!"),
            )
        except Exception:
            pass

    # ---------------- dashboard ----------------
    @staticmethod
    def dashboard(user):
        prof = ReferralService.ensure_profile(user)
        logs = list(ReferralCommissionLog.objects.filter(referrer=user)
                    .select_related("referee")[:20])
        total_refs = ReferralRelationship.objects.filter(referrer=user).count()
        active = ReferralRelationship.objects.filter(
            referrer=user, status=ReferralRelationship.Status.ACTIVE).count()
        wallet = WalletService.get_or_create_wallet(user, "NGN")
        return {"profile": prof, "logs": logs, "total_referrals": total_refs,
                "active_referrals": active, "wallet_balance": wallet.cached_balance}


@receiver(transaction_settled)
def _on_transaction_settled(sender, user, oam_profit, currency="NGN", source_reference=None, **kwargs):
    try:
        ReferralService.reward_if_qualifies(
            user=user, oam_profit=oam_profit, currency=currency,
            source_reference=source_reference)
    except Exception:
        # never let a commission problem bubble into the caller
        pass
''')

write("apps/referrals/serializers.py", '''from rest_framework import serializers

from .models import ReferralCommissionLog


class GenerateLinkSerializer(serializers.Serializer):
    custom_slug = serializers.CharField(required=False, allow_blank=True, max_length=40)


class CommissionLogSerializer(serializers.ModelSerializer):
    referee_name = serializers.SerializerMethodField()

    class Meta:
        model = ReferralCommissionLog
        fields = ["id", "referee_name", "source_transaction_id",
                  "oam_profit_amount", "commission_amount", "created_at"]

    def get_referee_name(self, obj):
        if not obj.referee:
            return "A referral"
        return (obj.referee.first_name or obj.referee.email or "A referral")
''')

write("apps/referrals/views.py", '''from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import ReferralNotification
from .serializers import CommissionLogSerializer, GenerateLinkSerializer
from .services import ReferralService, COMMISSION_RATE, PROFIT_THRESHOLD_NGN


def _profile_payload(profile):
    return {
        "referral_code": profile.referral_code,
        "custom_slug": profile.custom_slug,
        "link": profile.link(),
        "total_earnings": str(profile.total_earnings),
        "total_referrals_count": profile.total_referrals_count,
    }


class GenerateLinkView(APIView):
    """POST /api/v1/referrals/generate-link/ — create or rename the user's referral slug."""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = GenerateLinkSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        slug = serializer.validated_data.get("custom_slug")
        profile = (ReferralService.set_slug(request.user, slug) if slug
                   else ReferralService.ensure_profile(request.user))
        return Response(_profile_payload(profile))


class DashboardView(APIView):
    """GET /api/v1/referrals/dashboard/ — link, stats, balance, recent commissions."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        data = ReferralService.dashboard(request.user)
        # surface + clear unseen in-app notifications
        notes = list(ReferralNotification.objects.filter(user=request.user, seen=False)[:10])
        if notes:
            ReferralNotification.objects.filter(id__in=[n.id for n in notes]).update(seen=True)
        return Response({
            **_profile_payload(data["profile"]),
            "stats": {
                "total_referrals": data["total_referrals"],
                "active_referrals": data["active_referrals"],
                "total_earned": str(data["profile"].total_earnings),
            },
            "wallet_balance": str(data["wallet_balance"]),
            "commission_rate": str(COMMISSION_RATE),
            "profit_threshold": str(PROFIT_THRESHOLD_NGN),
            "recent_commissions": CommissionLogSerializer(data["logs"], many=True).data,
            "notifications": [n.message for n in notes],
        })
''')

write("apps/referrals/urls.py", '''from django.urls import path

from .views import DashboardView, GenerateLinkView

urlpatterns = [
    path("generate-link/", GenerateLinkView.as_view(), name="referral-generate-link"),
    path("dashboard/", DashboardView.as_view(), name="referral-dashboard"),
]
''')

write("apps/referrals/admin.py", '''from django.contrib import admin

from .models import (ReferralProfile, ReferralRelationship,
                     ReferralCommissionLog, ReferralNotification)

admin.site.register(ReferralProfile)
admin.site.register(ReferralRelationship)
admin.site.register(ReferralCommissionLog)
admin.site.register(ReferralNotification)
''')

write("apps/referrals/migrations/__init__.py", "")

write("apps/referrals/migrations/0001_initial.py", '''from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="ReferralProfile",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_at", models.DateTimeField(auto_now_add=True, db_index=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("custom_slug", models.SlugField(max_length=40)),
                ("referral_code", models.CharField(db_index=True, max_length=16, unique=True)),
                ("total_earnings", models.DecimalField(decimal_places=2, default=0, max_digits=20)),
                ("total_referrals_count", models.PositiveIntegerField(default=0)),
                ("user", models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name="referral_profile", to=settings.AUTH_USER_MODEL)),
            ],
            options={"abstract": False},
        ),
        migrations.CreateModel(
            name="ReferralRelationship",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_at", models.DateTimeField(auto_now_add=True, db_index=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("status", models.CharField(choices=[("pending", "Pending"), ("active", "Active")], default="pending", max_length=10)),
                ("referee", models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name="referred_by", to=settings.AUTH_USER_MODEL)),
                ("referrer", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="referrals_made", to=settings.AUTH_USER_MODEL)),
            ],
            options={"abstract": False},
        ),
        migrations.CreateModel(
            name="ReferralCommissionLog",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_at", models.DateTimeField(auto_now_add=True, db_index=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("source_transaction_id", models.CharField(db_index=True, max_length=120, unique=True)),
                ("oam_profit_amount", models.DecimalField(decimal_places=2, max_digits=20)),
                ("commission_amount", models.DecimalField(decimal_places=2, max_digits=20)),
                ("referee", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="referral_commissions_generated", to=settings.AUTH_USER_MODEL)),
                ("referrer", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="referral_commissions", to=settings.AUTH_USER_MODEL)),
            ],
            options={"ordering": ["-created_at"]},
        ),
        migrations.CreateModel(
            name="ReferralNotification",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_at", models.DateTimeField(auto_now_add=True, db_index=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("message", models.CharField(max_length=255)),
                ("seen", models.BooleanField(default=False)),
                ("user", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="referral_notifications", to=settings.AUTH_USER_MODEL)),
            ],
            options={"ordering": ["-created_at"]},
        ),
    ]
''')

# ============================================================ wiring edits
# settings: INSTALLED_APPS
edit("config/settings/base.py", [(
    '    "apps.affiliates",      # affiliate link generation + click/conversion tracking',
    '    "apps.affiliates",      # affiliate link generation + click/conversion tracking\n'
    '    "apps.referrals",       # user referral links + 5% commission engine',
)])

# config/urls.py
edit("config/urls.py", [(
    '    path("api/v1/marketplace/", include("apps.marketplace.urls")),',
    '    path("api/v1/marketplace/", include("apps.marketplace.urls")),\n'
    '    path("api/v1/referrals/", include("apps.referrals.urls")),',
)])

# accounts: register serializer accepts referral_code
edit("apps/accounts/serializers.py", [(
    '    preferred_language = serializers.ChoiceField(\n'
    '        choices=[code for code, _ in settings.LANGUAGES], default="en"\n'
    '    )',
    '    preferred_language = serializers.ChoiceField(\n'
    '        choices=[code for code, _ in settings.LANGUAGES], default="en"\n'
    '    )\n'
    '    referral_code = serializers.CharField(required=False, allow_blank=True, allow_null=True, max_length=120)',
)])

# accounts: RegisterView attaches the referral relationship
edit("apps/accounts/views.py", [(
    '        serializer = RegisterSerializer(data=request.data)\n'
    '        serializer.is_valid(raise_exception=True)\n'
    '        user = serializer.save()',
    '        serializer = RegisterSerializer(data=request.data)\n'
    '        serializer.is_valid(raise_exception=True)\n'
    '        user = serializer.save()\n'
    '        ref_code = serializer.validated_data.get("referral_code")\n'
    '        if ref_code:\n'
    '            try:\n'
    '                from apps.referrals.services import ReferralService\n'
    '                ReferralService.attach_referral(user, ref_code)\n'
    '            except Exception:\n'
    '                pass',
)])

# billing: settle referral after a bill order captures OAM revenue
edit("apps/billing/services.py", [(
    '        order.cost_amount = cost\n'
    '        order.revenue_amount = order.amount - cost',
    '        order.cost_amount = cost\n'
    '        order.revenue_amount = order.amount - cost\n'
    '        try:\n'
    '            from apps.referrals.hooks import settle_referral\n'
    '            settle_referral(user=order.wallet.user, oam_profit=order.revenue_amount,\n'
    '                            currency=order.currency, source_reference=order.reference)\n'
    '        except Exception:\n'
    '            pass',
)])

# marketplace: settle referral when a subscription is activated (full price = OAM profit)
edit("apps/marketplace/services.py", [(
    '            sub.tier = p.tier\n'
    '            sub.expires_at = base + timedelta(days=p.period_days)\n'
    '            sub.save(update_fields=["tier", "expires_at", "updated_at"])\n'
    '        return sub',
    '            sub.tier = p.tier\n'
    '            sub.expires_at = base + timedelta(days=p.period_days)\n'
    '            sub.save(update_fields=["tier", "expires_at", "updated_at"])\n'
    '            try:\n'
    '                from apps.referrals.hooks import settle_referral\n'
    '                settle_referral(user=p.user, oam_profit=p.amount,\n'
    '                                currency=p.currency, source_reference=p.reference)\n'
    '            except Exception:\n'
    '                pass\n'
    '        return sub',
)])

# homeservices: settle referral when a boost is marked paid (full price = OAM profit)
edit("apps/homeservices/services.py", [(
    '            p.status = BoostPayment.Status.PAID\n'
    '            p.save(update_fields=["status", "updated_at"])\n'
    '            profile = ArtisanProfile.objects.select_for_update().filter(user=p.user).first()',
    '            p.status = BoostPayment.Status.PAID\n'
    '            p.save(update_fields=["status", "updated_at"])\n'
    '            try:\n'
    '                from apps.referrals.hooks import settle_referral\n'
    '                settle_referral(user=p.user, oam_profit=p.amount,\n'
    '                                currency=p.currency, source_reference=p.reference)\n'
    '            except Exception:\n'
    '                pass\n'
    '            profile = ArtisanProfile.objects.select_for_update().filter(user=p.user).first()',
)])

print("\\nDONE. Referral backend installed. Now run:  python manage.py migrate")

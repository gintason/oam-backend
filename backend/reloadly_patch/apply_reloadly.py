#!/usr/bin/env python3
"""
Reloadly international airtime — top-up engine + API.

Builds on the foundation (apps/reloadly/services.py + models.py). Adds:
  * topup.py — AirtimeTopupService: quote (NGN price = face USD x rate x (1+markup),
    markup = operator Int'l discount %), create, pay (wallet OR Flutterwave card),
    call Reloadly, capture (cost -> provider:reloadly, markup -> OAM revenue) or
    refund on failure. Card settles via the same funding hook as bus.
  * serializers.py, views.py, urls.py, admin.py, migration.
  * settings: INSTALLED_APPS += apps.reloadly, RELOADLY_USD_NGN (default 1700),
    RELOADLY_EXTRA_MARKUP_PERCENT (default 0).
  * config/urls: /api/v1/reloadly/.
  * FundingService.settle hook also completes a paid airtime top-up.

RUN FROM BACKEND ROOT (after the foundation zip + travu are applied):
    python3 reloadly_patch/apply_reloadly.py
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
    open(full, "w", encoding="utf-8").write(content)
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
            sys.exit(f"ABORT: anchor not found exactly once in {path}:\n---\n{old[:150]}\n---")
        s = s.replace(old, new, 1)
    open(full, "w", encoding="utf-8").write(s)
    print(f"  + patched {path}")


if not os.path.exists(_p("apps/reloadly/services.py")):
    sys.exit("ABORT: apps/reloadly/services.py not found — apply the Reloadly foundation zip first.")

# -------------------------------------------------------------- topup.py
write("apps/reloadly/topup.py", '''"""
Airtime top-up orchestration: price in NGN, take payment (wallet or card),
call Reloadly, then capture (cost -> Reloadly, markup -> OAM revenue) or refund.
"""
import logging
import uuid
from decimal import Decimal, ROUND_HALF_UP

from django.conf import settings
from django.db import transaction

from apps.wallet.services import WalletService, REVENUE_ACCOUNT
from apps.payments.services import FundingService

from .services import ReloadlyClient, ReloadlyError, s as _s
from .models import AirtimeTopup, AirtimeApiLog

logger = logging.getLogger(__name__)

RELOADLY_ACCOUNT = "provider:reloadly"   # OAM's notional cost of airtime


def usd_ngn() -> Decimal:
    val = getattr(settings, "RELOADLY_USD_NGN", None)
    try:
        return Decimal(str(val)) if val not in (None, "") else Decimal("1700")
    except Exception:
        return Decimal("1700")


def _extra_markup() -> Decimal:
    val = getattr(settings, "RELOADLY_EXTRA_MARKUP_PERCENT", None)
    try:
        return Decimal(str(val)) if val not in (None, "") else Decimal("0")
    except Exception:
        return Decimal("0")


def _ref() -> str:
    return f"AIR-{uuid.uuid4().hex[:20]}"


def _d(v) -> Decimal:
    try:
        return Decimal(str(v))
    except Exception:
        return Decimal("0")


class AirtimeTopupService:
    @staticmethod
    def quote(*, operator: dict, amount, use_local_amount=False) -> dict:
        """Price a top-up in NGN. markup = operator Int'l discount % (+ optional extra)."""
        rate = usd_ngn()
        disc = _d(operator.get("international_discount"))
        fx = _d(operator.get("fx_rate"))
        amt = _d(amount)
        face_usd = (amt / fx) if (use_local_amount and fx > 0) else amt   # face value in USD
        markup_pct = disc + _extra_markup()
        total_ngn = (face_usd * rate * (Decimal("1") + markup_pct / Decimal("100"))).quantize(Decimal("0.01"), ROUND_HALF_UP)
        cost_ngn = (face_usd * (Decimal("1") - disc / Decimal("100")) * rate).quantize(Decimal("0.01"), ROUND_HALF_UP)
        markup_ngn = (total_ngn - cost_ngn).quantize(Decimal("0.01"))
        return {
            "face_usd": face_usd.quantize(Decimal("0.0001")),
            "total_ngn": total_ngn, "cost_ngn": cost_ngn, "markup_ngn": markup_ngn,
            "usd_ngn": rate, "markup_percent": markup_pct,
        }

    @staticmethod
    @transaction.atomic
    def create_topup(*, user, operator_id, amount, recipient_number, recipient_iso2,
                     use_local_amount=False, pay_with="wallet") -> AirtimeTopup:
        client = ReloadlyClient()
        op = client.normalize_operator(client.operator(operator_id))
        if not op.get("operator_id"):
            raise ReloadlyError("That operator is not available.")
        q = AirtimeTopupService.quote(operator=op, amount=amount, use_local_amount=use_local_amount)
        return AirtimeTopup.objects.create(
            user=user, reference=_ref(), status=AirtimeTopup.Status.PENDING,
            operator_id=_s(operator_id), operator_name=op.get("name", ""),
            country_iso=op.get("country_iso", ""),
            recipient_number=_s(recipient_number), recipient_iso2=_s(recipient_iso2).upper(),
            use_local_amount=bool(use_local_amount),
            amount=_d(amount), currency=op.get("sender_currency", "USD") or "USD",
            total_ngn=q["total_ngn"], cost_ngn=q["cost_ngn"], markup_ngn=q["markup_ngn"],
            pay_with=pay_with,
            request_payload={"operator": op.get("name"),
                             "quote": {k: str(v) for k, v in q.items()}},
        )

    # ---------------- payment ----------------
    @staticmethod
    def pay_with_wallet(topup: AirtimeTopup) -> AirtimeTopup:
        topup.status = AirtimeTopup.Status.PAID
        topup.save(update_fields=["status", "updated_at"])
        wallet = WalletService.get_or_create_wallet(topup.user, "NGN")
        WalletService.hold(wallet, topup.total_ngn, reference=topup.reference,
                           description=f"Airtime {topup.reference}",
                           metadata={"airtime": str(topup.id)})
        return AirtimeTopupService._fulfill(topup)

    @staticmethod
    def pay_with_card(topup: AirtimeTopup) -> str:
        txn, init = FundingService.initialize(topup.user, topup.total_ngn, "NGN")
        topup.payment_reference = txn.internal_reference
        topup.save(update_fields=["payment_reference", "updated_at"])
        return init.authorization_url

    @staticmethod
    def settle_card(*, user, reference: str) -> AirtimeTopup:
        topup = AirtimeTopup.objects.filter(payment_reference=reference, user=user).first()
        if topup is None:
            raise ReloadlyError("Unknown top-up reference.")
        FundingService.settle(reference)   # credits wallet + fires on_funding_settled
        topup.refresh_from_db()
        return topup

    @staticmethod
    def on_funding_settled(reference: str):
        with transaction.atomic():
            topup = (AirtimeTopup.objects.select_for_update()
                     .filter(payment_reference=reference,
                             status=AirtimeTopup.Status.PENDING).first())
            if topup is None:
                return
            topup.status = AirtimeTopup.Status.PAID
            topup.save(update_fields=["status", "updated_at"])
        wallet = WalletService.get_or_create_wallet(topup.user, "NGN")
        WalletService.hold(wallet, topup.total_ngn, reference=topup.reference,
                           description=f"Airtime {topup.reference}",
                           metadata={"airtime": str(topup.id)})
        AirtimeTopupService._fulfill(topup)

    # ---------------- core: send + capture / refund ----------------
    @staticmethod
    def _fulfill(topup: AirtimeTopup) -> AirtimeTopup:
        wallet = WalletService.get_or_create_wallet(topup.user, "NGN")
        client = ReloadlyClient()
        try:
            result = client.topup(
                operator_id=topup.operator_id, amount=topup.amount,
                recipient_number=topup.recipient_number, recipient_iso2=topup.recipient_iso2,
                use_local_amount=topup.use_local_amount, custom_identifier=topup.reference,
            )
        except ReloadlyError as exc:
            AirtimeApiLog.objects.create(topup=topup, endpoint="topups", ok=False, error=str(exc)[:255])
            return AirtimeTopupService._refund(topup, wallet, str(exc)[:255])

        AirtimeApiLog.objects.create(topup=topup, endpoint="topups", ok=True,
                                     response_payload=result if isinstance(result, dict) else {})
        status_ = str((result or {}).get("status") or "").upper()
        txid = _s((result or {}).get("transactionId") or (result or {}).get("id"))
        if status_ in ("SUCCESSFUL", "PROCESSING", "PENDING") or txid:
            WalletService.capture(
                "NGN", topup.total_ngn, reference=topup.reference, cost=topup.cost_ngn,
                counterpart_code=RELOADLY_ACCOUNT, description=f"Airtime {topup.reference}",
                metadata={"airtime": str(topup.id), "markup": str(topup.markup_ngn)},
            )
            topup.status = AirtimeTopup.Status.SUCCESS
            topup.reloadly_transaction_id = txid
            topup.delivered_amount = _d((result or {}).get("deliveredAmount"))
            topup.delivered_currency = _s((result or {}).get("deliveredAmountCurrencyCode"))
            topup.response_payload = result if isinstance(result, dict) else {}
            topup.save(update_fields=["status", "reloadly_transaction_id", "delivered_amount",
                                      "delivered_currency", "response_payload", "updated_at"])
            return topup

        return AirtimeTopupService._refund(topup, wallet,
                                           _s((result or {}).get("message")) or "Top-up not completed.")

    @staticmethod
    def _refund(topup: AirtimeTopup, wallet, reason: str) -> AirtimeTopup:
        WalletService.release(wallet, topup.total_ngn, reference=topup.reference,
                              description=f"Airtime refund {topup.reference}",
                              metadata={"airtime": str(topup.id)})
        topup.status = AirtimeTopup.Status.FAILED
        topup.failure_reason = reason
        topup.save(update_fields=["status", "failure_reason", "updated_at"])
        return topup
''')

# -------------------------------------------------------------- serializers
write("apps/reloadly/serializers.py", '''from rest_framework import serializers

from .models import AirtimeTopup


class QuoteSerializer(serializers.Serializer):
    operator_id = serializers.CharField()
    amount = serializers.DecimalField(max_digits=20, decimal_places=4)
    use_local_amount = serializers.BooleanField(default=False)


class BuySerializer(serializers.Serializer):
    operator_id = serializers.CharField()
    amount = serializers.DecimalField(max_digits=20, decimal_places=4)
    use_local_amount = serializers.BooleanField(default=False)
    recipient_number = serializers.CharField()
    recipient_iso2 = serializers.CharField()
    pay_with = serializers.ChoiceField(choices=["wallet", "card"], default="wallet")


class AirtimeTopupSerializer(serializers.ModelSerializer):
    class Meta:
        model = AirtimeTopup
        fields = ["reference", "status", "operator_name", "country_iso",
                  "recipient_number", "recipient_iso2", "amount", "currency",
                  "total_ngn", "markup_ngn", "reloadly_transaction_id",
                  "delivered_amount", "delivered_currency", "failure_reason", "created_at"]
        read_only_fields = fields
''')

# -------------------------------------------------------------- views
write("apps/reloadly/views.py", '''from rest_framework.generics import ListAPIView, RetrieveAPIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.common.permissions import IsVerified

from .models import AirtimeTopup
from .serializers import AirtimeTopupSerializer, BuySerializer, QuoteSerializer
from .services import ReloadlyClient, ReloadlyError
from .topup import AirtimeTopupService


class CountriesView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            return Response({"countries": ReloadlyClient().countries()})
        except ReloadlyError as exc:
            return Response({"detail": str(exc)}, status=502)


class OperatorsView(APIView):
    """GET /reloadly/operators/?country=GH  (or ?phone=...&country=GH to auto-detect)."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        iso = request.query_params.get("country", "")
        phone = request.query_params.get("phone", "")
        client = ReloadlyClient()
        try:
            if phone:
                op = client.autodetect_operator(phone=phone, iso2=iso)
                return Response({"operators": [client.normalize_operator(op)] if op else []})
            ops = client.operators_by_country(iso)
            return Response({"operators": [client.normalize_operator(o) for o in ops]})
        except ReloadlyError as exc:
            return Response({"detail": str(exc)}, status=502)


class QuoteView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        s = QuoteSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        client = ReloadlyClient()
        try:
            op = client.normalize_operator(client.operator(s.validated_data["operator_id"]))
        except ReloadlyError as exc:
            return Response({"detail": str(exc)}, status=502)
        q = AirtimeTopupService.quote(operator=op, amount=s.validated_data["amount"],
                                      use_local_amount=s.validated_data["use_local_amount"])
        return Response({k: str(v) for k, v in q.items()})


class BuyView(APIView):
    permission_classes = [IsVerified]

    def post(self, request):
        s = BuySerializer(data=request.data)
        s.is_valid(raise_exception=True)
        d = s.validated_data
        try:
            topup = AirtimeTopupService.create_topup(
                user=request.user, operator_id=d["operator_id"], amount=d["amount"],
                recipient_number=d["recipient_number"], recipient_iso2=d["recipient_iso2"],
                use_local_amount=d["use_local_amount"], pay_with=d["pay_with"],
            )
        except ReloadlyError as exc:
            return Response({"detail": str(exc)}, status=502)

        if d["pay_with"] == "card":
            try:
                url = AirtimeTopupService.pay_with_card(topup)
            except Exception as exc:  # noqa: BLE001
                return Response({"detail": "Couldn't start card payment.", "error": str(exc)}, status=502)
            return Response({"topup": AirtimeTopupSerializer(topup).data,
                             "authorization_url": url, "reference": topup.payment_reference})

        try:
            topup = AirtimeTopupService.pay_with_wallet(topup)
        except Exception as exc:  # insufficient funds etc.
            return Response({"detail": str(exc) or "Payment failed.",
                             "topup": AirtimeTopupSerializer(topup).data}, status=402)
        return Response({"topup": AirtimeTopupSerializer(topup).data})


class CardVerifyView(APIView):
    permission_classes = [IsVerified]

    def post(self, request):
        try:
            topup = AirtimeTopupService.settle_card(user=request.user,
                                                    reference=request.data.get("reference") or "")
        except ReloadlyError as exc:
            return Response({"detail": str(exc)}, status=400)
        return Response({"topup": AirtimeTopupSerializer(topup).data})


class TopupListView(ListAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = AirtimeTopupSerializer

    def get_queryset(self):
        return AirtimeTopup.objects.filter(user=self.request.user)


class TopupDetailView(RetrieveAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = AirtimeTopupSerializer
    lookup_field = "reference"

    def get_queryset(self):
        return AirtimeTopup.objects.filter(user=self.request.user)
''')

# -------------------------------------------------------------- urls
write("apps/reloadly/urls.py", '''from django.urls import path

from .views import (BuyView, CardVerifyView, CountriesView, OperatorsView,
                    QuoteView, TopupDetailView, TopupListView)

urlpatterns = [
    path("countries/", CountriesView.as_view(), name="reloadly-countries"),
    path("operators/", OperatorsView.as_view(), name="reloadly-operators"),
    path("quote/", QuoteView.as_view(), name="reloadly-quote"),
    path("buy/", BuyView.as_view(), name="reloadly-buy"),
    path("card/verify/", CardVerifyView.as_view(), name="reloadly-card-verify"),
    path("topups/", TopupListView.as_view(), name="reloadly-topups"),
    path("topups/<str:reference>/", TopupDetailView.as_view(), name="reloadly-topup-detail"),
]
''')

# -------------------------------------------------------------- admin
write("apps/reloadly/admin.py", '''from django.contrib import admin

from .models import AirtimeApiLog, AirtimeTopup


@admin.register(AirtimeTopup)
class AirtimeTopupAdmin(admin.ModelAdmin):
    list_display = ("reference", "user", "operator_name", "recipient_number",
                    "total_ngn", "markup_ngn", "status", "created_at")
    list_filter = ("status", "country_iso")
    search_fields = ("reference", "reloadly_transaction_id", "recipient_number", "user__email")


admin.site.register(AirtimeApiLog)
''')

# -------------------------------------------------------------- migration
write("apps/reloadly/migrations/__init__.py", "")
write("apps/reloadly/migrations/0001_initial.py", '''from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="AirtimeTopup",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_at", models.DateTimeField(auto_now_add=True, db_index=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("reference", models.CharField(db_index=True, max_length=40, unique=True)),
                ("status", models.CharField(choices=[("pending", "Pending payment"), ("paid", "Paid — sending"), ("success", "Successful"), ("failed", "Failed"), ("refunded", "Refunded")], default="pending", max_length=12)),
                ("operator_id", models.CharField(max_length=32)),
                ("operator_name", models.CharField(blank=True, max_length=120)),
                ("country_iso", models.CharField(blank=True, max_length=4)),
                ("recipient_number", models.CharField(max_length=32)),
                ("recipient_iso2", models.CharField(max_length=4)),
                ("use_local_amount", models.BooleanField(default=False)),
                ("amount", models.DecimalField(decimal_places=4, default=0, max_digits=20)),
                ("currency", models.CharField(default="USD", max_length=6)),
                ("total_ngn", models.DecimalField(decimal_places=2, default=0, max_digits=20)),
                ("cost_ngn", models.DecimalField(decimal_places=2, default=0, max_digits=20)),
                ("markup_ngn", models.DecimalField(decimal_places=2, default=0, max_digits=20)),
                ("payment_reference", models.CharField(blank=True, db_index=True, max_length=120)),
                ("pay_with", models.CharField(default="wallet", max_length=10)),
                ("reloadly_transaction_id", models.CharField(blank=True, db_index=True, max_length=64)),
                ("delivered_amount", models.DecimalField(decimal_places=4, default=0, max_digits=20)),
                ("delivered_currency", models.CharField(blank=True, max_length=6)),
                ("request_payload", models.JSONField(blank=True, default=dict)),
                ("response_payload", models.JSONField(blank=True, default=dict)),
                ("failure_reason", models.CharField(blank=True, max_length=255)),
                ("user", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="airtime_topups", to=settings.AUTH_USER_MODEL)),
            ],
            options={"ordering": ["-created_at"]},
        ),
        migrations.CreateModel(
            name="AirtimeApiLog",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_at", models.DateTimeField(auto_now_add=True, db_index=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("endpoint", models.CharField(max_length=80)),
                ("request_payload", models.JSONField(blank=True, default=dict)),
                ("response_payload", models.JSONField(blank=True, default=dict)),
                ("status_code", models.PositiveIntegerField(default=0)),
                ("ok", models.BooleanField(default=False)),
                ("error", models.CharField(blank=True, max_length=255)),
                ("topup", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="api_logs", to="reloadly.airtimetopup")),
            ],
            options={"ordering": ["-created_at"]},
        ),
    ]
''')

# -------------------------------------------------------------------- wiring
edit("config/settings/base.py", [
    (
        '    "apps.travu",           # Travu intercity bus booking',
        '    "apps.travu",           # Travu intercity bus booking\n'
        '    "apps.reloadly",        # Reloadly international airtime',
    ),
    (
        'BUS_FEE_PER_SEAT = env.int("BUS_FEE_PER_SEAT", default=500)',
        'BUS_FEE_PER_SEAT = env.int("BUS_FEE_PER_SEAT", default=500)\n\n'
        '# International airtime (Reloadly): USD->NGN pricing rate + optional extra markup.\n'
        'RELOADLY_USD_NGN = env("RELOADLY_USD_NGN", default="1700")\n'
        'RELOADLY_EXTRA_MARKUP_PERCENT = env("RELOADLY_EXTRA_MARKUP_PERCENT", default="0")',
    ),
])

edit("config/urls.py", [(
    '    path("api/v1/travu/", include("apps.travu.urls")),',
    '    path("api/v1/travu/", include("apps.travu.urls")),\n'
    '    path("api/v1/reloadly/", include("apps.reloadly.urls")),',
)])

# FundingService.settle: also complete a paid airtime top-up (alongside the bus hook)
edit("apps/payments/services.py", [(
    '''            def _book_bus(ref=reference):
                try:
                    from apps.travu.booking import BusBookingService
                    BusBookingService.on_funding_settled(ref)
                except Exception:
                    pass
            transaction.on_commit(_book_bus)''',
    '''            def _book_bus(ref=reference):
                try:
                    from apps.travu.booking import BusBookingService
                    BusBookingService.on_funding_settled(ref)
                except Exception:
                    pass
            transaction.on_commit(_book_bus)

            def _send_airtime(ref=reference):
                try:
                    from apps.reloadly.topup import AirtimeTopupService
                    AirtimeTopupService.on_funding_settled(ref)
                except Exception:
                    pass
            transaction.on_commit(_send_airtime)''',
)])

print("\\nDONE. Reloadly airtime backend installed. Now run:  python manage.py migrate")

"""
Bill purchase orchestration (wallet-paid).

Flow:
  1) create order + HOLD funds        (atomic; funds reserved)
  2) call the VTU provider             (outside the DB transaction)
  3) settle:
       SUCCESS  -> CAPTURE  (suspense -> provider)
       FAILED   -> RELEASE  (refund the user)
       PENDING  -> keep the hold; resolve later via requery or webhook

Provider transport errors are treated as PENDING (NOT refunded), because the
airtime may actually have been delivered — requery/webhook determines the truth.
"""
from __future__ import annotations

import uuid
from decimal import Decimal

from django.db import transaction

from integrations.base import ProviderFactory
from integrations.base.dto import TxnStatus, VTURequest
from integrations.base.exceptions import ProviderError
from apps.wallet.services import WalletService

from .models import Biller, BillOrder, CustomerVerification


def _bill_ref() -> str:
    return f"BILL-{uuid.uuid4().hex[:20]}"


class BillingError(Exception):
    """User-facing billing problem (bad biller, etc.)."""


class BillingService:
    # ---------------- catalog ----------------
    @staticmethod
    def list_billers(country="NG", category=None):
        qs = Biller.objects.filter(country=country.upper(), is_active=True)
        if category:
            qs = qs.filter(category=category)
        return qs

    @staticmethod
    def _resolve_biller(country, category, code) -> Biller:
        biller = Biller.objects.filter(
            country=country.upper(), category=category, code=code, is_active=True
        ).first()
        if biller is None:
            raise BillingError(f"Unknown or inactive biller '{code}' for {category}.")
        return biller

    # ---------------- purchase ----------------
    @staticmethod
    def create_and_hold(*, user, country, category, code, recipient, amount,
                        currency="NGN", plan_code="", expected_cost=None) -> BillOrder:
        amount = Decimal(str(amount))
        biller = BillingService._resolve_biller(country, category, code)
        wallet = WalletService.get_or_create_wallet(user, currency)
        with transaction.atomic():
            order = BillOrder.objects.create(
                user=user, biller=biller, category=category, recipient=recipient,
                plan_code=plan_code, amount=amount, currency=currency.upper(),
                pay_with=BillOrder.PayWith.WALLET, wallet=wallet,
                reference=_bill_ref(), status=BillOrder.Status.PENDING,
                request_payload={"recipient": recipient, "amount": str(amount),
                                 "category": category, "biller": code},
                metadata=({"expected_cost": str(expected_cost)} if expected_cost is not None else {}),
            )
            WalletService.hold(wallet, amount, reference=order.reference,
                               description=f"Bill hold {order.reference}",
                               metadata={"order": str(order.id)})
            order.status = BillOrder.Status.PROCESSING
            order.save(update_fields=["status", "updated_at"])
        return order

    @staticmethod
    def execute(order: BillOrder) -> BillOrder:
        provider = ProviderFactory.get("vtu")
        result, error = None, None
        try:
            provider_amount = order.amount
            if order.category == "betting":
                provider_amount = Decimal(str((order.metadata or {}).get("betting_amount") or order.amount))
            result = provider.purchase(VTURequest(
                service=order.category, operator=order.biller.code,
                recipient=order.recipient, amount=provider_amount,
                plan_code=order.plan_code, request_id=order.reference,
            ))
        except ProviderError as exc:
            error = str(exc)      # transport/unknown -> treat as PENDING (keep hold)

        with transaction.atomic():
            o = BillOrder.objects.select_for_update().get(pk=order.pk)
            if o.status in (BillOrder.Status.SUCCESS, BillOrder.Status.FAILED,
                            BillOrder.Status.REVERSED):
                return o
            o.provider = provider.provider_key
            if result is None:
                o.status = BillOrder.Status.PROCESSING          # keep hold; resolve later
                o.response_payload = {"error": error}
            elif result.status == TxnStatus.SUCCESS:
                BillingService._capture(o, result.raw)
                o.status = BillOrder.Status.SUCCESS
                o.provider_reference = result.provider_reference
                o.response_payload = result.raw
            elif result.status == TxnStatus.PENDING:
                o.status = BillOrder.Status.PROCESSING
                o.provider_reference = result.provider_reference
                o.response_payload = result.raw
            else:  # FAILED
                BillingService._release(o)
                o.status = BillOrder.Status.FAILED
                o.response_payload = result.raw
            o.save(update_fields=["status", "provider", "provider_reference",
                                  "response_payload", "cost_amount", "revenue_amount",
                                  "customer_name", "token", "units", "updated_at"])
        return o

    @staticmethod
    def data_variations(country, code):
        """Live data bundles for a network (fetched from the provider each call)."""
        BillingService._resolve_biller(country, "data", code)
        provider = ProviderFactory.get("vtu")
        lister = getattr(provider, "list_variations", None)
        return lister("data", code) if lister else []

    @staticmethod
    def purchase_data(*, user, country, code, recipient, variation_id, currency="NGN") -> BillOrder:
        """Price is looked up SERVER-SIDE from the live catalog (tamper-proof)."""
        provider = ProviderFactory.get("vtu")
        lister = getattr(provider, "list_variations", None)
        variations = lister("data", code) if lister else []
        match = next((v for v in variations if str(v.get("variation_id")) == str(variation_id)), None)
        if match is None:
            raise BillingError("Unknown or unavailable data plan.")
        try:
            amount = Decimal(str(match["price"]).replace(",", ""))         # retail (user pays)
        except Exception:
            raise BillingError("Could not determine the price of this data plan.")
        if amount <= 0:
            raise BillingError("Invalid data plan price.")
        # our cost to VTU (reseller price) -> becomes the capture cost, so the
        # retail/reseller spread is booked as OAM revenue.
        expected_cost = None
        reseller = match.get("reseller_price")
        if reseller not in (None, ""):
            try:
                rc = Decimal(str(reseller).replace(",", ""))
                if 0 < rc <= amount:
                    expected_cost = rc
            except Exception:
                expected_cost = None
        order = BillingService.create_and_hold(
            user=user, country=country, category="data", code=code,
            recipient=recipient, amount=amount, currency=currency,
            plan_code=str(variation_id), expected_cost=expected_cost,
        )
        return BillingService.execute(order)

    @staticmethod
    def _extract_details(order, raw):
        """
        Pull customer_name / token / units from a provider response onto the order.

        VTU returns these in DIFFERENT places depending on the call:
          * purchase response        -> data.token / data.units
          * requery (still pending)  -> data.token is null, and the RESOLVED
                                        result is nested under `resolve`:
                                        resolve.data.meta_data.electricity_token
        So we check every known location, most-specific first.
        """
        raw = raw or {}
        data = raw.get("data", {}) or {}
        resolve = (raw.get("resolve", {}) or {}).get("data", {}) or {}
        meta = resolve.get("meta_data", {}) or {}

        name = (meta.get("customer_name") or resolve.get("customer_name")
                or data.get("customer_name"))
        if name:
            order.customer_name = str(name)[:160]

        token = (meta.get("electricity_token") or meta.get("token")
                 or resolve.get("token") or data.get("token"))
        if token:
            order.token = str(token)[:64]

        units = (meta.get("units") or meta.get("electricity_units")
                 or resolve.get("units") or data.get("units"))
        if units not in (None, ""):
            order.units = str(units)[:32]

    # ---------------- customer verification (cable / electricity) ----------------
    @staticmethod
    def verify_customer(*, user, country, category, code, customer_id, variation=None):
        biller = BillingService._resolve_biller(country, category, code)
        provider = ProviderFactory.get("vtu")
        verifier = getattr(provider, "verify_customer", None)
        if verifier is None:
            raise BillingError("Verification is not supported by the current provider.")
        try:
            details = verifier(biller.code, customer_id, variation)
        except ProviderError as exc:
            raise BillingError(str(exc))
        name = details.get("customer_name")
        if not name:
            raise BillingError("Could not verify this customer.")
        cv = CustomerVerification.objects.create(
            user=user, service_id=biller.code, customer_id=str(customer_id),
            variation=variation or "", customer_name=name, data=details,
        )
        return {"verification_id": str(cv.id), "customer_name": name, "details": details}

    @staticmethod
    def _require_verification(user, service_id, customer_id, verification_id):
        cv = CustomerVerification.objects.filter(
            id=verification_id, user=user, service_id=service_id,
            customer_id=str(customer_id),
        ).first()
        if cv is None:
            raise BillingError("Please verify the customer before paying.")
        if not cv.is_fresh():
            raise BillingError("Verification expired. Please verify again.")
        return cv

    # ---------------- cable ----------------
    @staticmethod
    def tv_variations(country, code):
        BillingService._resolve_biller(country, "cable", code)
        provider = ProviderFactory.get("vtu")
        lister = getattr(provider, "list_variations", None)
        return lister("cable", code) if lister else []

    @staticmethod
    def purchase_cable(*, user, country, code, customer_id, variation_id,
                       verification_id, currency="NGN") -> BillOrder:
        biller = BillingService._resolve_biller(country, "cable", code)
        cv = BillingService._require_verification(user, biller.code, customer_id, verification_id)
        provider = ProviderFactory.get("vtu")
        lister = getattr(provider, "list_variations", None)
        variations = lister("cable", code) if lister else []
        match = next((v for v in variations if str(v.get("variation_id")) == str(variation_id)), None)
        if match is None:
            raise BillingError("Unknown or unavailable cable package.")
        try:
            amount = Decimal(str(match["price"]).replace(",", ""))
        except Exception:
            raise BillingError("Could not determine the package price.")
        expected_cost = None
        reseller = match.get("reseller_price")
        if reseller not in (None, ""):
            try:
                rc = Decimal(str(reseller).replace(",", ""))
                if 0 < rc <= amount:
                    expected_cost = rc
            except Exception:
                expected_cost = None
        order = BillingService.create_and_hold(
            user=user, country=country, category="cable", code=code,
            recipient=str(customer_id), amount=amount, currency=currency,
            plan_code=str(variation_id), expected_cost=expected_cost,
        )
        order.customer_name = cv.customer_name
        order.save(update_fields=["customer_name", "updated_at"])
        return BillingService.execute(order)

    # ---------------- electricity ----------------
    @staticmethod
    def purchase_electricity(*, user, country, code, customer_id, meter_type, amount,
                             verification_id, currency="NGN") -> BillOrder:
        biller = BillingService._resolve_biller(country, "electricity", code)
        cv = BillingService._require_verification(user, biller.code, customer_id, verification_id)
        try:
            amount = Decimal(str(amount).replace(",", ""))
        except Exception:
            raise BillingError("Invalid amount.")
        if amount <= 0:
            raise BillingError("Amount must be positive.")
        # honour min/max from the verification if present
        details = cv.data or {}
        mn = details.get("min_purchase_amount")
        mx = details.get("max_purchase_amount")
        if mn and amount < Decimal(str(mn)):
            raise BillingError(f"Minimum purchase for this meter is {mn}.")
        if mx and amount > Decimal(str(mx)):
            raise BillingError(f"Maximum purchase for this meter is {mx}.")
        order = BillingService.create_and_hold(
            user=user, country=country, category="electricity", code=code,
            recipient=str(customer_id), amount=amount, currency=currency,
            plan_code=str(meter_type),   # prepaid / postpaid -> VTU variation_id
        )
        order.meter_type = str(meter_type)
        order.customer_name = cv.customer_name
        order.save(update_fields=["meter_type", "customer_name", "updated_at"])
        return BillingService.execute(order)

    @staticmethod
    def purchase_betting(*, user, code, customer_id, amount, verification_id,
                         currency="NGN") -> BillOrder:
        """Fund a betting account. The user pays amount + a flat ₦50 OAM service
        fee; the betting account is credited with `amount`."""
        biller = BillingService._resolve_biller("NG", "betting", code)
        cv = BillingService._require_verification(user, biller.code, customer_id, verification_id)
        try:
            amount = Decimal(str(amount).replace(",", ""))
        except Exception:
            raise BillingError("Invalid amount.")
        if amount < Decimal("100"):
            raise BillingError("Minimum funding is ₦100.")
        if amount > Decimal("100000"):
            raise BillingError("Maximum funding is ₦100,000.")
        fee = Decimal("50")
        total = amount + fee
        order = BillingService.create_and_hold(
            user=user, country="NG", category="betting", code=code,
            recipient=str(customer_id), amount=total, currency=currency,
        )
        order.cost_amount = amount
        order.revenue_amount = fee
        order.customer_name = cv.customer_name
        md = dict(order.metadata or {})
        md.update({"betting_amount": str(amount), "fee": str(fee), "service_id": biller.code})
        order.metadata = md
        order.save(update_fields=["cost_amount", "revenue_amount", "customer_name",
                                  "metadata", "updated_at"])
        return BillingService.execute(order)

    @staticmethod
    def purchase(**kwargs) -> BillOrder:
        return BillingService.execute(BillingService.create_and_hold(**kwargs))

    # ---------------- resolve pending (requery / webhook) ----------------
    @staticmethod
    def poll(order: BillOrder) -> BillOrder:
        """Requery the provider for a still-processing order and settle it."""
        provider = ProviderFactory.get("vtu")
        try:
            result = provider.get_status(order.reference)
        except ProviderError:
            return order      # leave as-is; try again later
        return BillingService._apply(order, result.status, result.raw,
                                     provider_reference=result.provider_reference)

    @staticmethod
    def apply_provider_status(request_id: str, provider_status: str, raw=None) -> BillOrder | None:
        """Used by the webhook. Maps VTU status strings and settles idempotently."""
        order = BillOrder.objects.filter(reference=request_id).first()
        if order is None:
            return None
        mapped = (TxnStatus.SUCCESS if provider_status == "completed-api"
                  else TxnStatus.FAILED if provider_status in ("refunded", "failed", "cancelled")
                  else TxnStatus.PENDING)
        return BillingService._apply(order, mapped, raw or {})

    # ---------------- internal settle helpers ----------------
    @staticmethod
    def _cost_from_raw(raw, fallback):
        """Read the provider's real charge (VTU 'amount_charged') to book margin."""
        from decimal import Decimal
        data = (raw or {}).get("data", {}) or {}
        charged = data.get("amount_charged")
        if charged in (None, ""):
            return fallback
        try:
            return Decimal(str(charged).replace(",", ""))
        except Exception:
            return fallback

    @staticmethod
    def _capture(order, raw=None):
        from decimal import Decimal as _D
        fallback = order.amount
        exp = (order.metadata or {}).get("expected_cost")
        if exp:
            try:
                fallback = _D(str(exp))
            except Exception:
                fallback = order.amount
        cost = BillingService._cost_from_raw(raw, fallback)
        BillingService._extract_details(order, raw)
        WalletService.capture(order.currency, order.amount, cost=cost,
                              reference=order.reference, counterpart_code="provider:vtu",
                              description=f"Bill capture {order.reference}",
                              metadata={"order": str(order.id)})
        order.cost_amount = cost
        order.revenue_amount = order.amount - cost
        try:
            from apps.referrals.hooks import settle_referral
            settle_referral(user=order.wallet.user, oam_profit=order.revenue_amount,
                            currency=order.currency, source_reference=order.reference)
        except Exception:
            pass

    @staticmethod
    def _release(order):
        WalletService.release(order.wallet, order.amount, reference=order.reference,
                              description=f"Bill refund {order.reference}",
                              metadata={"order": str(order.id)})

    @staticmethod
    @transaction.atomic
    def _apply(order, mapped_status, raw, provider_reference=None) -> BillOrder:
        o = BillOrder.objects.select_for_update().get(pk=order.pk)
        if o.status in (BillOrder.Status.SUCCESS, BillOrder.Status.FAILED,
                        BillOrder.Status.REVERSED):
            return o
        if mapped_status == TxnStatus.SUCCESS:
            BillingService._capture(o, raw)
            o.status = BillOrder.Status.SUCCESS
        elif mapped_status == TxnStatus.FAILED:
            BillingService._release(o)
            o.status = BillOrder.Status.FAILED
        else:
            o.status = BillOrder.Status.PROCESSING
        if provider_reference:
            o.provider_reference = provider_reference
        if raw:
            o.response_payload = {**(o.response_payload or {}), "resolve": raw}
        o.save(update_fields=["status", "provider_reference", "response_payload",
                              "cost_amount", "revenue_amount", "customer_name",
                              "token", "units", "updated_at"])
        return o

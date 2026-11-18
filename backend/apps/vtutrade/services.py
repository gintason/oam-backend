"""Gift card buy/sell and RMB purchase logic. See models.py for the money flow."""
from __future__ import annotations

import logging
import uuid
from decimal import Decimal, ROUND_CEILING, ROUND_FLOOR

from django.conf import settings
from django.db import transaction
from django.utils import timezone

from apps.wallet.services import WalletService
from integrations.base import ProviderFactory
from integrations.base.exceptions import ProviderError, ProviderNotFound

from .models import TradeOrder

logger = logging.getLogger("vtutrade")

TXN_TYPE = {TradeOrder.Kind.GIFTCARD_BUY: "gift_card_buy",
            TradeOrder.Kind.GIFTCARD_SELL: "gift_card_sell",
            TradeOrder.Kind.RMB_BUY: "rmb_buy"}
_DONE = {"completed"}
_FAILED = {"failed", "refunded", "cancelled", "declined", "rejected"}


class TradeError(Exception):
    """Customer-facing problem."""


def giftcards_enabled() -> bool:
    return bool(getattr(settings, "VTU_GIFTCARDS_ENABLED", False))


def rmb_enabled() -> bool:
    return bool(getattr(settings, "VTU_RMB_ENABLED", False))


def _pct(name) -> Decimal:
    try:
        return Decimal(str(getattr(settings, name, 0) or 0)) / 100
    except Exception:
        return Decimal("0")


def _naira_up(v) -> Decimal:
    return Decimal(str(v)).quantize(Decimal("1"), rounding=ROUND_CEILING)


def _naira_down(v) -> Decimal:
    return Decimal(str(v)).quantize(Decimal("1"), rounding=ROUND_FLOOR)


def _ref() -> str:
    return f"TRD-{uuid.uuid4().hex[:20]}"


def _vtu():
    provider = ProviderFactory.get("vtu")
    v1 = getattr(provider, "v1", None)
    if v1 is None:
        raise TradeError("This service is not available right now.")
    return v1


def _raw_amount(v):
    if isinstance(v, dict):
        v = v.get("raw")
    try:
        return Decimal(str(v))
    except Exception:
        return None


def _error_text(body) -> str:
    if not isinstance(body, dict):
        return ""
    err = body.get("error")
    if isinstance(err, dict):
        return str(err.get("message") or err.get("code") or "")
    msg = body.get("message") or ""
    errs = body.get("errors")
    if isinstance(errs, dict) and errs:
        first = next(iter(errs.values()))
        msg = first[0] if isinstance(first, list) and first else msg
    return str(msg)


def _notify(order, title, body):
    try:
        from apps.notifications.services import notify
        notify(order.user, kind="general", title=title, body=body,
               data={"reference": order.reference, "kind": order.kind})
    except Exception:                                   # noqa: BLE001
        logger.warning("trade notification failed for %s", order.reference, exc_info=True)


class TradeService:
    # ------------------------------------------------------------------ gift card BUY
    @staticmethod
    def giftcard_quote(product_id, amount, quantity) -> dict:
        """VTU.ng's naira price plus O.A.M's markup -> what the customer pays."""
        quantity = int(quantity or 1)
        if not 1 <= quantity <= 10:
            raise TradeError("You can buy 1 to 10 cards at a time.")
        try:
            calc = _vtu().gc_buy_calculate(product_id, amount, quantity)
        except ProviderError as exc:
            raise TradeError(str(exc).replace("[vtung] ", "") or "Could not price this card.")
        cost = Decimal(str(calc.get("total_price_ngn") or calc.get("exact_unit_price_ngn") or 0))
        if cost <= 0:
            raise TradeError("Could not price this card.")
        price = _naira_up(cost * (1 + _pct("GIFTCARD_BUY_MARKUP_PCT")))
        return {"provider_total": str(calc.get("total_price_ngn") or cost), "cost": cost, "price": price,
                "quantity": quantity}

    @staticmethod
    def buy_giftcard(*, user, product_id, amount, quantity, title="") -> TradeOrder:
        if not giftcards_enabled():
            raise TradeError("Gift cards are not available yet.")
        q = TradeService.giftcard_quote(product_id, amount, quantity)
        order = TradeService._create_and_hold(
            user, TradeOrder.Kind.GIFTCARD_BUY, q["price"], q["cost"],
            title=title or f"Gift card x{q['quantity']}",
            details={"product_id": int(product_id), "amount": str(amount), "quantity": q["quantity"]})
        try:
            code, body = _vtu().gc_buy(order.reference, product_id, amount, q["quantity"], q["provider_total"])
        except ProviderError as exc:                    # unknown outcome: keep hold, requery later
            TradeService._save(order, response_payload={"error": str(exc)})
            return order
        return TradeService._after_submit(order, code, body)

    # ------------------------------------------------------------------ gift card SELL
    @staticmethod
    def sell_giftcard(*, user, fields: dict, images=None, title="") -> TradeOrder:
        if not giftcards_enabled():
            raise TradeError("Gift cards are not available yet.")
        card_type = str(fields.get("card_type") or "").lower()
        if card_type not in ("ecode", "physical"):
            raise TradeError("Choose e-code or physical card.")
        if card_type == "ecode" and not str(fields.get("additional_info") or "").strip():
            raise TradeError("Enter the gift card code.")
        if card_type == "physical" and not images:
            raise TradeError("Add at least one clear photo of the card.")
        wallet = WalletService.get_or_create_wallet(user, "NGN")
        ref = _ref()
        clean = {k: v for k, v in fields.items() if v not in (None, "")}
        clean["payout_currency"] = "NGN"
        try:
            code, body = _vtu().gc_sell(ref, clean, images)
        except ProviderError as exc:
            raise TradeError("We couldn't submit your card right now. Please try again.") from exc
        data = (body or {}).get("data") or {}
        if code >= 400 or not data:
            raise TradeError(_error_text(body) or "This card couldn't be submitted. Check the details.")
        payout = _raw_amount(data.get("payout_amount")) or Decimal("0")
        customer_gets = _naira_down(payout * (1 - _pct("GIFTCARD_SELL_MARGIN_PCT")))
        details = {k: v for k, v in clean.items() if k != "additional_info"}   # don't keep codes
        return TradeOrder.objects.create(
            user=user, wallet=wallet, kind=TradeOrder.Kind.GIFTCARD_SELL, reference=ref,
            provider_reference=str(data.get("reference") or ""), status=TradeOrder.Status.PENDING,
            amount=customer_gets, provider_amount=payout, revenue_amount=payout - customer_gets,
            title=title or f"{data.get('card_name', 'Gift card')} {data.get('card_amount', '')} {data.get('card_currency', '')}".strip(),
            details=details, response_payload={"submit": {k: v for k, v in data.items() if k != "transaction"}},
        )

    # ------------------------------------------------------------------ RMB
    @staticmethod
    def rmb_rates() -> dict:
        """VTU.ng's channels and tiers with O.A.M's markup applied to every rate."""
        data = _vtu().rmb_rates()
        mk = 1 + _pct("RMB_MARKUP_PCT")

        def mark(rates):
            out = []
            for r in rates or []:
                if isinstance(r, dict) and r.get("ngn_per_rmb") is not None:
                    r = {**r, "ngn_per_rmb": float(_naira_up(Decimal(str(r["ngn_per_rmb"])) * mk * 100) / 100)}
                out.append(r)
            return out
        channels = []
        for ch in data.get("channels") or []:
            ch = dict(ch)
            ch["rates"] = mark(ch.get("rates"))
            ch["account_types"] = [{**t, "rates": mark(t.get("rates"))} for t in ch.get("account_types") or []]
            channels.append(ch)
        return {"channels": channels, "limits": data.get("limits") or {}}

    @staticmethod
    def _tier_rate(rates, rmb_amount):
        for r in rates or []:
            lo = Decimal(str(r.get("min_rmb") or 0))
            hi = r.get("max_rmb")
            if rmb_amount >= lo and (hi is None or rmb_amount <= Decimal(str(hi))):
                return Decimal(str(r.get("ngn_per_rmb")))
        return None

    @staticmethod
    def rmb_quote(channel, account_type, rmb_amount) -> dict:
        rmb_amount = Decimal(str(rmb_amount))
        data = _vtu().rmb_rates()
        limits = data.get("limits") or {}
        if limits.get("min_rmb") and rmb_amount < Decimal(str(limits["min_rmb"])):
            raise TradeError(f"Minimum is ¥{limits['min_rmb']}.")
        if limits.get("max_rmb") and rmb_amount > Decimal(str(limits["max_rmb"])):
            raise TradeError(f"Maximum is ¥{limits['max_rmb']}.")
        ch = next((c for c in data.get("channels") or [] if c.get("channel") == channel), None)
        if not ch or not ch.get("is_available"):
            raise TradeError("That payment channel isn't available right now.")
        rates = ch.get("rates")
        if account_type:
            t = next((t for t in ch.get("account_types") or [] if t.get("type") == account_type), None)
            if not t or not t.get("is_available"):
                raise TradeError("That account type isn't available right now.")
            rates = t.get("rates") or rates
        rate = TradeService._tier_rate(rates, rmb_amount)
        if rate is None:
            raise TradeError("No rate for that amount.")
        cost = (rmb_amount * rate).quantize(Decimal("0.01"))
        price = _naira_up(cost * (1 + _pct("RMB_MARKUP_PCT")))
        return {"rate": rate, "cost": cost, "price": price}

    @staticmethod
    def buy_rmb(*, user, fields: dict, qr=None) -> TradeOrder:
        if not rmb_enabled():
            raise TradeError("RMB purchase is not available yet.")
        channel = str(fields.get("channel") or "")
        if channel not in ("alipay", "wechat", "bank"):
            raise TradeError("Choose Alipay, WeChat or bank.")
        acct = fields.get("alipay_account_type") if channel == "alipay" else fields.get("wechat_account_type") if channel == "wechat" else None
        if channel in ("alipay", "wechat") and not qr:
            raise TradeError("Upload the recipient's receive QR code.")
        if channel == "bank" and not (fields.get("recipient_bank_name") and fields.get("recipient_bank_account_number")):
            raise TradeError("Enter the recipient's Chinese bank name and account number.")
        if not str(fields.get("recipient_name") or "").strip():
            raise TradeError("Enter the recipient's full name.")
        q = TradeService.rmb_quote(channel, acct, fields.get("rmb_amount"))
        order = TradeService._create_and_hold(
            user, TradeOrder.Kind.RMB_BUY, q["price"], q["cost"],
            title=f"¥{fields.get('rmb_amount')} via {channel.title()}",
            details={k: v for k, v in fields.items() if v not in (None, "")} | {"rate": str(q["rate"])})
        clean = {k: v for k, v in fields.items() if v not in (None, "")}
        try:
            code, body = _vtu().rmb_buy(order.reference, clean, qr)
        except ProviderError as exc:
            TradeService._save(order, response_payload={"error": str(exc)})
            return order
        return TradeService._after_submit(order, code, body)

    # ------------------------------------------------------------------ shared
    @staticmethod
    @transaction.atomic
    def _create_and_hold(user, kind, price, cost, *, title, details) -> TradeOrder:
        wallet = WalletService.get_or_create_wallet(user, "NGN")
        order = TradeOrder.objects.create(
            user=user, wallet=wallet, kind=kind, reference=_ref(), status=TradeOrder.Status.PROCESSING,
            amount=price, provider_amount=cost, revenue_amount=price - cost, title=title[:160], details=details)
        WalletService.hold(wallet, price, reference=order.reference,
                           description=f"{order.get_kind_display()} {order.reference}",
                           metadata={"trade": str(order.id)})
        return order

    @staticmethod
    def _save(order, **fields):
        for k, v in fields.items():
            setattr(order, k, v)
        order.save(update_fields=list(fields) + ["updated_at"])
        return order

    @staticmethod
    def _after_submit(order, code, body) -> TradeOrder:
        """First reply to a BUY: 4xx = nothing bought -> refund now; else processing."""
        data = (body or {}).get("data") or {}
        txn = (body or {}).get("transaction") or data.get("transaction") or {}
        vtu_ref = str(txn.get("reference") or data.get("reference") or "")
        if 400 <= code < 500 and code != 409:
            return TradeService._fail(order, _error_text(body) or "The purchase was declined.", body)
        TradeService._save(order, provider_reference=vtu_ref,
                           response_payload={"submit": {k: v for k, v in (body or {}).items() if k != "transaction"}})
        status = (txn.get("status") or {}).get("value") if isinstance(txn.get("status"), dict) else txn.get("status")
        if str(status or "").lower() in _DONE | _FAILED:
            return TradeService.refresh(order)
        return order

    @staticmethod
    def _fail(order, reason, raw=None) -> TradeOrder:
        with transaction.atomic():
            o = TradeOrder.objects.select_for_update().get(pk=order.pk)
            if o.status in (TradeOrder.Status.SUCCESS, TradeOrder.Status.FAILED, TradeOrder.Status.CANCELLED):
                return o
            if o.kind != TradeOrder.Kind.GIFTCARD_SELL:
                WalletService.release(o.wallet, o.amount, reference=o.reference,
                                      description=f"Refund {o.reference}", metadata={"trade": str(o.id)})
                o.status = TradeOrder.Status.FAILED
            else:
                o.status = TradeOrder.Status.CANCELLED
            o.failure_reason = str(reason or "")[:255]
            o.settled_at = timezone.now()
            if raw:
                o.response_payload = {**(o.response_payload or {}), "final": raw}
            o.save()
        if o.kind == TradeOrder.Kind.GIFTCARD_SELL:
            _notify(o, "Gift card declined", f"Your {o.title} was declined. {o.failure_reason}".strip())
        else:
            _notify(o, "Purchase refunded", f"Your {o.title} couldn't be completed. NGN {o.amount:,.0f} is back in your wallet.")
        return o

    @staticmethod
    def _succeed(order, txn) -> TradeOrder:
        codes = txn.get("gift_card_codes") or []
        with transaction.atomic():
            o = TradeOrder.objects.select_for_update().get(pk=order.pk)
            if o.status in (TradeOrder.Status.SUCCESS, TradeOrder.Status.FAILED, TradeOrder.Status.CANCELLED):
                if codes and not o.codes:                # codes can arrive after the status
                    o.codes = codes
                    o.save(update_fields=["codes", "updated_at"])
                return o
            if o.kind == TradeOrder.Kind.GIFTCARD_SELL:
                WalletService.credit(o.wallet, o.amount, source_code="provider:vtu",
                                     description=f"Gift card sale {o.reference}", reference=f"{o.reference}:payout",
                                     idempotency_key=f"trade-payout:{o.reference}", metadata={"trade": str(o.id)})
            else:
                WalletService.capture(o.currency, o.amount, cost=o.provider_amount, reference=o.reference,
                                      counterpart_code="provider:vtu", description=f"Capture {o.reference}",
                                      metadata={"trade": str(o.id)})
            o.status = TradeOrder.Status.SUCCESS
            o.codes = codes or o.codes
            o.settled_at = timezone.now()
            o.response_payload = {**(o.response_payload or {}),
                                  "final": {k: v for k, v in txn.items() if k != "gift_card_codes"}}
            o.save()
        if o.kind == TradeOrder.Kind.GIFTCARD_SELL:
            _notify(o, "Gift card approved", f"NGN {o.amount:,.0f} for your {o.title} is now in your wallet.")
        elif o.kind == TradeOrder.Kind.RMB_BUY:
            _notify(o, "RMB sent", f"Your {o.title} has been completed.")
        else:
            _notify(o, "Gift card ready", f"Your {o.title} is ready. Open it in the app to see the code.")
        return o

    @staticmethod
    def refresh(order: TradeOrder) -> TradeOrder:
        """Ask VTU.ng for the latest state and settle. Safe to call repeatedly."""
        needs_codes = (order.status == TradeOrder.Status.SUCCESS and order.kind == TradeOrder.Kind.GIFTCARD_BUY
                       and not order.codes)
        if order.status not in (TradeOrder.Status.PENDING, TradeOrder.Status.PROCESSING) and not needs_codes:
            return order
        try:
            txn = _vtu().get_transaction(order.reference, TXN_TYPE[order.kind])
        except ProviderNotFound:
            if order.provider_reference:
                try:
                    txn = _vtu().get_transaction(order.provider_reference, TXN_TYPE[order.kind])
                except ProviderError:
                    return order
            else:
                age = (timezone.now() - order.created_at).total_seconds()
                if order.kind != TradeOrder.Kind.GIFTCARD_SELL and age > 30 * 60:
                    return TradeService._fail(order, "This purchase never reached our partner.")
                return order
        except (ProviderError, TradeError):
            return order
        st = txn.get("status")
        st = str((st.get("value") if isinstance(st, dict) else st) or "").lower()
        if st in _DONE:
            return TradeService._succeed(order, txn)
        if st in _FAILED:
            reason = txn.get("cancellation_reason") or txn.get("failure_reason") or ""
            return TradeService._fail(order, reason, {k: v for k, v in txn.items() if k != "gift_card_codes"})
        return order

    @staticmethod
    def sweep(*, user=None, limit=50) -> int:
        qs = TradeOrder.objects.filter(status__in=[TradeOrder.Status.PENDING, TradeOrder.Status.PROCESSING])
        if user is not None:
            qs = qs.filter(user=user)
        n = 0
        for o in qs.order_by("created_at")[:limit]:
            try:
                if TradeService.refresh(o).status != o.status:
                    n += 1
            except Exception:                           # noqa: BLE001
                logger.warning("trade %s: refresh failed", o.reference, exc_info=True)
        return n

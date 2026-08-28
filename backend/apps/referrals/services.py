import re
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
        m = re.search(r"([A-Za-z0-9]{6,})\s*$", text)
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

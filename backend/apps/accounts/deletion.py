"""
Self-service account deletion.

Required by Apple (App Review 5.1.1(v)) and Google Play (account-deletion
policy) for any app that lets people create an account.

What "deleted" means here:
  - the person can never sign in again (inactive, unusable password, every
    session revoked, social logins unlinked);
  - their personal details are erased (name, email, phone, PIN, devices);
  - what they had published is taken down (listings, artisan profile, CV,
    open jobs, rider availability);
  - financial records (wallet ledger, payments, withdrawals, deliveries) are
    kept, anonymised, because a money app must retain them by law.

Deletion is refused while money or work is still in flight, so nobody loses
funds or leaves a customer/rider stranded.
"""
from __future__ import annotations

import logging
from decimal import Decimal

from django.db import transaction

logger = logging.getLogger("accounts")


def deletion_blockers(user) -> list[str]:
    """Plain-language reasons the account can't be deleted yet (empty = OK)."""
    reasons: list[str] = []
    try:
        from apps.wallet.models import Wallet
        for w in Wallet.objects.filter(user=user, cached_balance__gt=0):
            amount = Decimal(w.cached_balance).quantize(Decimal("0.01"))
            reasons.append(f"Your {w.currency} wallet still holds {w.currency} {amount:,}. "
                           "Withdraw or spend it first.")
    except Exception:  # pragma: no cover - app missing
        logger.exception("deletion check: wallets")
    try:
        from apps.payouts.models import WithdrawalOrder
        if WithdrawalOrder.objects.filter(user=user, status__in=[
                WithdrawalOrder.Status.PENDING, WithdrawalOrder.Status.PROCESSING]).exists():
            reasons.append("A withdrawal is still processing. Try again once it has completed.")
    except Exception:  # pragma: no cover
        logger.exception("deletion check: withdrawals")
    try:
        from apps.deliveries.models import DeliveryRequest, DeliveryStatus, RiderProfile
        live = [DeliveryStatus.PENDING, DeliveryStatus.ACCEPTED, DeliveryStatus.PICKED_UP, DeliveryStatus.IN_TRANSIT]
        if DeliveryRequest.objects.filter(customer=user, status__in=live).exists():
            reasons.append("You have a delivery in progress. Wait until it's delivered or cancel it first.")
        rider = RiderProfile.objects.filter(user=user).first()
        if rider:
            if DeliveryRequest.objects.filter(rider=rider, status__in=live).exists():
                reasons.append("You're carrying a delivery. Complete it first.")
            if (rider.cash_commission_due or 0) > 0:
                reasons.append("You have unpaid cash commission. Pay it from Earnings first.")
    except Exception:  # pragma: no cover
        logger.exception("deletion check: deliveries")
    return reasons


def _step(name, fn):
    """Run one clean-up step; one optional app failing must not stop the deletion."""
    try:
        fn()
    except Exception:
        logger.exception("account deletion step failed: %s", name)


@transaction.atomic
def delete_account(user) -> None:
    uid = user.pk

    def revoke_sessions():
        from rest_framework_simplejwt.token_blacklist.models import BlacklistedToken, OutstandingToken
        for tok in OutstandingToken.objects.filter(user=user):
            BlacklistedToken.objects.get_or_create(token=tok)

    def unlink_identities():
        from apps.accounts.models import OTPCode, SocialAccount
        SocialAccount.objects.filter(user=user).delete()
        OTPCode.objects.filter(user=user).delete()

    def forget_devices():
        from apps.notifications.models import DeviceToken
        DeviceToken.objects.filter(user=user).delete()

    def bank_accounts():
        from apps.payouts.models import BankAccount
        BankAccount.objects.filter(user=user).update(is_active=False)

    def listings():
        from apps.marketplace.models import Listing
        Listing.objects.filter(seller=user, status=Listing.Status.ACTIVE).update(status=Listing.Status.INACTIVE)

    def artisan():
        from apps.homeservices.models import ArtisanProfile
        ArtisanProfile.objects.filter(user=user).update(status=ArtisanProfile.Status.INACTIVE, is_available=False)

    def jobs():
        from apps.jobs.models import CandidateProfile, JobListing
        CandidateProfile.objects.filter(user=user).update(is_searchable=False, open_to_work=False)
        JobListing.objects.filter(employer__owner=user, status__in=[
            JobListing.Status.ACTIVE, JobListing.Status.PAUSED, JobListing.Status.PENDING_REVIEW,
            JobListing.Status.DRAFT]).update(status=JobListing.Status.CLOSED)

    def rider():
        from apps.deliveries.models import RiderProfile
        RiderProfile.objects.filter(user=user).update(
            availability=RiderProfile.Availability.OFFLINE,
            verification_status=RiderProfile.Verification.SUSPENDED)

    for name, fn in [("sessions", revoke_sessions), ("identities", unlink_identities),
                     ("devices", forget_devices), ("bank accounts", bank_accounts),
                     ("listings", listings), ("artisan", artisan), ("jobs", jobs), ("rider", rider)]:
        _step(name, fn)

    # Erase personal details last, so the steps above could still find related rows.
    user.email = f"deleted-{uid.hex if hasattr(uid, 'hex') else uid}@deleted.invalid"
    user.phone = None
    user.first_name = "Deleted"
    user.last_name = "user"
    user.transaction_pin = ""
    user.is_active = False
    user.set_unusable_password()
    user.save()
    logger.info("account %s deleted by its owner", uid)

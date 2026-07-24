"""
Settle outstanding bill orders — the safety net behind every VTU purchase.

WHY THIS EXISTS
  Two real gaps, both seen in production on order BILL-f44800637c2740018841:

  1. PROCESSING ORDERS NEVER RESOLVE ON THEIR OWN.
     vtu.ng accepted the order at 21:38 and completed it at 21:44. Nothing was
     listening in between. If the customer closes the tab, the order sits in
     `processing` forever even though it delivered.

  2. TOKENS ARRIVE AFTER THE STATUS DOES.
     vtu.ng's requery returns `data` (stale: token null) and `resolve.data`
     (the truth, with meta_data.electricity_token). The resolved layer can
     appear a few minutes later. Because `_apply` returns early for orders
     already in a final state, an order marked `success` with an empty token is
     NEVER revisited — the customer has paid and has nothing to type into their
     meter.

  This command fixes both: it re-queries still-processing orders, and it
  re-queries *successful* prepaid electricity orders that are missing a token,
  re-running the extractor on the fresh payload.

USAGE
    python3 manage.py settle_bill_orders                 # last 24h, dry run
    python3 manage.py settle_bill_orders --apply         # actually save
    python3 manage.py settle_bill_orders --hours 72 --apply
    python3 manage.py settle_bill_orders --reference BILL-xxxx --apply

RUN IT ON A SCHEDULE (every 2 minutes is plenty):
    */2 * * * * cd /path/to/backend && /path/to/python manage.py settle_bill_orders --apply
"""
from datetime import timedelta

from django.core.management.base import BaseCommand
from django.utils import timezone

from apps.billing.models import BillOrder
from apps.billing.services import BillingService


def _vtu():
    """The VTU adapter, imported the same way BillingService does."""
    from apps.billing import services as billing_services
    return billing_services.ProviderFactory.get("vtu")


class Command(BaseCommand):
    help = "Resolve processing bill orders and recover missing electricity tokens."

    def add_arguments(self, parser):
        parser.add_argument("--hours", type=int, default=24,
                            help="How far back to look (default 24).")
        parser.add_argument("--apply", action="store_true",
                            help="Save changes. Without this it's a dry run.")
        parser.add_argument("--reference", type=str, default="",
                            help="Only this order reference.")

    def handle(self, *args, **opts):
        apply_changes = opts["apply"]
        since = timezone.now() - timedelta(hours=opts["hours"])

        base = BillOrder.objects.all()
        if opts["reference"]:
            base = base.filter(reference=opts["reference"])
        else:
            base = base.filter(created_at__gte=since)

        pending = list(base.filter(
            status__in=[BillOrder.Status.PENDING, BillOrder.Status.PROCESSING]
        ).order_by("created_at"))

        # Successful prepaid electricity with no token = customer paid, got nothing.
        tokenless = list(base.filter(
            status=BillOrder.Status.SUCCESS,
            category="electricity",
        ).exclude(meter_type__iexact="postpaid").filter(token="").order_by("created_at"))

        self.stdout.write(f"\nWindow: last {opts['hours']}h" if not opts["reference"]
                          else f"\nOrder: {opts['reference']}")
        self.stdout.write(f"  processing orders      : {len(pending)}")
        self.stdout.write(f"  success, missing token : {len(tokenless)}")
        if not apply_changes:
            self.stdout.write(self.style.WARNING("\nDRY RUN — nothing saved. Add --apply to act.\n"))

        # ---- 1. resolve still-processing orders -------------------------- #
        for o in pending:
            before = o.status
            if apply_changes:
                try:
                    o = BillingService.poll(o)
                except Exception as exc:                      # noqa: BLE001
                    self.stdout.write(self.style.ERROR(f"  {o.reference}: poll failed — {exc}"))
                    continue
            msg = f"  {o.reference}: {before} -> {o.status}"
            if o.token:
                msg += f" | token {o.token}"
            self.stdout.write(self.style.SUCCESS(msg) if o.status == BillOrder.Status.SUCCESS else msg)

        # ---- 2. recover tokens for already-successful orders -------------- #
        for o in tokenless:
            if not apply_changes:
                self.stdout.write(f"  {o.reference}: would re-query for token")
                continue

            # (a) try the payload we already hold — the token may have arrived
            #     in a later write and simply never been extracted.
            BillingService._extract_details(o, o.response_payload)
            if o.token:
                o.save(update_fields=["token", "units", "customer_name", "updated_at"])
                self.stdout.write(self.style.SUCCESS(
                    f"  {o.reference}: token recovered from stored payload — {o.token}"))
                continue

            # (b) otherwise ask the provider again for a fresh resolve layer.
            try:
                result = _vtu().get_status(o.reference)
            except Exception as exc:                          # noqa: BLE001
                self.stdout.write(self.style.ERROR(f"  {o.reference}: requery failed — {exc}"))
                continue

            merged = {**(o.response_payload or {}), **(result.raw or {})}
            BillingService._extract_details(o, merged)
            if o.token:
                o.response_payload = merged
                o.save(update_fields=["token", "units", "customer_name",
                                      "response_payload", "updated_at"])
                self.stdout.write(self.style.SUCCESS(
                    f"  {o.reference}: token recovered from provider — {o.token}"))
            else:
                self.stdout.write(self.style.WARNING(
                    f"  {o.reference}: provider still has no token "
                    f"(delivered {o.updated_at:%d %b %H:%M}) — will retry next run"))

        self.stdout.write("")

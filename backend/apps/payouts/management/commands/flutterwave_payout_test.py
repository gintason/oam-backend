"""
Try Flutterwave transfers before switching withdrawals over. Touches no wallets.

    # read-only: key, balance, bank list, account name lookup
    python manage.py flutterwave_payout_test --bank "Fidelity" --account 4011564651

    # send ONE small real transfer from the Flutterwave balance (max ₦1,000)
    python manage.py flutterwave_payout_test --bank "Fidelity" --account 4011564651 --send 100

--bank takes a bank code (e.g. 070) or part of the bank's name.
"""
import time
import uuid
from decimal import Decimal, InvalidOperation

from django.core.management.base import BaseCommand, CommandError

from integrations.base import ProviderFactory
from integrations.base.exceptions import ProviderError

MAX_TEST = Decimal("1000")


class Command(BaseCommand):
    help = "Check Flutterwave transfers (balance, banks, account lookup) and optionally send one test transfer."

    def add_arguments(self, parser):
        parser.add_argument("--bank", help="bank code or part of the bank name, e.g. 070 or Fidelity")
        parser.add_argument("--account", help="10-digit account number")
        parser.add_argument("--send", metavar="AMOUNT", help=f"send this many naira (max {MAX_TEST})")

    def handle(self, *args, **opts):
        flw = ProviderFactory.get("payouts", "flutterwave")
        if not flw.config.get("secret_key"):
            raise CommandError("FLUTTERWAVE_SECRET_KEY is not set on this server.")
        self.stdout.write("Flutterwave key: set")

        balance = flw.get_balance("NGN")
        self.stdout.write(f"NGN available balance: {'unknown (Flutterwave did not say)' if balance is None else f'₦{balance:,.2f}'}")

        try:
            banks = flw.list_banks("NGN")
        except ProviderError as exc:
            raise CommandError(f"Could not load Flutterwave's bank list: {exc} {getattr(exc, 'raw', '')}")
        self.stdout.write(f"Banks available: {len(banks)}")

        if not opts.get("bank") or not opts.get("account"):
            self.stdout.write("Add --bank and --account to look up an account name.")
            return

        q = opts["bank"].strip()
        matches = [b for b in banks if b["code"] == q] or [b for b in banks if q.lower() in str(b["name"]).lower()]
        if not matches:
            raise CommandError(f'No bank matches "{q}".')
        if len(matches) > 1 and not any(b["code"] == q for b in banks):
            listing = "\n".join(f"  {b['code']}  {b['name']}" for b in matches[:15])
            raise CommandError(f'"{q}" matches several banks — use the code:\n{listing}')
        bank = matches[0]
        try:
            acct = flw.resolve_account(account_number=opts["account"], bank_code=bank["code"])
        except ProviderError as exc:
            raise CommandError(f"Account lookup failed: {exc}")
        self.stdout.write(f"Account: {acct['account_name']} — {bank['name']} ({bank['code']}) {opts['account']}")

        if not opts.get("send"):
            self.stdout.write(self.style.SUCCESS("Read-only checks passed. Add --send 100 to try a real transfer."))
            return

        try:
            amount = Decimal(opts["send"]).quantize(Decimal("0.01"))
        except InvalidOperation:
            raise CommandError("--send must be a number, e.g. 100")
        if amount <= 0 or amount > MAX_TEST:
            raise CommandError(f"Test transfers must be between ₦1 and ₦{MAX_TEST:,.0f}.")

        reference = f"OAMTEST-{uuid.uuid4().hex[:16]}"
        recipient = flw.create_recipient(name=acct["account_name"], account_number=opts["account"],
                                         bank_code=bank["code"])
        self.stdout.write(f"Sending ₦{amount:,.2f} (reference {reference}) ...")
        result = flw.initiate_transfer(amount=amount, recipient_code=recipient, reference=reference,
                                       reason="OAM test transfer")
        raw = result.get("raw") or {}
        if result["status"] == "failed":
            raise CommandError(f"Flutterwave refused the transfer: {raw.get('message') or raw.get('error') or raw}")
        tid = result["provider_reference"]
        self.stdout.write(f"Accepted by Flutterwave (transfer id {tid}), status: {result['status']}")

        status = result["status"]
        for _ in range(6):
            if status in ("success", "failed"):
                break
            time.sleep(5)
            status = flw.fetch_transfer_status(tid) or status
            self.stdout.write(f"  status: {status}")
        if status == "success":
            self.stdout.write(self.style.SUCCESS("Transfer SUCCESSFUL — Flutterwave payouts work."))
        elif status == "failed":
            self.stdout.write(self.style.ERROR("Transfer FAILED — see Flutterwave dashboard > Transfers for the reason."))
        else:
            self.stdout.write(self.style.WARNING(
                "Still pending. It may need approving in the Flutterwave dashboard (Transfers), or just more "
                f"time. Re-check later in the dashboard, transfer id {tid}."))

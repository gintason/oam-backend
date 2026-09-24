"""Public transaction receipt lookup by reference (non-guessable), for hosted receipts.

A shared receipt link (oam-app.com/receipt/<reference>) opens a public page that
reads this endpoint. The reference is a random, unguessable token, so exposing the
receipt to anyone holding the link is the intended behaviour (like a bank e-receipt).
Only non-sensitive summary fields are returned.
"""
from decimal import Decimal

from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView


def _name(user) -> str:
    n = f"{getattr(user, 'first_name', '') or ''} {getattr(user, 'last_name', '') or ''}".strip()
    return n or getattr(user, "email", "") or "OAM User"


class PublicReceiptView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, reference: str):
        reference = (reference or "").strip()

        # 1) Wallet-to-wallet transfer
        try:
            from apps.wallet.transfer import WalletTransfer
            t = (WalletTransfer.objects.select_related("sender", "recipient")
                 .filter(reference=reference).first())
            if t:
                return Response({
                    "type": "Wallet Transfer",
                    "status": "Successful Transaction",
                    "amount": f"{Decimal(t.amount):,.2f}",
                    "currency": t.currency or "NGN",
                    "date": t.created_at.isoformat(),
                    "recipient_name": _name(t.recipient),
                    "recipient_sub": "OAM Wallet",
                    "sender_name": _name(t.sender),
                    "sender_sub": "OAM Wallet",
                    "note": t.note or "",
                    "reference": t.reference,
                })
        except Exception:
            pass

        # 2) Bank transfer / withdrawal
        try:
            from apps.payouts.models import Withdrawal
            w = Withdrawal.objects.select_related("user").filter(reference=reference).first()
            if w:
                ok = str(w.status).lower() in ("success", "paid", "successful", "completed")
                return Response({
                    "type": "Bank Transfer",
                    "status": "Successful Transaction" if ok else "Processing",
                    "amount": f"{Decimal(w.amount):,.2f}",
                    "currency": "NGN",
                    "date": w.created_at.isoformat(),
                    "recipient_name": w.account_name or "Bank account",
                    "recipient_sub": f"{w.bank_name or 'Bank'} · {w.account_number}",
                    "sender_name": _name(w.user),
                    "sender_sub": "OAM Wallet",
                    "note": "",
                    "reference": w.reference,
                })
        except Exception:
            pass

        return Response({"detail": "Receipt not found."}, status=404)

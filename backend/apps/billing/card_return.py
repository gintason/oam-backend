"""
Mobile card-payment return bridge.

Paystack only accepts an https callback_url, so the mobile app points it here
(with ?app_return=<deep link>). After payment Paystack redirects to this page,
which immediately bounces the user back into the app via its deep link
(e.g. oam://card-return?reference=...). The app then verifies by reference.
"""
import json

from django.http import HttpResponse
from django.utils.html import escape
from rest_framework.permissions import AllowAny
from rest_framework.views import APIView


class CardPurchaseReturnView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def get(self, request):
        app_return = request.query_params.get("app_return", "") or ""
        ref = request.query_params.get("reference") or request.query_params.get("trxref") or ""

        target = app_return
        if target and ref:
            sep = "&" if "?" in target else "?"
            target = f"{target}{sep}reference={ref}"

        target_js = json.dumps(target)
        target_html = escape(target)
        html = (
            "<!doctype html><html><head><meta charset='utf-8'>"
            "<meta name='viewport' content='width=device-width, initial-scale=1'>"
            "<title>Returning to OAM</title>"
            f"<script>try{{if({target_js}){{window.location.replace({target_js});}}}}catch(e){{}}</script>"
            "</head><body style='font-family:-apple-system,Segoe UI,Roboto,sans-serif;"
            "text-align:center;padding:48px 24px;color:#111'>"
            "<h3 style='margin:0 0 8px'>Payment complete</h3>"
            "<p style='color:#6B7280'>Returning you to the OAM app&hellip;</p>"
            f"<p><a style='color:#0B7327;font-weight:600' href='{target_html}'>"
            "Tap here if it doesn't return automatically</a></p>"
            "</body></html>"
        )
        return HttpResponse(html, content_type="text/html")

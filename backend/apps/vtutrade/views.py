"""
/api/v1/trade/  — gift cards (buy & sell) and RMB through VTU.ng.

    GET  status/                       which services are switched on
    GET  giftcards/buy/countries/      GET giftcards/buy/products/?country=US
    POST giftcards/buy/quote/          {product_id, amount, quantity} -> price in NGN
    POST giftcards/buy/                {product_id, amount, quantity, title}
    GET  giftcards/sell/catalog/       GET giftcards/sell/rates/?slug=amazon
    POST giftcards/sell/               multipart: slug, card_country, card_type, sub_type,
                                       card_currency, card_amount, additional_info, images[]
    GET  rmb/rates/                    POST rmb/quote/  {channel, account_type, rmb_amount}
    POST rmb/buy/                      multipart: channel, *_account_type, rmb_amount,
                                       recipient_name, recipient_identifier, recipient_bank_*, description, qr_code
    GET  orders/                       GET orders/<reference>/  (re-checks with VTU.ng)
"""
from django.conf import settings
from rest_framework import serializers, status
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.common.permissions import IsVerified
from apps.wallet.services import InsufficientFunds

from .models import TradeOrder
from .services import TradeError, TradeService, giftcards_enabled, rmb_enabled, _vtu

MAX_IMAGE = 2 * 1024 * 1024


class TradeOrderSerializer(serializers.ModelSerializer):
    class Meta:
        model = TradeOrder
        fields = ("id", "kind", "reference", "status", "currency", "amount", "title", "details",
                  "codes", "failure_reason", "created_at", "updated_at", "settled_at")
        read_only_fields = fields


def _off(what):
    return Response({"detail": f"{what} is not available yet.", "code": "service_off"},
                    status=status.HTTP_403_FORBIDDEN)


def _err(exc):
    return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)


def _files(request, field, limit):
    out = []
    for f in request.FILES.getlist(field)[:limit]:
        if f.size > MAX_IMAGE:
            raise TradeError("Each image must be 2 MB or smaller.")
        if not str(f.content_type).startswith("image/"):
            raise TradeError("Only image files are allowed.")
        out.append((f.name, f.read(), f.content_type))
    return out


class StatusView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response({"giftcards": giftcards_enabled(), "rmb": rmb_enabled(),
                         "show_on_ios": bool(getattr(settings, "VTU_TRADE_SHOW_ON_IOS", False))})


class _GiftView(APIView):
    permission_classes = [IsAuthenticated, IsVerified]

    def initial(self, request, *args, **kwargs):
        super().initial(request, *args, **kwargs)
        self._off = not giftcards_enabled()


class BuyCountriesView(_GiftView):
    def get(self, request):
        if self._off:
            return _off("Gift cards")
        try:
            return Response({"results": _vtu().gc_buy_countries()})
        except Exception:                               # noqa: BLE001
            return _err(TradeError("Couldn't load countries. Try again."))


class BuyProductsView(_GiftView):
    def get(self, request):
        if self._off:
            return _off("Gift cards")
        country = (request.query_params.get("country") or "").upper()
        if len(country) != 2:
            return _err(TradeError("Choose a country."))
        try:
            return Response({"results": _vtu().gc_buy_products(country)})
        except Exception:                               # noqa: BLE001
            return _err(TradeError("Couldn't load gift cards. Try again."))


class BuyQuoteView(_GiftView):
    def post(self, request):
        if self._off:
            return _off("Gift cards")
        d = request.data
        try:
            q = TradeService.giftcard_quote(d.get("product_id"), d.get("amount"), d.get("quantity") or 1)
        except TradeError as exc:
            return _err(exc)
        return Response({"price": str(q["price"]), "quantity": q["quantity"]})


class BuyView(_GiftView):
    def post(self, request):
        if self._off:
            return _off("Gift cards")
        d = request.data
        try:
            o = TradeService.buy_giftcard(user=request.user, product_id=d.get("product_id"), amount=d.get("amount"),
                                          quantity=d.get("quantity") or 1, title=str(d.get("title") or "")[:150])
        except InsufficientFunds:
            return Response({"detail": "Insufficient wallet balance."}, status=status.HTTP_402_PAYMENT_REQUIRED)
        except TradeError as exc:
            return _err(exc)
        return Response(TradeOrderSerializer(o).data, status=status.HTTP_201_CREATED)


class SellCatalogView(_GiftView):
    def get(self, request):
        if self._off:
            return _off("Gift cards")
        try:
            return Response({"results": _vtu().gc_sell_catalog()})
        except Exception:                               # noqa: BLE001
            return _err(TradeError("Couldn't load gift cards. Try again."))


class SellRatesView(_GiftView):
    def get(self, request):
        if self._off:
            return _off("Gift cards")
        try:
            data = _vtu().gc_sell_rates(request.query_params.get("slug") or None)
        except Exception:                               # noqa: BLE001
            return _err(TradeError("Couldn't load rates. Try again."))
        margin = getattr(settings, "GIFTCARD_SELL_MARGIN_PCT", 0) or 0
        return Response({"results": data, "oam_margin_pct": float(margin)})


class SellView(_GiftView):
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def post(self, request):
        if self._off:
            return _off("Gift cards")
        keys = ("slug", "card_country", "card_type", "sub_type", "card_currency", "card_amount", "additional_info")
        fields = {k: request.data.get(k) for k in keys}
        try:
            images = _files(request, "images", 5) or _files(request, "images[]", 5)
            o = TradeService.sell_giftcard(user=request.user, fields=fields, images=images,
                                           title=str(request.data.get("title") or "")[:150])
        except TradeError as exc:
            return _err(exc)
        return Response(TradeOrderSerializer(o).data, status=status.HTTP_201_CREATED)


class _RmbView(APIView):
    permission_classes = [IsAuthenticated, IsVerified]


class RmbRatesView(_RmbView):
    def get(self, request):
        if not rmb_enabled():
            return _off("RMB purchase")
        try:
            return Response(TradeService.rmb_rates())
        except Exception:                               # noqa: BLE001
            return _err(TradeError("Couldn't load RMB rates. Try again."))


class RmbQuoteView(_RmbView):
    def post(self, request):
        if not rmb_enabled():
            return _off("RMB purchase")
        d = request.data
        try:
            q = TradeService.rmb_quote(d.get("channel"), d.get("account_type") or None, d.get("rmb_amount"))
        except (TradeError, ValueError, ArithmeticError) as exc:
            return _err(exc if isinstance(exc, TradeError) else TradeError("Enter a valid amount."))
        return Response({"price": str(q["price"])})


class RmbBuyView(_RmbView):
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def post(self, request):
        if not rmb_enabled():
            return _off("RMB purchase")
        keys = ("channel", "alipay_account_type", "wechat_account_type", "rmb_amount", "recipient_name",
                "recipient_identifier", "recipient_bank_name", "recipient_bank_account_number", "description")
        fields = {k: request.data.get(k) for k in keys}
        try:
            qr = _files(request, "qr_code", 1)
            o = TradeService.buy_rmb(user=request.user, fields=fields, qr=qr[0] if qr else None)
        except InsufficientFunds:
            return Response({"detail": "Insufficient wallet balance."}, status=status.HTTP_402_PAYMENT_REQUIRED)
        except (TradeError, ValueError, ArithmeticError) as exc:
            return _err(exc if isinstance(exc, TradeError) else TradeError("Check the amount and details."))
        return Response(TradeOrderSerializer(o).data, status=status.HTTP_201_CREATED)


class OrderListView(APIView):
    permission_classes = [IsAuthenticated, IsVerified]

    def get(self, request):
        qs = TradeOrder.objects.filter(user=request.user)
        kind = request.query_params.get("kind")
        if kind:
            qs = qs.filter(kind=kind)
        return Response({"results": TradeOrderSerializer(qs[:50], many=True).data})


class OrderDetailView(APIView):
    permission_classes = [IsAuthenticated, IsVerified]

    def get(self, request, reference):
        o = TradeOrder.objects.filter(user=request.user, reference=reference).first()
        if o is None:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        return Response(TradeOrderSerializer(TradeService.refresh(o)).data)

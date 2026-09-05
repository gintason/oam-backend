from rest_framework.generics import ListAPIView, RetrieveAPIView
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

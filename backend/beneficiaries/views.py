from rest_framework import mixins, viewsets
from rest_framework.permissions import IsAuthenticated

from .models import Beneficiary
from .serializers import BeneficiarySerializer
from .services import upsert_beneficiary

# How many "recent" entries to return per service. The UI only shows a handful;
# capping keeps the row a quick tap rather than an endless scroll.
MAX_PER_SERVICE = 12


class BeneficiaryViewSet(
    mixins.ListModelMixin,
    mixins.CreateModelMixin,
    mixins.UpdateModelMixin,   # PATCH the label
    mixins.DestroyModelMixin,
    viewsets.GenericViewSet,
):
    """
    /api/v1/beneficiaries/            GET  (list, ?type=airtime|data|electricity|cable)
    /api/v1/beneficiaries/            POST (create-or-refresh; idempotent)
    /api/v1/beneficiaries/{id}/       PATCH  (set label)  |  DELETE
    """

    serializer_class = BeneficiarySerializer
    permission_classes = [IsAuthenticated]
    pagination_class = None  # the list is short and pre-capped

    def get_queryset(self):
        qs = Beneficiary.objects.filter(user=self.request.user)
        service = self.request.query_params.get("type")
        if service:
            qs = qs.filter(service_type=service)
        return qs[:MAX_PER_SERVICE]

    def create(self, request, *args, **kwargs):
        """
        POSTing an identifier the user already has must not 400 on the unique
        constraint — it should just refresh it. So we route create through the
        same idempotent upsert the purchase flow uses, then return the row.
        """
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        obj = upsert_beneficiary(
            user=request.user,
            service_type=data["service_type"],
            account_identifier=data["account_identifier"],
            biller_code=data.get("biller_code", ""),
            biller_name=data.get("biller_name", ""),
            customer_name=data.get("customer_name", ""),
        )
        from rest_framework.response import Response
        from rest_framework import status

        if obj is None:
            return Response(
                {"detail": "Could not save beneficiary."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return Response(self.get_serializer(obj).data, status=status.HTTP_201_CREATED)

"""
/api/v1/deliveries/

customer   requests/quote/  requests/  requests/<id>/  …/cancel/  …/rate/  …/verify-payment/
rider      rider/apply/  rider/me/  rider/availability/  rider/location/  rider/offers/
           rider/offers/<id>/accept|reject/  rider/active/  rider/jobs/
           rider/deliveries/<id>/pickup|start|deliver|release/  rider/earnings/
admin      admin/overview/  admin/riders/  admin/deliveries/  admin/zones/  admin/surges/
           admin/settings/
internal   internal/tick/   (X-Cron-Secret)
"""
from __future__ import annotations

import hmac
import logging
import os

from django.conf import settings
from django.db.models import Q
from django.shortcuts import get_object_or_404
from rest_framework import mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import AllowAny, BasePermission, IsAdminUser, IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import UserRateThrottle
from rest_framework.views import APIView

from . import dispatch
from .events import DeliveryError
from .models import (
    ACTIVE_STATUSES,
    DeliveryRequest,
    DeliveryStatus,
    DeliveryZone,
    DispatchSettings,
    RiderProfile,
    SurgePricing,
)
from .serializers import (
    AdminDeliveryListSerializer,
    AdminDeliverySerializer,
    AdminRiderSerializer,
    AvailabilitySerializer,
    CancelSerializer,
    CreateDeliverySerializer,
    DeliveryDetailSerializer,
    DeliveryListSerializer,
    DeliveryZoneSerializer,
    DispatchSettingsSerializer,
    LocationSerializer,
    OfferSerializer,
    QuoteInputSerializer,
    RateSerializer,
    RiderActionSerializer,
    RiderApplySerializer,
    RiderDeliverySerializer,
    RiderDocumentSerializer,
    RiderProfileSerializer,
    RiderReviewSerializer,
    SurgePricingSerializer,
)
from .services import AdminService, CustomerService, MaintenanceService, PaymentService, RiderService

logger = logging.getLogger(__name__)


class DeliveryErrorMixin:
    def handle_exception(self, exc):
        if isinstance(exc, DeliveryError):
            return Response({"detail": str(exc.args[0] if exc.args else "Something went wrong."),
                             "code": exc.code}, status=exc.status)
        return super().handle_exception(exc)


class Page(PageNumberPagination):
    page_size = 20
    page_size_query_param = "page_size"
    max_page_size = 100


class CreateThrottle(UserRateThrottle):
    rate = "30/hour"
    scope = "deliveries_create"


class LocationThrottle(UserRateThrottle):
    rate = "120/min"
    scope = "deliveries_location"


class HasRiderProfile(BasePermission):
    message = "Apply to become a rider first."

    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated
                    and RiderProfile.objects.filter(user=request.user).exists())


class IsApprovedRider(HasRiderProfile):
    message = "Your rider account isn't active."

    def has_permission(self, request, view):
        return (super().has_permission(request, view)
                and RiderProfile.objects.filter(user=request.user).values_list(
                    "verification_status", flat=True).first()
                == RiderProfile.Verification.APPROVED)


def _rider(request) -> RiderProfile:
    """Fresh from the DB — a cached user.rider_profile could be stale after a review."""
    return RiderProfile.objects.select_related("user").get(user=request.user)


def _detail_qs():
    return DeliveryRequest.objects.select_related("rider", "zone", "customer").prefetch_related("events")


# --------------------------------------------------------------------------- #
# Customer
# --------------------------------------------------------------------------- #

class MetaView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        from .models import PackageCategory, RiderDocument, VehicleType
        from .pricing import CATEGORY_MULTIPLIER
        cfg = DispatchSettings.load()
        return Response({
            "package_categories": [{"value": v, "label": str(l),
                                    "multiplier": str(CATEGORY_MULTIPLIER[v])}
                                   for v, l in PackageCategory.choices],
            "vehicle_types": [{"value": v, "label": str(l)} for v, l in VehicleType.choices],
            "document_kinds": [{"value": v, "label": str(l)} for v, l in RiderDocument.Kind.choices],
            "statuses": [{"value": v, "label": str(l)} for v, l in DeliveryStatus.choices],
            "offer_timeout_s": cfg.offer_timeout_s,
            "free_weight_kg": str(cfg.free_weight_kg),
        })


class QuoteView(DeliveryErrorMixin, APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        s = QuoteInputSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        return Response(CustomerService.quote(s.validated_data).as_dict())


class DeliveryRequestViewSet(DeliveryErrorMixin, mixins.ListModelMixin, mixins.RetrieveModelMixin,
                             viewsets.GenericViewSet):
    permission_classes = [IsAuthenticated]
    pagination_class = Page

    def get_queryset(self):
        qs = _detail_qs().filter(customer=self.request.user)
        ref = (self.request.query_params.get("reference") or "").strip()
        if ref:
            qs = qs.filter(Q(reference=ref) | Q(payment_reference=ref))
        state = self.request.query_params.get("state")
        if state == "active":
            qs = qs.exclude(status__in=[DeliveryStatus.DELIVERED, DeliveryStatus.CANCELLED])
        elif state == "past":
            qs = qs.filter(status__in=[DeliveryStatus.DELIVERED, DeliveryStatus.CANCELLED])
        return qs

    def get_serializer_class(self):
        return DeliveryListSerializer if self.action == "list" else DeliveryDetailSerializer

    def get_throttles(self):
        return [CreateThrottle()] if self.action == "create" else super().get_throttles()

    def retrieve(self, request, *args, **kwargs):
        d = self.get_object()
        if d.status == DeliveryStatus.PENDING:
            dispatch.advance([d.pk])          # lazy: polling drives the next round
            d = self.get_queryset().get(pk=d.pk)
        return Response(DeliveryDetailSerializer(d).data)

    def create(self, request):
        s = CreateDeliverySerializer(data=request.data)
        s.is_valid(raise_exception=True)
        d = CustomerService.create(user=request.user, data=s.validated_data)
        return Response(DeliveryDetailSerializer(self.get_queryset().get(pk=d.pk)).data,
                        status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"])
    def cancel(self, request, pk=None):
        d = self.get_object()
        s = CancelSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        CustomerService.cancel(delivery_id=d.pk, by="customer", user=request.user,
                               reason=s.validated_data.get("reason", ""))
        return Response(DeliveryDetailSerializer(self.get_queryset().get(pk=d.pk)).data)

    @action(detail=True, methods=["post"])
    def rate(self, request, pk=None):
        d = self.get_object()
        s = RateSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        CustomerService.rate(user=request.user, delivery_id=d.pk, **s.validated_data)
        return Response(DeliveryDetailSerializer(self.get_queryset().get(pk=d.pk)).data)

    @action(detail=True, methods=["post"], url_path="verify-payment")
    def verify_payment(self, request, pk=None):
        d = self.get_object()
        PaymentService.confirm_card(d)
        return Response(DeliveryDetailSerializer(self.get_queryset().get(pk=d.pk)).data)

    @action(detail=True, methods=["post"], url_path="retry-payment")
    def retry_payment(self, request, pk=None):
        d = self.get_object()
        if d.payment_status != DeliveryRequest.PaymentStatus.UNPAID or d.status != DeliveryStatus.PENDING:
            raise DeliveryError("This delivery doesn't need payment.", status=409)
        PaymentService.start_card_checkout(d, return_url=request.data.get("return_url") or "")
        return Response(DeliveryDetailSerializer(self.get_queryset().get(pk=d.pk)).data)


# --------------------------------------------------------------------------- #
# Rider
# --------------------------------------------------------------------------- #

class RiderApplyView(DeliveryErrorMixin, APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        s = RiderApplySerializer(data=request.data)
        s.is_valid(raise_exception=True)
        data = dict(s.validated_data)
        docs = data.pop("documents", [])
        rider = RiderService.apply(user=request.user, data=data, documents=docs)
        return Response(RiderProfileSerializer(rider).data, status=status.HTTP_201_CREATED)


class RiderMeView(DeliveryErrorMixin, APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        rider = RiderProfile.objects.filter(user=request.user).prefetch_related("documents").first()
        if rider is None:
            return Response({"detail": "Not a rider yet.", "code": "not_rider"}, status=404)
        active = (DeliveryRequest.objects.filter(rider=rider, status__in=ACTIVE_STATUSES)
                  .values_list("id", flat=True).first())
        return Response({**RiderProfileSerializer(rider).data,
                         "active_delivery_id": str(active) if active else None})

    def patch(self, request):
        rider = get_object_or_404(RiderProfile, user=request.user)
        s = RiderProfileSerializer(rider, data=request.data, partial=True)
        s.is_valid(raise_exception=True)
        s.save()
        return Response(s.data)


class RiderDocumentView(DeliveryErrorMixin, APIView):
    permission_classes = [HasRiderProfile]

    def post(self, request):
        s = RiderDocumentSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        rider = _rider(request)
        rider.documents.filter(kind=s.validated_data["kind"]).delete()
        doc = s.save(rider=rider)
        return Response(RiderDocumentSerializer(doc).data, status=status.HTTP_201_CREATED)


class RiderAvailabilityView(DeliveryErrorMixin, APIView):
    permission_classes = [HasRiderProfile]

    def post(self, request):
        s = AvailabilitySerializer(data=request.data)
        s.is_valid(raise_exception=True)
        v = s.validated_data
        rider = RiderService.set_availability(rider=_rider(request), online=v["online"],
                                              lat=v.get("lat"), lng=v.get("lng"))
        return Response(RiderProfileSerializer(rider).data)


class RiderLocationView(DeliveryErrorMixin, APIView):
    permission_classes = [IsApprovedRider]
    throttle_classes = [LocationThrottle]

    def post(self, request):
        s = LocationSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        RiderService.update_location(rider=_rider(request), **s.validated_data)
        return Response({"ok": True})


class RiderOffersView(DeliveryErrorMixin, APIView):
    permission_classes = [HasRiderProfile]

    def get(self, request):
        rider = _rider(request)
        if rider.verification_status != RiderProfile.Verification.APPROVED:
            return Response([])
        offers = RiderService.offers(rider).select_related("delivery__customer")
        return Response(OfferSerializer(offers, many=True).data)


class RiderOfferActionView(DeliveryErrorMixin, APIView):
    permission_classes = [IsApprovedRider]

    def post(self, request, offer_id, verb):
        rider = _rider(request)
        if verb == "accept":
            d = RiderService.accept(rider=rider, offer_id=offer_id)
            return Response(RiderDeliverySerializer(_detail_qs().get(pk=d.pk)).data)
        if verb == "reject":
            RiderService.reject(rider=rider, offer_id=offer_id)
            return Response({"ok": True})
        return Response({"detail": "Not found."}, status=404)


class RiderActiveView(DeliveryErrorMixin, APIView):
    permission_classes = [HasRiderProfile]

    def get(self, request):
        d = (_detail_qs().filter(rider=_rider(request), status__in=ACTIVE_STATUSES)
             .first())
        return Response({"delivery": RiderDeliverySerializer(d).data if d else None})


class RiderJobsView(DeliveryErrorMixin, APIView):
    permission_classes = [HasRiderProfile]

    def get(self, request):
        qs = _detail_qs().filter(rider=_rider(request)).order_by("-created_at")
        paginator = Page()
        page = paginator.paginate_queryset(qs, request, view=self)
        return paginator.get_paginated_response(RiderDeliverySerializer(page, many=True).data)


class RiderDeliveryDetailView(DeliveryErrorMixin, APIView):
    permission_classes = [HasRiderProfile]

    def get(self, request, delivery_id):
        d = get_object_or_404(_detail_qs(), pk=delivery_id, rider=_rider(request))
        return Response(RiderDeliverySerializer(d).data)


class RiderDeliveryActionView(DeliveryErrorMixin, APIView):
    permission_classes = [IsApprovedRider]

    def post(self, request, delivery_id, verb):
        s = RiderActionSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        v = s.validated_data
        rider = _rider(request)
        geo = {"lat": v.get("lat"), "lng": v.get("lng")}
        if verb == "pickup":
            d = RiderService.pickup(rider=rider, delivery_id=delivery_id,
                                    photo_url=v.get("photo_url", ""), **geo)
        elif verb == "start":
            d = RiderService.start(rider=rider, delivery_id=delivery_id, **geo)
        elif verb == "deliver":
            d = RiderService.deliver(rider=rider, delivery_id=delivery_id, code=v.get("code", ""),
                                     photo_url=v.get("photo_url", ""), **geo)
        elif verb == "release":
            d = RiderService.release(rider=rider, delivery_id=delivery_id,
                                     reason=v.get("reason", ""))
        else:
            return Response({"detail": "Not found."}, status=404)
        return Response(RiderDeliverySerializer(_detail_qs().get(pk=d.pk)).data)


class RiderEarningsView(DeliveryErrorMixin, APIView):
    permission_classes = [HasRiderProfile]

    def get(self, request):
        return Response(RiderService.earnings(_rider(request)))


# --------------------------------------------------------------------------- #
# Admin
# --------------------------------------------------------------------------- #

class AdminOverviewView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        dispatch.advance_throttled()
        return Response(AdminService.overview())


class AdminRiderViewSet(DeliveryErrorMixin, mixins.ListModelMixin, mixins.RetrieveModelMixin,
                        viewsets.GenericViewSet):
    permission_classes = [IsAdminUser]
    serializer_class = AdminRiderSerializer
    pagination_class = Page

    def get_queryset(self):
        qs = RiderProfile.objects.select_related("user").prefetch_related("documents")
        p = self.request.query_params
        if p.get("status"):
            qs = qs.filter(verification_status=p["status"])
        if p.get("availability"):
            qs = qs.filter(availability=p["availability"])
        if p.get("q"):
            q = p["q"].strip()
            qs = qs.filter(Q(full_name__icontains=q) | Q(phone__icontains=q)
                           | Q(user__email__icontains=q) | Q(vehicle_plate__icontains=q))
        return qs

    @action(detail=True, methods=["post"])
    def review(self, request, pk=None):
        s = RiderReviewSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        rider = RiderService.review(admin=request.user, rider_id=pk, **s.validated_data)
        return Response(AdminRiderSerializer(rider).data)


class AdminDeliveryViewSet(DeliveryErrorMixin, mixins.ListModelMixin, mixins.RetrieveModelMixin,
                           viewsets.GenericViewSet):
    permission_classes = [IsAdminUser]
    pagination_class = Page

    def get_serializer_class(self):
        return AdminDeliveryListSerializer if self.action == "list" else AdminDeliverySerializer

    def get_queryset(self):
        qs = _detail_qs()
        p = self.request.query_params
        if p.get("status"):
            qs = qs.filter(status__in=p["status"].split(","))
        if p.get("payment_status"):
            qs = qs.filter(payment_status=p["payment_status"])
        if p.get("unassigned") == "1":
            qs = qs.filter(status=DeliveryStatus.PENDING,
                           payment_status=DeliveryRequest.PaymentStatus.PAID)
        if p.get("q"):
            q = p["q"].strip()
            qs = qs.filter(Q(reference__icontains=q) | Q(customer__email__icontains=q)
                           | Q(recipient_phone__icontains=q) | Q(rider__full_name__icontains=q))
        return qs

    @action(detail=True, methods=["post"])
    def cancel(self, request, pk=None):
        s = CancelSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        CustomerService.cancel(delivery_id=pk, by="admin",
                               reason=s.validated_data.get("reason") or "Cancelled by support.")
        return Response(AdminDeliverySerializer(self.get_queryset().get(pk=pk)).data)

    @action(detail=True, methods=["post"])
    def redispatch(self, request, pk=None):
        AdminService.redispatch(pk)
        return Response(AdminDeliverySerializer(self.get_queryset().get(pk=pk)).data)


class AdminZoneViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAdminUser]
    serializer_class = DeliveryZoneSerializer
    queryset = DeliveryZone.objects.all()
    pagination_class = None


class AdminSurgeViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAdminUser]
    serializer_class = SurgePricingSerializer
    queryset = SurgePricing.objects.select_related("zone")
    pagination_class = None


class AdminSettingsView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        return Response(DispatchSettingsSerializer(DispatchSettings.load()).data)

    def patch(self, request):
        s = DispatchSettingsSerializer(DispatchSettings.load(), data=request.data, partial=True)
        s.is_valid(raise_exception=True)
        s.save()
        return Response(s.data)


class AdminQuotePreviewView(DeliveryErrorMixin, APIView):
    """Lets admins try a route against the current zones/surges."""
    permission_classes = [IsAdminUser]

    def post(self, request):
        s = QuoteInputSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        return Response(CustomerService.quote(s.validated_data).as_dict())


# --------------------------------------------------------------------------- #
# Internal
# --------------------------------------------------------------------------- #

class TickView(APIView):
    """
    POST /deliveries/internal/tick/   header  X-Cron-Secret: <DELIVERIES_CRON_SECRET>

    Expires offers, starts next dispatch rounds, auto-refunds lapsed requests
    and reconciles card checkouts. Point a free scheduler at it every minute.
    Falls back to JOBS_CRON_SECRET; 404 while neither is set.
    """
    permission_classes = [AllowAny]
    authentication_classes = []
    throttle_classes = []

    def post(self, request):
        secret = (getattr(settings, "DELIVERIES_CRON_SECRET", "")
                  or os.environ.get("DELIVERIES_CRON_SECRET", "")
                  or getattr(settings, "JOBS_CRON_SECRET", "")
                  or os.environ.get("JOBS_CRON_SECRET", ""))
        if not secret:
            return Response({"detail": "Not found."}, status=404)
        given = request.headers.get("X-Cron-Secret", "")
        if not hmac.compare_digest(given.encode(), secret.encode()):
            return Response({"detail": "Forbidden."}, status=403)
        return Response({"ok": True, "ran": MaintenanceService.tick()})

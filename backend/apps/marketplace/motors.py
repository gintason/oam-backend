"""
O.A.M Motors — the house vehicle inventory.

WHY A SEPARATE MODEL RATHER THAN MORE FIELDS ON Listing
  A car buyer decides on year, mileage, transmission and fuel long before they
  read a description, so those belong in structured fields — shown at a glance,
  and filterable later.

  But most marketplace listings are not vehicles, and adding eight car-specific
  columns to every fridge and sofa would make the seller form worse for
  everyone. So VehicleDetail hangs off a Listing one-to-one: ordinary listings
  are untouched, and a motors listing is simply a Listing that happens to have
  one attached.

  Everything else — browse, search, the listing page, a buyer messaging you —
  works unchanged, because a motors listing IS a listing.

WHY ADMIN-ONLY ENDPOINTS INSTEAD OF THE NORMAL SELLER FLOW
  The oam-motors category is admin-only, and the house inventory shouldn't be
  constrained by the Free/Premium/Pro listing caps. Those exist to price
  third-party sellers; OAM charging itself for its own listings would be
  meaningless bookkeeping. These endpoints skip the tier check deliberately and
  are locked to staff.
"""
from __future__ import annotations

import uuid

from django.db import models, transaction
from django.utils import timezone
from rest_framework import serializers
from rest_framework import status as http
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.common.models import TimeStampedModel

from .models import Category, Listing, ListingImage

MOTORS_SLUG = "oam-motors"


class VehicleDetail(TimeStampedModel):
    """Structured vehicle facts attached to a marketplace listing."""

    class Transmission(models.TextChoices):
        AUTOMATIC = "automatic", "Automatic"
        MANUAL = "manual", "Manual"
        CVT = "cvt", "CVT"

    class Fuel(models.TextChoices):
        PETROL = "petrol", "Petrol"
        DIESEL = "diesel", "Diesel"
        HYBRID = "hybrid", "Hybrid"
        ELECTRIC = "electric", "Electric"
        LPG = "lpg", "LPG"

    class BodyType(models.TextChoices):
        SEDAN = "sedan", "Sedan"
        SUV = "suv", "SUV"
        HATCHBACK = "hatchback", "Hatchback"
        PICKUP = "pickup", "Pickup"
        BUS = "bus", "Bus"
        TRUCK = "truck", "Truck"
        COUPE = "coupe", "Coupé"
        WAGON = "wagon", "Wagon"
        VAN = "van", "Van"
        OTHER = "other", "Other"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    listing = models.OneToOneField(
        Listing, on_delete=models.CASCADE, related_name="vehicle"
    )

    make = models.CharField(max_length=60)
    model_name = models.CharField(max_length=80)
    year = models.PositiveIntegerField()
    mileage_km = models.PositiveIntegerField(null=True, blank=True)

    transmission = models.CharField(max_length=16, choices=Transmission.choices, blank=True)
    fuel = models.CharField(max_length=16, choices=Fuel.choices, blank=True)
    body_type = models.CharField(max_length=16, choices=BodyType.choices, blank=True)
    colour = models.CharField(max_length=40, blank=True)
    engine_size = models.CharField(max_length=20, blank=True)     # e.g. "2.4L"
    seats = models.PositiveSmallIntegerField(null=True, blank=True)

    # Registration status matters a great deal to a Nigerian buyer: an unpaid
    # customs duty can cost more than the discount that made the car look cheap.
    is_registered = models.BooleanField(default=False)
    duty_paid = models.BooleanField(default=False)

    # Kept for internal records. Never exposed publicly — a VIN on a public page
    # is enough for someone to clone the vehicle's identity.
    vin = models.CharField(max_length=32, blank=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.year} {self.make} {self.model_name}"

    @property
    def headline(self) -> str:
        return f"{self.year} {self.make} {self.model_name}".strip()


# --------------------------------------------------------------------------- #
# Serializers
# --------------------------------------------------------------------------- #

PUBLIC_VEHICLE_FIELDS = [
    "make", "model_name", "year", "mileage_km", "transmission", "fuel",
    "body_type", "colour", "engine_size", "seats", "is_registered", "duty_paid",
]


class VehicleSerializer(serializers.ModelSerializer):
    """Public view — note the absence of `vin`."""

    class Meta:
        model = VehicleDetail
        fields = PUBLIC_VEHICLE_FIELDS
        read_only_fields = fields


class VehicleWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = VehicleDetail
        fields = PUBLIC_VEHICLE_FIELDS + ["vin"]

    def validate_year(self, value):
        current = timezone.now().year
        # Cars are sold a model year ahead, hence +1. The lower bound keeps
        # obvious typos (19 instead of 2019) out of the inventory.
        if value < 1950 or value > current + 1:
            raise serializers.ValidationError(f"Year must be between 1950 and {current + 1}.")
        return value

    def validate_mileage_km(self, value):
        if value is not None and value > 2_000_000:
            raise serializers.ValidationError("That mileage looks like a typo.")
        return value


class MotorsListingSerializer(serializers.ModelSerializer):
    """A motors listing as the admin sees it, vehicle facts included."""

    vehicle = VehicleWriteSerializer(read_only=True)
    images = serializers.SerializerMethodField()

    class Meta:
        model = Listing
        fields = [
            "id", "title", "description", "price", "currency", "negotiable",
            "condition", "location", "status", "is_featured", "views_count",
            "contact_phone", "contact_whatsapp", "expires_at",
            "created_at", "updated_at", "vehicle", "images",
        ]
        read_only_fields = ["id", "views_count", "created_at", "updated_at"]

    def get_images(self, obj):
        return [
            {"id": str(i.id), "url": i.url, "is_primary": i.is_primary}
            for i in obj.images.all()
        ]


# --------------------------------------------------------------------------- #
# Views
# --------------------------------------------------------------------------- #

def _motors_category() -> Category:
    """
    The house category, created on demand.

    Made admin-only so it can't be posted into from the ordinary seller form —
    an OAM Motors listing should mean OAM is selling it.
    """
    category, _ = Category.objects.get_or_create(
        slug=MOTORS_SLUG,
        defaults={
            "name": "O.A.M Motors",
            "description": "Vehicles sold directly by O.A.M Motors.",
            "is_admin_only": True,
            "is_active": True,
            "order": 0,
        },
    )
    if not category.is_admin_only:
        category.is_admin_only = True
        category.save(update_fields=["is_admin_only", "updated_at"])
    return category


class MotorsInventoryView(APIView):
    """GET /marketplace/motors/  ·  POST /marketplace/motors/"""

    permission_classes = [IsAdminUser]

    def get(self, request):
        qs = (
            Listing.objects
            .filter(category__slug=MOTORS_SLUG)
            .select_related("category")
            .prefetch_related("images", "vehicle")
            .order_by("-created_at")
        )
        status_filter = request.query_params.get("status")
        if status_filter and status_filter != "all":
            qs = qs.filter(status=status_filter)

        return Response({
            "count": qs.count(),
            "results": MotorsListingSerializer(qs[:100], many=True).data,
        })

    @transaction.atomic
    def post(self, request):
        vehicle_data = request.data.get("vehicle") or {}
        vehicle_serializer = VehicleWriteSerializer(data=vehicle_data)
        vehicle_serializer.is_valid(raise_exception=True)
        vehicle = vehicle_serializer.validated_data

        images = request.data.get("images") or []
        if not images:
            # A car listing with no photographs is not a listing anyone will
            # act on, and it costs nothing to insist here.
            return Response(
                {"detail": "Add at least one photo of the vehicle."},
                status=http.HTTP_400_BAD_REQUEST,
            )

        price = request.data.get("price")
        if not price:
            return Response({"detail": "Enter a price."}, status=http.HTTP_400_BAD_REQUEST)

        title = (request.data.get("title") or "").strip() or (
            f"{vehicle['year']} {vehicle['make']} {vehicle['model_name']}"
        )

        listing = Listing.objects.create(
            seller=request.user,
            category=_motors_category(),
            title=title[:200],
            description=(request.data.get("description") or "").strip(),
            price=price,
            currency=request.data.get("currency", "NGN"),
            negotiable=bool(request.data.get("negotiable", True)),
            condition=request.data.get("condition", "used"),
            location=(request.data.get("location") or "").strip(),
            contact_phone=(request.data.get("contact_phone") or "").strip(),
            contact_whatsapp=(request.data.get("contact_whatsapp") or "").strip(),
            status=getattr(Listing.Status, "ACTIVE", "active"),
            is_featured=True,          # house stock leads the category
            expires_at=timezone.now() + timezone.timedelta(days=90),
        )

        VehicleDetail.objects.create(listing=listing, **vehicle)

        for index, url in enumerate(images[:12]):
            ListingImage.objects.create(listing=listing, url=url, is_primary=index == 0)

        return Response(
            MotorsListingSerializer(listing).data, status=http.HTTP_201_CREATED
        )


class MotorsDetailView(APIView):
    """GET · PATCH · DELETE  /marketplace/motors/<listing_id>/"""

    permission_classes = [IsAdminUser]

    def _get(self, listing_id):
        return (
            Listing.objects
            .filter(id=listing_id, category__slug=MOTORS_SLUG)
            .prefetch_related("images")
            .first()
        )

    def get(self, request, listing_id):
        listing = self._get(listing_id)
        if listing is None:
            return Response({"detail": "Not found."}, status=http.HTTP_404_NOT_FOUND)
        return Response(MotorsListingSerializer(listing).data)

    @transaction.atomic
    def patch(self, request, listing_id):
        listing = self._get(listing_id)
        if listing is None:
            return Response({"detail": "Not found."}, status=http.HTTP_404_NOT_FOUND)

        for field in ("title", "description", "price", "location", "condition",
                      "status", "contact_phone", "contact_whatsapp"):
            if field in request.data:
                setattr(listing, field, request.data[field])
        if "negotiable" in request.data:
            listing.negotiable = bool(request.data["negotiable"])
        if "is_featured" in request.data:
            listing.is_featured = bool(request.data["is_featured"])
        listing.save()

        if "vehicle" in request.data:
            vehicle = getattr(listing, "vehicle", None)
            serializer = VehicleWriteSerializer(
                vehicle, data=request.data["vehicle"], partial=True
            )
            serializer.is_valid(raise_exception=True)
            if vehicle is None:
                VehicleDetail.objects.create(listing=listing, **serializer.validated_data)
            else:
                serializer.save()

        if "images" in request.data:
            listing.images.all().delete()
            for index, url in enumerate((request.data["images"] or [])[:12]):
                ListingImage.objects.create(listing=listing, url=url, is_primary=index == 0)

        return Response(MotorsListingSerializer(listing).data)

    def delete(self, request, listing_id):
        listing = self._get(listing_id)
        if listing is None:
            return Response({"detail": "Not found."}, status=http.HTTP_404_NOT_FOUND)
        # Soft-remove: an enquiry thread references this listing, and hard
        # deletion would leave a buyer staring at a broken conversation.
        listing.status = getattr(Listing.Status, "REMOVED", "removed")
        listing.save(update_fields=["status", "updated_at"])
        return Response(status=http.HTTP_204_NO_CONTENT)

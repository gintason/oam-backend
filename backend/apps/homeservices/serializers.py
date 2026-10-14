from rest_framework import serializers

from .models import ArtisanProfile, ServiceCategory


class ServiceCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = ServiceCategory
        fields = ("id", "name", "slug", "icon", "order")


class TradeRefField(serializers.PrimaryKeyRelatedField):
    """A trade by id, or by slug ("mechanic") — the mobile app sends the slug."""

    def to_internal_value(self, data):
        if isinstance(data, str) and data and not _looks_like_uuid(data):
            trade = self.get_queryset().filter(slug=data).first()
            if trade is None:
                self.fail("does_not_exist", pk_value=data)
            return trade
        return super().to_internal_value(data)


def _looks_like_uuid(value: str) -> bool:
    import uuid
    try:
        uuid.UUID(value)
        return True
    except ValueError:
        return False


class ArtisanWriteSerializer(serializers.ModelSerializer):
    category = TradeRefField(queryset=ServiceCategory.objects.all(),
                             error_messages={"does_not_exist": "That trade isn't available — pick one from the list."})

    class Meta:
        model = ArtisanProfile
        fields = ("id", "category", "business_name", "description", "phone", "whatsapp",
                  "profile_photo", "address", "city", "state", "latitude", "longitude",
                  "years_experience", "is_available")


class ArtisanListSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source="category.name", read_only=True)
    distance_km = serializers.FloatField(read_only=True, required=False)
    is_featured = serializers.BooleanField(source="is_currently_featured", read_only=True)

    class Meta:
        model = ArtisanProfile
        fields = ("id", "business_name", "category_name", "city", "state",
                  "is_verified", "is_featured", "distance_km", "profile_photo")


class ArtisanDetailSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source="category.name", read_only=True)
    is_featured = serializers.BooleanField(source="is_currently_featured", read_only=True)
    distance_km = serializers.FloatField(read_only=True, required=False)
    work_videos = serializers.SerializerMethodField()

    def get_work_videos(self, obj):
        """Approved "previous work" videos, newest first — shown on the public profile."""
        from .work_videos import ArtisanWorkVideo
        rows = ArtisanWorkVideo.objects.filter(
            artisan=obj, status=ArtisanWorkVideo.Status.APPROVED).order_by("-created_at")[:12]
        return [{"id": str(v.id), "url": v.video_url, "caption": v.caption} for v in rows]

    class Meta:
        model = ArtisanProfile
        fields = ("id", "business_name", "category", "category_name", "description", "profile_photo", "address", "city", "state", "latitude", "longitude", "years_experience", "is_available", "is_verified", "is_featured", "distance_km", "views_count", "created_at", "work_videos")


class ArtisanOwnerSerializer(ArtisanDetailSerializer):
    """
    The artisan's own view of their profile.

    Same as the public one plus phone/whatsapp — they must be able to see
    and edit the numbers they gave us. Never use this for anyone else's
    profile: contacts belong behind an accepted conversation.
    """

    class Meta(ArtisanDetailSerializer.Meta):
        fields = ("id", "business_name", "phone", "whatsapp", "category", "category_name", "description", "profile_photo", "address", "city", "state", "latitude", "longitude", "years_experience", "is_available", "is_verified", "is_featured", "distance_km", "views_count", "created_at")

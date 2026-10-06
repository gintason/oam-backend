from rest_framework import serializers

from .models import ArtisanProfile, ServiceCategory


class ServiceCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = ServiceCategory
        fields = ("id", "name", "slug", "icon", "order")


class ArtisanWriteSerializer(serializers.ModelSerializer):
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

    class Meta:
        model = ArtisanProfile
        fields = ("id", "business_name", "category", "category_name", "description", "profile_photo", "address", "city", "state", "latitude", "longitude", "years_experience", "is_available", "is_verified", "is_featured", "distance_km", "views_count", "created_at")


class ArtisanOwnerSerializer(ArtisanDetailSerializer):
    """
    The artisan's own view of their profile.

    Same as the public one plus phone/whatsapp — they must be able to see
    and edit the numbers they gave us. Never use this for anyone else's
    profile: contacts belong behind an accepted conversation.
    """

    class Meta(ArtisanDetailSerializer.Meta):
        fields = ("id", "business_name", "phone", "whatsapp", "category", "category_name", "description", "profile_photo", "address", "city", "state", "latitude", "longitude", "years_experience", "is_available", "is_verified", "is_featured", "distance_km", "views_count", "created_at")

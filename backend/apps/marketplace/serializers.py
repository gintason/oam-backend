from rest_framework import serializers

from .models import Category, Listing, ListingImage, ListingVideo, SellerSubscription
from .motors import VehicleSerializer


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ("id", "name", "slug", "description", "icon", "is_admin_only", "order")


class ListingImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ListingImage
        fields = ("id", "url", "is_primary")


class ListingVideoSerializer(serializers.ModelSerializer):
    class Meta:
        model = ListingVideo
        fields = ("id", "url", "thumbnail_url")


class ListingListSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source="category.name", read_only=True)
    primary_image = serializers.SerializerMethodField()

    class Meta:
        model = Listing
        fields = ("id", "title", "price", "currency", "negotiable", "condition",
                  "location", "category_name", "is_featured", "is_verified",
                  "primary_image", "created_at")

    def get_primary_image(self, obj):
        img = next((i for i in obj.images.all() if i.is_primary), None) or \
            (obj.images.all()[0] if obj.images.all() else None)
        return img.url if img else None


class ListingDetailSerializer(serializers.ModelSerializer):
    # Present only on O.A.M Motors listings; null everywhere else.
    vehicle = VehicleSerializer(read_only=True)
    category_name = serializers.CharField(source="category.name", read_only=True)
    images = ListingImageSerializer(many=True, read_only=True)
    videos = ListingVideoSerializer(many=True, read_only=True)
    seller_name = serializers.SerializerMethodField()

    class Meta:
        model = Listing
        fields = ("id", "title", "description", "price", "currency", "negotiable", "condition", "location", "category", "category_name", "status", "is_featured", "is_verified", "verified_at", "views_count", "seller_name", "images", "videos", "expires_at", "created_at", "updated_at", "vehicle")

    def get_seller_name(self, obj):
        """Display the seller's real name, falling back gracefully.

        full name (first + last) -> email/phone identifier -> id. We never
        expose the raw email when a proper name is available.
        """
        seller = obj.seller
        full_name = (seller.get_full_name() or "").strip() if seller else ""
        if full_name:
            return full_name
        return getattr(seller, "identifier", None) or str(obj.seller_id)


class ListingWriteSerializer(serializers.ModelSerializer):
    images = serializers.ListField(
        child=serializers.URLField(), required=False, allow_empty=True, write_only=True)
    videos = serializers.ListField(
        child=serializers.URLField(), required=False, allow_empty=True, write_only=True)

    class Meta:
        model = Listing
        fields = ("id", "category", "title", "description", "price", "currency",
                  "negotiable", "condition", "location", "contact_phone",
                  "contact_whatsapp", "images", "videos")

    def validate_price(self, v):
        if v < 0:
            raise serializers.ValidationError("Price cannot be negative.")
        return v


class SubscriptionSerializer(serializers.ModelSerializer):
    active_tier = serializers.CharField(read_only=True)
    listing_limit = serializers.SerializerMethodField()
    active_listings = serializers.SerializerMethodField()

    class Meta:
        model = SellerSubscription
        fields = ("tier", "active_tier", "expires_at", "listing_limit", "active_listings")

    def get_listing_limit(self, obj):
        lim = obj.listing_limit()
        return "unlimited" if lim is None else lim

    def get_active_listings(self, obj):
        from .services import MarketplaceService
        return MarketplaceService.active_listing_count(obj.user)

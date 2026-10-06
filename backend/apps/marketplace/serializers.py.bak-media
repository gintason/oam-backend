from rest_framework import serializers

from .models import ListingComment, Category, Listing, ListingImage, ListingVideo, SellerSubscription
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


class _SocialFieldsMixin:
    def get_likes_count(self, obj):
        v = getattr(obj, "likes_count_ann", None)
        return v if v is not None else obj.likes.count()

    def get_comments_count(self, obj):
        v = getattr(obj, "comments_count_ann", None)
        return v if v is not None else obj.comments.count()

    def get_liked(self, obj):
        request = self.context.get("request")
        user = getattr(request, "user", None)
        if not (user and user.is_authenticated):
            return False
        liked_ids = self.context.get("liked_ids")
        if liked_ids is not None:
            return obj.id in liked_ids
        return obj.likes.filter(user=user).exists()


class ListingListSerializer(_SocialFieldsMixin, serializers.ModelSerializer):
    category_name = serializers.CharField(source="category.name", read_only=True)
    primary_image = serializers.SerializerMethodField()
    likes_count = serializers.SerializerMethodField()
    comments_count = serializers.SerializerMethodField()
    liked = serializers.SerializerMethodField()

    class Meta:
        model = Listing
        fields = ("id", "title", "price", "currency", "negotiable", "condition",
                  "location", "category_name", "is_featured", "is_verified",
                  "primary_image", "views_count", "likes_count", "comments_count",
                  "liked", "created_at")

    def get_primary_image(self, obj):
        img = next((i for i in obj.images.all() if i.is_primary), None) or \
            (obj.images.all()[0] if obj.images.all() else None)
        return img.url if img else None


class ListingDetailSerializer(_SocialFieldsMixin, serializers.ModelSerializer):
    # Present only on O.A.M Motors listings; null everywhere else.
    vehicle = VehicleSerializer(read_only=True)
    category_name = serializers.CharField(source="category.name", read_only=True)
    images = ListingImageSerializer(many=True, read_only=True)
    videos = ListingVideoSerializer(many=True, read_only=True)
    seller_name = serializers.SerializerMethodField()
    is_owner = serializers.SerializerMethodField()
    likes_count = serializers.SerializerMethodField()
    comments_count = serializers.SerializerMethodField()
    liked = serializers.SerializerMethodField()

    class Meta:
        model = Listing
        fields = ("id", "title", "description", "price", "currency", "negotiable", "condition", "location", "category", "category_name", "status", "is_featured", "is_verified", "verified_at", "views_count", "likes_count", "comments_count", "liked", "seller_name", "is_owner", "images", "videos", "expires_at", "created_at", "updated_at", "vehicle")

    def get_is_owner(self, obj):
        request = self.context.get("request")
        user = getattr(request, "user", None)
        return bool(user and user.is_authenticated and obj.seller_id == user.id)

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


class ListingCommentSerializer(serializers.ModelSerializer):
    user_name = serializers.SerializerMethodField()

    class Meta:
        model = ListingComment
        fields = ("id", "body", "user_name", "created_at")
        read_only_fields = ("id", "user_name", "created_at")

    def get_user_name(self, obj):
        u = obj.user
        full = (u.get_full_name() or "").strip() if u else ""
        return full or getattr(u, "identifier", None) or "OAM User"

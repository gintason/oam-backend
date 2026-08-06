"""
Artisan "videos of previous work" — uploaded by the artisan, approved by an admin.

Videos land here as PENDING. An admin approves or rejects them from the Django
admin (bulk actions provided). Only APPROVED videos should be surfaced on the
public artisan profile; everything else stays private to the owner.

Wiring (three one-line additions — see SETUP.md):
  - apps/homeservices/models.py : from .work_videos import ArtisanWorkVideo   # noqa
  - apps/homeservices/admin.py  : from . import work_videos                   # noqa
  - apps/homeservices/urls.py   : from .work_videos import urlpatterns as work_video_urls
                                  urlpatterns += work_video_urls
Then:  python manage.py makemigrations homeservices && python manage.py migrate
"""
import uuid

from django.conf import settings
from django.contrib import admin
from django.db import models
from django.utils import timezone
from django.utils.translation import gettext_lazy as _
from rest_framework import mixins, serializers, viewsets
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.routers import DefaultRouter

from apps.common.models import TimeStampedModel

from .models import ArtisanProfile


class ArtisanWorkVideo(TimeStampedModel):
    class Status(models.TextChoices):
        PENDING = "pending", _("Pending review")
        APPROVED = "approved", _("Approved")
        REJECTED = "rejected", _("Rejected")

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    artisan = models.ForeignKey(
        ArtisanProfile,
        on_delete=models.CASCADE,
        related_name="work_videos",
    )
    video_url = models.URLField(max_length=600)
    public_id = models.CharField(max_length=255, blank=True)  # Cloudinary id
    caption = models.CharField(max_length=200, blank=True)

    status = models.CharField(
        max_length=10, choices=Status.choices, default=Status.PENDING, db_index=True
    )
    review_note = models.CharField(max_length=300, blank=True)  # shown to artisan on reject
    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="reviewed_artisan_videos",
    )
    reviewed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [models.Index(fields=["artisan", "status"])]

    def __str__(self):
        return f"{self.artisan.business_name} video [{self.status}]"


# ---------------------------------------------------------------------------
# API — the artisan manages their own videos; approval is admin-only.
# ---------------------------------------------------------------------------
class ArtisanWorkVideoSerializer(serializers.ModelSerializer):
    class Meta:
        model = ArtisanWorkVideo
        fields = [
            "id",
            "video_url",
            "public_id",
            "caption",
            "status",
            "review_note",
            "created_at",
        ]
        # Approval state is never client-settable.
        read_only_fields = ["id", "status", "review_note", "created_at"]


class ArtisanWorkVideoViewSet(
    mixins.ListModelMixin,
    mixins.CreateModelMixin,
    mixins.DestroyModelMixin,
    viewsets.GenericViewSet,
):
    serializer_class = ArtisanWorkVideoSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = None

    def _artisan(self):
        return ArtisanProfile.objects.filter(user=self.request.user).first()

    def get_queryset(self):
        artisan = self._artisan()
        if not artisan:
            return ArtisanWorkVideo.objects.none()
        return ArtisanWorkVideo.objects.filter(artisan=artisan)

    def perform_create(self, serializer):
        artisan = self._artisan()
        if not artisan:
            raise ValidationError("Create your artisan profile before adding videos.")
        # Always saved as PENDING — the serializer can't set status.
        serializer.save(artisan=artisan, status=ArtisanWorkVideo.Status.PENDING)


router = DefaultRouter()
router.register(r"artisans/work-videos", ArtisanWorkVideoViewSet, basename="artisan-work-video")
urlpatterns = router.urls


# ---------------------------------------------------------------------------
# Admin moderation
# ---------------------------------------------------------------------------
@admin.register(ArtisanWorkVideo)
class ArtisanWorkVideoAdmin(admin.ModelAdmin):
    list_display = ("artisan", "status", "caption", "created_at", "reviewed_at")
    list_filter = ("status",)
    search_fields = ("artisan__business_name", "caption")
    readonly_fields = ("video_url", "public_id", "created_at", "reviewed_by", "reviewed_at")
    ordering = ("status", "-created_at")
    actions = ("approve_selected", "reject_selected")

    @admin.action(description="Approve selected videos")
    def approve_selected(self, request, queryset):
        n = queryset.update(
            status=ArtisanWorkVideo.Status.APPROVED,
            review_note="",
            reviewed_by=request.user,
            reviewed_at=timezone.now(),
        )
        self.message_user(request, f"{n} video(s) approved.")

    @admin.action(description="Reject selected videos")
    def reject_selected(self, request, queryset):
        n = queryset.update(
            status=ArtisanWorkVideo.Status.REJECTED,
            reviewed_by=request.user,
            reviewed_at=timezone.now(),
        )
        self.message_user(request, f"{n} video(s) rejected.")

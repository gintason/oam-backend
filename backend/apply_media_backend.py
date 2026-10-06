#!/usr/bin/env python
"""
Marketplace + artisan videos, backend side.

Run from the backend root (the folder with manage.py):
    python3 apply_media_backend.py

  apps/homeservices/serializers.py   artisan profile now returns its work videos
                                     (`work_videos`) so other users can watch them
  apps/homeservices/work_videos.py   new videos go live straight away (an admin can
                                     still Reject one in Django admin to hide it);
                                     only videos uploaded to OUR Cloudinary account
                                     are accepted. Set ARTISAN_VIDEOS_AUTO_APPROVE=false
                                     to go back to "admin approves first".
  apps/marketplace/serializers.py    listing cards say whether a listing has a video
  apps/marketplace/views.py,
  apps/marketplace/public_listings.py   load videos with the listing (no extra queries)

No migration needed. Backups: *.bak-media.
"""
import shutil
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
changed, skipped, problems = [], [], []


def patch(rel, marker, reps, replace_all=False):
    p = ROOT / rel
    if not p.exists():
        problems.append(f"{rel}: not found")
        return
    t = p.read_text(encoding="utf-8")
    if marker in t:
        skipped.append(rel)
        return
    for old, new in reps:
        if old not in t:
            problems.append(f"{rel}: couldn't find {old.strip()[:70]!r} — send me the file")
            return
        t = t.replace(old, new) if replace_all else t.replace(old, new, 1)
    bak = p.with_name(p.name + ".bak-media")
    if not bak.exists():
        shutil.copy2(p, bak)
    p.write_text(t, encoding="utf-8")
    changed.append(rel)


if not (ROOT / "manage.py").exists():
    print("Run this from the backend root (the folder containing manage.py).")
    sys.exit(1)

# --- artisan profile: public work videos -----------------------------------
patch("apps/homeservices/serializers.py", "def get_work_videos", [
    ('''class ArtisanDetailSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source="category.name", read_only=True)
    is_featured = serializers.BooleanField(source="is_currently_featured", read_only=True)
    distance_km = serializers.FloatField(read_only=True, required=False)
''',
     '''class ArtisanDetailSerializer(serializers.ModelSerializer):
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
'''),
    ('''"is_verified", "is_featured", "distance_km", "views_count", "created_at")


class ArtisanOwnerSerializer''',
     '''"is_verified", "is_featured", "distance_km", "views_count", "created_at", "work_videos")


class ArtisanOwnerSerializer'''),
])

# --- artisan uploads: live straight away, our Cloudinary only ---------------
patch("apps/homeservices/work_videos.py", "ARTISAN_VIDEOS_AUTO_APPROVE", [
    ('''        # Approval state is never client-settable.
        read_only_fields = ["id", "status", "review_note", "created_at"]
''',
     '''        # Approval state is never client-settable.
        read_only_fields = ["id", "status", "review_note", "created_at"]

    def validate_video_url(self, url):
        # Other users play these, so only accept videos stored in our own Cloudinary.
        cloud = getattr(settings, "CLOUDINARY_CLOUD_NAME", "")
        if cloud and not url.startswith(f"https://res.cloudinary.com/{cloud}/video/"):
            raise ValidationError("Upload the video through the app.")
        return url
'''),
    ('''        # Always saved as PENDING — the serializer can't set status.
        serializer.save(artisan=artisan, status=ArtisanWorkVideo.Status.PENDING)''',
     '''        if artisan.work_videos.count() >= 12:
            raise ValidationError("You can have up to 12 videos. Delete one to add another.")
        # Live straight away by default (an admin can still Reject it to hide it).
        # ARTISAN_VIDEOS_AUTO_APPROVE=false → admin approves first. Never client-settable.
        live = getattr(settings, "ARTISAN_VIDEOS_AUTO_APPROVE", True)
        serializer.save(
            artisan=artisan,
            status=ArtisanWorkVideo.Status.APPROVED if live else ArtisanWorkVideo.Status.PENDING,
            reviewed_at=timezone.now() if live else None,
        )'''),
])

# settings flag (env-driven, default on)
patch("config/settings/base.py", "ARTISAN_VIDEOS_AUTO_APPROVE", [
    ('CLOUDINARY_CLOUD_NAME = env("CLOUDINARY_CLOUD_NAME", default="")',
     'CLOUDINARY_CLOUD_NAME = env("CLOUDINARY_CLOUD_NAME", default="")\n'
     '# Artisan work videos go live on upload (admins can still reject them).\n'
     'ARTISAN_VIDEOS_AUTO_APPROVE = env.bool("ARTISAN_VIDEOS_AUTO_APPROVE", default=True)'),
])

# --- marketplace cards: has_video ------------------------------------------
patch("apps/marketplace/serializers.py", "get_has_video", [
    ('''class ListingListSerializer(_SocialFieldsMixin, serializers.ModelSerializer):
    category_name = serializers.CharField(source="category.name", read_only=True)
    primary_image = serializers.SerializerMethodField()
''',
     '''class ListingListSerializer(_SocialFieldsMixin, serializers.ModelSerializer):
    category_name = serializers.CharField(source="category.name", read_only=True)
    primary_image = serializers.SerializerMethodField()
    has_video = serializers.SerializerMethodField()
'''),
    ('''                  "primary_image", "views_count", "likes_count", "comments_count",
                  "liked", "created_at")
''',
     '''                  "primary_image", "views_count", "likes_count", "comments_count",
                  "liked", "created_at", "has_video")

    def get_has_video(self, obj):
        return len(obj.videos.all()) > 0
'''),
])
for rel in ("apps/marketplace/views.py", "apps/marketplace/public_listings.py"):
    patch(rel, '.prefetch_related("images", "videos")',
          [('.prefetch_related("images")', '.prefetch_related("images", "videos")')], replace_all=True)

print("Changed: " + (", ".join(changed) or "nothing"))
if skipped:
    print("Already done: " + ", ".join(skipped))
if problems:
    print("\nNEEDS ATTENTION:\n  - " + "\n  - ".join(problems))
    sys.exit(2)
print("\nNo migration needed. Commit, push, and Render deploys it.")

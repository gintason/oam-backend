"""
What each upload is for, and the limits that apply to it.

Kept in one place so the rules can't drift between the signature endpoint, the
verification checks and the frontend. The client is told these numbers so it can
reject a file before a slow upload starts, but the numbers are ENFORCED here,
against what Cloudinary reports the file actually is.
"""
from __future__ import annotations

from dataclasses import dataclass, field

MB = 1024 * 1024


@dataclass(frozen=True)
class Purpose:
    key: str
    folder: str
    resource_type: str          # cloudinary: image | video | raw
    delivery_type: str          # upload (public) | authenticated (private)
    max_bytes: int
    allowed_formats: list[str]
    label: str
    hint: str = ""
    min_width: int = 0
    min_height: int = 0
    min_duration: float = 0     # seconds, video only
    max_duration: float = 0     # seconds, 0 = no limit


PURPOSES: dict[str, Purpose] = {
    "artisan_service_image": Purpose(
        key="artisan_service_image",
        folder="oam/artisans/service",
        resource_type="image",
        delivery_type="upload",
        max_bytes=8 * MB,
        allowed_formats=["jpg", "jpeg", "png", "webp", "heic"],
        label="Photo of your work",
        hint="A clear photo of work you've completed.",
        min_width=400,
        min_height=400,
    ),
    "artisan_work_video": Purpose(
        key="artisan_work_video",
        folder="oam/artisans/video",
        resource_type="video",
        delivery_type="upload",
        max_bytes=100 * MB,
        allowed_formats=["mp4", "mov", "webm", "m4v", "3gp"],
        label="Video of previous work",
        hint="10 seconds to 3 minutes showing work you've done.",
        min_duration=10,
        max_duration=180,
    ),
    # Identity document: private delivery, so the URL alone won't open it.
    "artisan_id_document": Purpose(
        key="artisan_id_document",
        folder="oam/artisans/identity",
        resource_type="image",
        delivery_type="authenticated",
        max_bytes=10 * MB,
        allowed_formats=["jpg", "jpeg", "png", "webp", "heic", "pdf"],
        label="Identity document",
        hint="A clear photo of your government-issued ID.",
        min_width=500,
        min_height=300,
    ),
    "artisan_profile_photo": Purpose(
        key="artisan_profile_photo",
        folder="oam/artisans/profile",
        resource_type="image",
        delivery_type="upload",
        max_bytes=5 * MB,
        allowed_formats=["jpg", "jpeg", "png", "webp", "heic"],
        label="Profile photo",
        min_width=200,
        min_height=200,
    ),
    "listing_image": Purpose(
        key="listing_image",
        folder="oam/listings",
        resource_type="image",
        delivery_type="upload",
        max_bytes=8 * MB,
        allowed_formats=["jpg", "jpeg", "png", "webp", "heic"],
        label="Item photo",
        min_width=300,
        min_height=300,
    ),
    # Admin-only, for the official O.A.M Motors inventory.
    "oam_motors_image": Purpose(
        key="oam_motors_image",
        folder="oam/motors",
        resource_type="image",
        delivery_type="upload",
        max_bytes=12 * MB,
        allowed_formats=["jpg", "jpeg", "png", "webp"],
        label="Vehicle photo",
        min_width=800,
        min_height=600,
    ),
}

ADMIN_ONLY = {"oam_motors_image"}

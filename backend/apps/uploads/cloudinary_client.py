"""
Cloudinary signing and verification.

WHY DIRECT-TO-CLOUDINARY
  The browser uploads straight to Cloudinary using a signature we generate. A
  30-second work video routed through Django would sit in a request for as long
  as the upload takes, and Render terminates long requests — so proxying would
  fail exactly on the files that matter most.

WHY WE STILL VERIFY SERVER-SIDE
  A signed upload proves the FILE reached Cloudinary. It does not prove that the
  public_id the browser then reports to us is the same file, or is a file at
  all. Anyone can POST a made-up URL to our API.

  So when the client reports an upload, we ask Cloudinary's Admin API what that
  asset actually is — format, bytes, dimensions, duration — and run our checks
  against THAT. The client's word is never trusted for anything we act on.
"""
from __future__ import annotations

import hashlib
import time
from dataclasses import dataclass
from typing import Any

import requests
from django.conf import settings

API_BASE = "https://api.cloudinary.com/v1_1"


class UploadConfigError(RuntimeError):
    """Cloudinary credentials are missing or wrong."""


def _config() -> tuple[str, str, str]:
    cloud = getattr(settings, "CLOUDINARY_CLOUD_NAME", "") or ""
    key = getattr(settings, "CLOUDINARY_API_KEY", "") or ""
    secret = getattr(settings, "CLOUDINARY_API_SECRET", "") or ""
    if not (cloud and key and secret):
        raise UploadConfigError(
            "Cloudinary is not configured. Set CLOUDINARY_CLOUD_NAME, "
            "CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET."
        )
    return cloud, key, secret


def _sign(params: dict[str, Any], secret: str) -> str:
    """Cloudinary signs the sorted, &-joined params with the API secret appended."""
    items = sorted((k, v) for k, v in params.items() if v not in (None, ""))
    payload = "&".join(f"{k}={v}" for k, v in items)
    return hashlib.sha1(f"{payload}{secret}".encode()).hexdigest()


@dataclass
class UploadTicket:
    cloud_name: str
    api_key: str
    timestamp: int
    signature: str
    folder: str
    resource_type: str
    delivery_type: str
    upload_url: str
    max_bytes: int
    allowed_formats: list[str]


def build_ticket(*, folder: str, resource_type: str, delivery_type: str,
                 max_bytes: int, allowed_formats: list[str]) -> UploadTicket:
    """
    A one-shot, time-limited permission to upload into one folder.

    The signature covers the folder and delivery type, so a ticket issued for
    service images cannot be reused to write somewhere else — the client can
    choose the file, never the destination.
    """
    cloud, key, secret = _config()
    timestamp = int(time.time())

    signed = {"timestamp": timestamp, "folder": folder}
    if delivery_type != "upload":
        signed["type"] = delivery_type

    return UploadTicket(
        cloud_name=cloud,
        api_key=key,
        timestamp=timestamp,
        signature=_sign(signed, secret),
        folder=folder,
        resource_type=resource_type,
        delivery_type=delivery_type,
        upload_url=f"{API_BASE}/{cloud}/{resource_type}/upload",
        max_bytes=max_bytes,
        allowed_formats=allowed_formats,
    )


def fetch_asset(public_id: str, *, resource_type: str = "image",
                delivery_type: str = "upload") -> dict[str, Any] | None:
    """
    Ask Cloudinary what an asset really is. Returns None if it doesn't exist.

    This is the only source of truth about a file. Everything the browser tells
    us about size, format or duration is treated as a claim, not a fact.
    """
    cloud, key, secret = _config()
    url = f"{API_BASE}/{cloud}/resources/{resource_type}/{delivery_type}/{public_id}"
    try:
        response = requests.get(url, auth=(key, secret), timeout=15)
    except requests.RequestException:
        return None
    if response.status_code != 200:
        return None
    try:
        return response.json()
    except ValueError:
        return None


def signed_delivery_url(public_id: str, *, resource_type: str = "image",
                        delivery_type: str = "authenticated",
                        fmt: str = "jpg", ttl_seconds: int = 300) -> str:
    """
    A short-lived URL for a private asset — used for NIN slips in the admin
    review queue.

    Identity documents are uploaded with authenticated delivery, so possessing
    the public_id isn't enough to view one. The link expires, which means a
    reviewer's browser history or a shared screenshot doesn't become a permanent
    door into someone's ID.
    """
    cloud, key, secret = _config()
    expires = int(time.time()) + ttl_seconds
    to_sign = f"exp={expires}~acl=/{resource_type}/{delivery_type}/{public_id}"
    signature = hashlib.sha256(f"{to_sign}{secret}".encode()).hexdigest()
    return (
        f"https://res.cloudinary.com/{cloud}/{resource_type}/{delivery_type}/"
        f"s--{signature[:16]}--/{public_id}.{fmt}?_a={expires}"
    )

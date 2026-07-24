"""
Automated checks on an uploaded asset.

WHAT THESE CAN AND CANNOT DO — worth being clear, because the distinction
decides what the "Verified" badge is allowed to mean.

  CAN: confirm a file exists at Cloudinary, is the format we asked for, is
       within size limits, is large enough to be legible, and — for video — is
       long enough to show real work rather than a two-second pan.

  CANNOT: tell whether an ID document is genuine, whether it belongs to the
       person who uploaded it, or whether the "previous work" is theirs. A photo
       of someone else's ID taken off a screen passes every check below.

So passing these means "the submission is complete and usable", not "this person
is who they say they are". That's why passing moves an artisan to review rather
than granting the badge.
"""
from __future__ import annotations

from dataclasses import dataclass

from .cloudinary_client import fetch_asset
from .purposes import PURPOSES, Purpose


@dataclass
class CheckResult:
    ok: bool
    reasons: list[str]
    facts: dict          # what Cloudinary reported, stored for the reviewer

    def as_dict(self) -> dict:
        return {"ok": self.ok, "reasons": self.reasons, "facts": self.facts}


def _human_mb(n: int) -> str:
    return f"{n / (1024 * 1024):.0f}MB"


def check_asset(public_id: str, purpose_key: str) -> CheckResult:
    """Verify one uploaded asset against its purpose's rules."""
    purpose: Purpose | None = PURPOSES.get(purpose_key)
    if purpose is None:
        return CheckResult(False, ["Unknown upload type."], {})

    asset = fetch_asset(
        public_id,
        resource_type=purpose.resource_type,
        delivery_type=purpose.delivery_type,
    )
    if asset is None:
        # Either it was never uploaded, or someone posted an invented id.
        return CheckResult(False, ["We couldn't find that file. Please upload it again."], {})

    facts = {
        "format": asset.get("format"),
        "bytes": asset.get("bytes"),
        "width": asset.get("width"),
        "height": asset.get("height"),
        "duration": asset.get("duration"),
        "created_at": asset.get("created_at"),
    }
    reasons: list[str] = []

    fmt = (asset.get("format") or "").lower()
    if fmt and fmt not in purpose.allowed_formats:
        reasons.append(
            f"{purpose.label} must be one of: {', '.join(purpose.allowed_formats)}."
        )

    size = asset.get("bytes") or 0
    if size > purpose.max_bytes:
        reasons.append(f"{purpose.label} is too large (limit {_human_mb(purpose.max_bytes)}).")
    if size < 8 * 1024:
        reasons.append(f"{purpose.label} looks empty or corrupted.")

    width, height = asset.get("width") or 0, asset.get("height") or 0
    if purpose.min_width and width and width < purpose.min_width:
        reasons.append(
            f"{purpose.label} is too small to read clearly "
            f"(needs at least {purpose.min_width}x{purpose.min_height} pixels)."
        )
    elif purpose.min_height and height and height < purpose.min_height:
        reasons.append(
            f"{purpose.label} is too small to read clearly "
            f"(needs at least {purpose.min_width}x{purpose.min_height} pixels)."
        )

    duration = asset.get("duration")
    if purpose.resource_type == "video" and duration is not None:
        if purpose.min_duration and duration < purpose.min_duration:
            reasons.append(
                f"Video is too short — at least {int(purpose.min_duration)} seconds, "
                "so customers can actually see the work."
            )
        if purpose.max_duration and duration > purpose.max_duration:
            reasons.append(
                f"Video is too long — keep it under {int(purpose.max_duration / 60)} minutes."
            )

    return CheckResult(ok=not reasons, reasons=reasons, facts=facts)

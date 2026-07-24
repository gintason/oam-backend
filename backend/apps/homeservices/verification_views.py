"""Verification endpoints — artisan submits, admin decides."""
from __future__ import annotations

from django.db import transaction
from django.utils import timezone
from rest_framework import serializers
from rest_framework import status as http
from rest_framework.permissions import IsAdminUser, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.common.permissions import IsVerified
from apps.uploads.checks import check_asset
from apps.uploads.cloudinary_client import signed_delivery_url

from .models import ArtisanProfile
from .verification import (
    MAX_SERVICE_IMAGES,
    MIN_SERVICE_IMAGES,
    ArtisanServiceImage,
    ArtisanVerification,
)


# --------------------------------------------------------------------------- #
# Serializers
# --------------------------------------------------------------------------- #

class ServiceImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ArtisanServiceImage
        fields = ["id", "url", "caption", "order", "created_at"]
        read_only_fields = fields


class VerificationSerializer(serializers.ModelSerializer):
    """
    The artisan's own view. Note what's absent: id_document_id never leaves the
    server. The artisan knows whether they uploaded one; they don't need the
    reference, and neither does anything in the browser.
    """

    service_images = ServiceImageSerializer(source="artisan.service_images", many=True, read_only=True)
    has_id_document = serializers.SerializerMethodField()
    has_work_video = serializers.SerializerMethodField()
    requirements = serializers.SerializerMethodField()

    class Meta:
        model = ArtisanVerification
        fields = [
            "id", "status", "checks_report", "checks_passed_at",
            "submitted_at", "reviewed_at", "decision_note",
            "service_images", "has_id_document", "has_work_video", "requirements",
        ]
        read_only_fields = fields

    def get_has_id_document(self, obj):
        return bool(obj.id_document_id)

    def get_has_work_video(self, obj):
        return bool(obj.work_video_id)

    def get_requirements(self, obj):
        count = obj.service_image_count
        return {
            "service_images": {
                "have": count, "need": MIN_SERVICE_IMAGES, "max": MAX_SERVICE_IMAGES,
                "done": count >= MIN_SERVICE_IMAGES,
            },
            "work_video": {"done": bool(obj.work_video_id)},
            "id_document": {"done": bool(obj.id_document_id)},
        }


# --------------------------------------------------------------------------- #
# Artisan-facing
# --------------------------------------------------------------------------- #

def _profile_or_none(user):
    return ArtisanProfile.objects.filter(user=user).first()


def _verification_for(profile) -> ArtisanVerification:
    obj, _ = ArtisanVerification.objects.get_or_create(artisan=profile)
    return obj


class MyVerificationView(APIView):
    """GET /artisans/verification/ — progress and what's still missing."""

    permission_classes = [IsAuthenticated, IsVerified]

    def get(self, request):
        profile = _profile_or_none(request.user)
        if profile is None:
            return Response(
                {"detail": "Create your artisan profile first."},
                status=http.HTTP_404_NOT_FOUND,
            )
        return Response(VerificationSerializer(_verification_for(profile)).data)


class AttachDocumentView(APIView):
    """
    POST /artisans/verification/attach/
        {"purpose": "artisan_work_video" | "artisan_id_document"
                    | "artisan_service_image",
         "public_id": "...", "url": "...", "caption": "..."}

    Called after the browser has uploaded to Cloudinary. We re-read the asset
    from Cloudinary and check it there — what the client claims about the file
    is never taken at face value.
    """

    permission_classes = [IsAuthenticated, IsVerified]

    ALLOWED = {"artisan_work_video", "artisan_id_document", "artisan_service_image"}

    def post(self, request):
        profile = _profile_or_none(request.user)
        if profile is None:
            return Response({"detail": "Create your artisan profile first."},
                            status=http.HTTP_404_NOT_FOUND)

        purpose = (request.data.get("purpose") or "").strip()
        public_id = (request.data.get("public_id") or "").strip()
        if purpose not in self.ALLOWED:
            return Response({"detail": "Unknown document type."},
                            status=http.HTTP_400_BAD_REQUEST)
        if not public_id:
            return Response({"detail": "Missing file reference."},
                            status=http.HTTP_400_BAD_REQUEST)

        result = check_asset(public_id, purpose)
        if not result.ok:
            return Response(
                {"detail": result.reasons[0], "reasons": result.reasons},
                status=http.HTTP_400_BAD_REQUEST,
            )

        verification = _verification_for(profile)

        if purpose == "artisan_service_image":
            if profile.service_images.count() >= MAX_SERVICE_IMAGES:
                return Response(
                    {"detail": f"You can show up to {MAX_SERVICE_IMAGES} photos."},
                    status=http.HTTP_400_BAD_REQUEST,
                )
            url = (request.data.get("url") or "").strip()
            if not url:
                return Response({"detail": "Missing image URL."},
                                status=http.HTTP_400_BAD_REQUEST)
            image = ArtisanServiceImage.objects.create(
                artisan=profile,
                public_id=public_id,
                url=url,
                caption=(request.data.get("caption") or "")[:140],
                order=profile.service_images.count(),
            )
            payload = ServiceImageSerializer(image).data
        else:
            field = "work_video_id" if purpose == "artisan_work_video" else "id_document_id"
            setattr(verification, field, public_id)
            payload = None

        # Re-attaching after a rejection puts them back in the queue rather than
        # leaving them stuck on a decision they've already acted on.
        if verification.status in (ArtisanVerification.Status.REJECTED,
                                   ArtisanVerification.Status.INCOMPLETE):
            verification.status = ArtisanVerification.Status.DRAFT

        report = dict(verification.checks_report or {})
        report[purpose] = result.as_dict()
        verification.checks_report = report
        verification.save()

        return Response(
            {"document": payload, "verification": VerificationSerializer(verification).data},
            status=http.HTTP_201_CREATED,
        )


class RemoveServiceImageView(APIView):
    """DELETE /artisans/verification/images/<id>/"""

    permission_classes = [IsAuthenticated, IsVerified]

    def delete(self, request, image_id):
        profile = _profile_or_none(request.user)
        if profile is None:
            return Response({"detail": "Not found."}, status=http.HTTP_404_NOT_FOUND)
        deleted, _ = ArtisanServiceImage.objects.filter(
            id=image_id, artisan=profile
        ).delete()
        if not deleted:
            return Response({"detail": "Not found."}, status=http.HTTP_404_NOT_FOUND)
        return Response(status=http.HTTP_204_NO_CONTENT)


class SubmitVerificationView(APIView):
    """
    POST /artisans/verification/submit/

    Runs every check again, then either explains what's missing or puts the
    artisan in the review queue. Re-checking at submission matters: a file can
    be deleted at Cloudinary after it was attached, and we'd rather find that
    here than when a reviewer opens a broken link.
    """

    permission_classes = [IsAuthenticated, IsVerified]

    @transaction.atomic
    def post(self, request):
        profile = _profile_or_none(request.user)
        if profile is None:
            return Response({"detail": "Create your artisan profile first."},
                            status=http.HTTP_404_NOT_FOUND)

        verification = _verification_for(profile)
        if verification.status == ArtisanVerification.Status.APPROVED:
            return Response(VerificationSerializer(verification).data)

        missing: list[str] = []
        report: dict = {}

        count = profile.service_images.count()
        if count < MIN_SERVICE_IMAGES:
            missing.append(
                f"Add at least {MIN_SERVICE_IMAGES} photos of your work "
                f"(you have {count})."
            )
        else:
            for image in profile.service_images.all()[:MIN_SERVICE_IMAGES]:
                result = check_asset(image.public_id, "artisan_service_image")
                report[f"service_image:{image.id}"] = result.as_dict()
                if not result.ok:
                    missing.extend(result.reasons)

        if not verification.work_video_id:
            missing.append("Add a short video of your previous work.")
        else:
            result = check_asset(verification.work_video_id, "artisan_work_video")
            report["artisan_work_video"] = result.as_dict()
            if not result.ok:
                missing.extend(result.reasons)

        if not verification.id_document_id:
            missing.append("Add your identity document.")
        else:
            result = check_asset(verification.id_document_id, "artisan_id_document")
            report["artisan_id_document"] = result.as_dict()
            if not result.ok:
                missing.extend(result.reasons)

        verification.checks_report = report

        if missing:
            verification.status = ArtisanVerification.Status.INCOMPLETE
            verification.checks_passed_at = None
            verification.save()
            return Response(
                {"detail": "Some things still need attention.",
                 "missing": missing,
                 "verification": VerificationSerializer(verification).data},
                status=http.HTTP_400_BAD_REQUEST,
            )

        verification.status = ArtisanVerification.Status.PENDING
        verification.checks_passed_at = timezone.now()
        verification.submitted_at = timezone.now()
        verification.save()

        return Response({
            "detail": "Submitted for review. Your profile is live in search in the "
                      "meantime — the Verified badge follows once we've checked "
                      "your documents.",
            "verification": VerificationSerializer(verification).data,
        })


# --------------------------------------------------------------------------- #
# Admin-facing
# --------------------------------------------------------------------------- #

class ReviewQueueView(APIView):
    """GET /artisans/verification/queue/ — everything awaiting a decision."""

    permission_classes = [IsAdminUser]

    def get(self, request):
        status_filter = request.query_params.get("status", "pending")
        qs = ArtisanVerification.objects.select_related("artisan", "artisan__category")
        if status_filter != "all":
            qs = qs.filter(status=status_filter)

        rows = []
        for v in qs[:100]:
            rows.append({
                "id": str(v.id),
                "status": v.status,
                "submitted_at": v.submitted_at,
                "artisan": {
                    "id": str(v.artisan_id),
                    "business_name": v.artisan.business_name,
                    "category": getattr(v.artisan.category, "name", ""),
                    "city": v.artisan.city,
                    "state": v.artisan.state,
                    "phone": v.artisan.phone,
                    "years_experience": v.artisan.years_experience,
                    "is_verified": v.artisan.is_verified,
                },
                "service_images": [
                    {"id": str(i.id), "url": i.url, "caption": i.caption}
                    for i in v.artisan.service_images.all()
                ],
                "checks_report": v.checks_report,
            })
        return Response({"count": len(rows), "results": rows})


class ReviewDetailView(APIView):
    """
    GET /artisans/verification/queue/<id>/

    Includes short-lived signed links for the video and identity document. They
    expire in five minutes, so a reviewer's browser history or a shared
    screenshot doesn't become a permanent door into someone's ID.
    """

    permission_classes = [IsAdminUser]

    def get(self, request, verification_id):
        v = ArtisanVerification.objects.select_related("artisan").filter(
            id=verification_id
        ).first()
        if v is None:
            return Response({"detail": "Not found."}, status=http.HTTP_404_NOT_FOUND)

        video_url = id_url = None
        if v.work_video_id:
            video_url = signed_delivery_url(
                v.work_video_id, resource_type="video",
                delivery_type="upload", fmt="mp4", ttl_seconds=300,
            )
        if v.id_document_id:
            id_url = signed_delivery_url(
                v.id_document_id, resource_type="image",
                delivery_type="authenticated", fmt="jpg", ttl_seconds=300,
            )

        return Response({
            "id": str(v.id),
            "status": v.status,
            "submitted_at": v.submitted_at,
            "checks_report": v.checks_report,
            "decision_note": v.decision_note,
            "artisan": {
                "id": str(v.artisan_id),
                "business_name": v.artisan.business_name,
                "description": v.artisan.description,
                "category": getattr(v.artisan.category, "name", ""),
                "phone": v.artisan.phone,
                "whatsapp": v.artisan.whatsapp,
                "address": v.artisan.address,
                "city": v.artisan.city,
                "state": v.artisan.state,
                "years_experience": v.artisan.years_experience,
                "is_verified": v.artisan.is_verified,
            },
            "service_images": [
                {"id": str(i.id), "url": i.url, "caption": i.caption}
                for i in v.artisan.service_images.all()
            ],
            "work_video_url": video_url,
            "id_document_url": id_url,
            "links_expire_in": 300,
        })


class ReviewDecisionView(APIView):
    """
    POST /artisans/verification/queue/<id>/<decision>/   approve | reject
        {"note": "..."}
    """

    permission_classes = [IsAdminUser]

    @transaction.atomic
    def post(self, request, verification_id, decision):
        if decision not in ("approve", "reject"):
            return Response({"detail": "Unknown decision."},
                            status=http.HTTP_400_BAD_REQUEST)

        v = ArtisanVerification.objects.select_related("artisan").filter(
            id=verification_id
        ).first()
        if v is None:
            return Response({"detail": "Not found."}, status=http.HTTP_404_NOT_FOUND)

        note = (request.data.get("note") or "").strip()
        if decision == "reject" and not note:
            # A rejection with no reason just produces a support email asking why.
            return Response(
                {"detail": "Give a reason — the artisan sees this and needs to know "
                           "what to fix."},
                status=http.HTTP_400_BAD_REQUEST,
            )

        v.status = (ArtisanVerification.Status.APPROVED if decision == "approve"
                    else ArtisanVerification.Status.REJECTED)
        v.reviewed_at = timezone.now()
        v.reviewed_by = request.user
        v.decision_note = note
        v.save()

        profile = v.artisan
        profile.is_verified = decision == "approve"
        profile.save(update_fields=["is_verified", "updated_at"])

        return Response(VerificationSerializer(v).data)

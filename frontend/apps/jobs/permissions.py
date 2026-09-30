"""
Permission classes for the jobs API.

Plan-tier limits are *business* rules and raise JobsError (HTTP 402 with a
`code` the clients use to open the upgrade sheet). These classes only answer
"is this person allowed to touch this object at all?".
"""
from __future__ import annotations

from rest_framework.permissions import SAFE_METHODS, BasePermission

from .plans import get_plan


class IsEmployer(BasePermission):
    message = "Create your company profile first."

    def has_permission(self, request, view):
        user = request.user
        return bool(user and user.is_authenticated
                    and getattr(user, "employer_profile", None) is not None
                    and user.employer_profile.is_active)


class IsJobOwnerOrReadOnly(BasePermission):
    """Anyone may read a live listing; only the owning employer may change it."""

    def has_object_permission(self, request, view, obj):
        if request.method in SAFE_METHODS:
            return True
        return bool(request.user.is_authenticated and obj.employer.owner_id == request.user.id)


class IsJobOwner(BasePermission):
    def has_object_permission(self, request, view, obj):
        job = getattr(obj, "job", obj)
        return bool(request.user.is_authenticated and job.employer.owner_id == request.user.id)


class IsApplicationParticipant(BasePermission):
    """The applicant or the employer who owns the job."""

    def has_object_permission(self, request, view, obj):
        uid = request.user.id
        return uid in (obj.candidate.user_id, obj.job.employer.owner_id)


class IsThreadParticipant(BasePermission):
    def has_object_permission(self, request, view, obj):
        return obj.is_participant(request.user)


class HasPlanFeature(BasePermission):
    """
    Gate a whole view on a plan feature:

        permission_classes = [IsAuthenticated, IsEmployer, HasPlanFeature.for_("analytics")]
    """
    feature = ""
    message = "Upgrade your plan to use this feature."

    def has_permission(self, request, view):
        employer = getattr(request.user, "employer_profile", None)
        if employer is None:
            return False
        sub = getattr(employer, "subscription", None)
        plan = get_plan(sub.active_plan if sub else None)
        return bool(getattr(plan, self.feature, False))

    @classmethod
    def for_(cls, feature: str, message: str | None = None):
        return type(f"HasPlanFeature_{feature}", (cls,),
                    {"feature": feature, "message": message or cls.message})

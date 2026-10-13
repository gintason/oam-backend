"""
Admin action: close & anonymise user accounts.

Django's built-in "Delete selected users" can't remove anyone with money
history: wallets, ledger accounts, payments and transfers are PROTECTed so the
books always balance (and a money app must keep these records by law). This
action does what the app's own "Delete account" does instead: the person can
never sign in again, their personal details are erased and their listings,
profiles and jobs are taken down, while the financial records stay, anonymised.
"""
from django.contrib import admin, messages
from django.template.response import TemplateResponse

from .deletion import delete_account, deletion_blockers
from .models import User


def _is_closed(user) -> bool:
    return not user.is_active and (user.email or "").endswith("@deleted.invalid")


def _skip_reason(request, user) -> str | None:
    if user.pk == request.user.pk:
        return "that's your own account"
    if user.is_superuser:
        return "superuser accounts can't be closed here"
    if _is_closed(user):
        return "already closed"
    reasons = deletion_blockers(user)
    return " ".join(reasons) if reasons else None


@admin.action(description="Close & anonymise selected accounts (keeps financial records)",
              permissions=["change"])
def close_and_anonymise(modeladmin, request, queryset):
    users = list(queryset)
    rows = [(u, _skip_reason(request, u)) for u in users]

    if request.POST.get("confirm") != "yes":
        return TemplateResponse(request, "admin/accounts/close_confirm.html", {
            **modeladmin.admin_site.each_context(request),
            "title": "Close & anonymise accounts",
            "opts": modeladmin.model._meta,
            "rows": rows,
            "closable": [u for u, r in rows if r is None],
            "action_checkbox_name": admin.helpers.ACTION_CHECKBOX_NAME,
        })

    closed = 0
    for user, reason in rows:
        if reason is not None:
            modeladmin.message_user(request, f"Skipped {user.identifier}: {reason}", messages.WARNING)
            continue
        label = user.identifier
        delete_account(user)
        modeladmin.log_change(request, user, "Closed & anonymised from admin")
        closed += 1
        modeladmin.message_user(request, f"Closed {label}", messages.SUCCESS)
    if not closed:
        modeladmin.message_user(request, "No accounts were closed.", messages.INFO)
    return None


_user_admin = admin.site._registry.get(User)
if _user_admin is not None:
    _user_admin.actions = [*(_user_admin.actions or []), close_and_anonymise]

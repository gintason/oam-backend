"""Admin registration for accounts models."""
from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.utils.translation import gettext_lazy as _

from .models import OTPCode, SocialAccount, User


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    ordering = ("-created_at",)
    list_display = ("identifier", "first_name", "last_name",
                    "is_verified", "auth_provider", "is_staff")
    list_filter = ("is_verified", "auth_provider", "is_staff", "is_active")
    search_fields = ("email", "phone", "first_name", "last_name")
    readonly_fields = ("id", "date_joined", "created_at", "updated_at", "last_login")
    fieldsets = (
        (None, {"fields": ("id", "email", "phone", "password")}),
        (_("Personal"), {"fields": ("first_name", "last_name", "preferred_language")}),
        (_("Status"), {"fields": ("is_verified", "auth_provider", "is_active")}),
        (_("Permissions"), {"fields": ("is_staff", "is_superuser", "groups", "user_permissions")}),
        (_("Dates"), {"fields": ("last_login", "date_joined", "created_at", "updated_at")}),
    )
    add_fieldsets = (
        (None, {"classes": ("wide",), "fields": ("email", "phone", "password1", "password2")}),
    )


@admin.register(SocialAccount)
class SocialAccountAdmin(admin.ModelAdmin):
    list_display = ("provider", "email", "user", "provider_user_id", "created_at")
    list_filter = ("provider",)
    search_fields = ("email", "provider_user_id")


@admin.register(OTPCode)
class OTPCodeAdmin(admin.ModelAdmin):
    list_display = ("purpose", "channel", "destination", "is_used", "attempts", "created_at")
    list_filter = ("purpose", "channel", "is_used")
    search_fields = ("destination",)

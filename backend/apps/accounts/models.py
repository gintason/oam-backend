"""
Custom User model, OTP codes, and linked social accounts for the OAM Platform.
"""
import uuid

from django.conf import settings
from django.contrib.auth.models import (
    AbstractBaseUser,
    BaseUserManager,
    PermissionsMixin,
)
from django.db import models
from django.utils import timezone
from django.utils.translation import gettext_lazy as _


class UserManager(BaseUserManager):
    use_in_migrations = True

    def _create_user(self, email=None, phone=None, password=None, **extra):
        if not email and not phone:
            raise ValueError(_("Users must have either an email or a phone number."))
        email = self.normalize_email(email) if email else None
        user = self.model(email=email, phone=phone, **extra)
        user.set_password(password)        # password=None -> unusable (social users)
        user.save(using=self._db)
        return user

    def create_user(self, email=None, phone=None, password=None, **extra):
        extra.setdefault("is_staff", False)
        extra.setdefault("is_superuser", False)
        return self._create_user(email, phone, password, **extra)

    def create_superuser(self, email, password=None, **extra):
        extra.setdefault("is_staff", True)
        extra.setdefault("is_superuser", True)
        extra.setdefault("is_verified", True)
        if extra.get("is_staff") is not True:
            raise ValueError(_("Superuser must have is_staff=True."))
        if extra.get("is_superuser") is not True:
            raise ValueError(_("Superuser must have is_superuser=True."))
        return self._create_user(email=email, password=password, **extra)


class User(AbstractBaseUser, PermissionsMixin):
    class AuthProvider(models.TextChoices):
        LOCAL = "local", _("Email/Phone")
        GOOGLE = "google", _("Google")
        FACEBOOK = "facebook", _("Facebook")
        APPLE = "apple", _("Apple")

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField(_("email address"), unique=True, null=True, blank=True)
    phone = models.CharField(_("phone number"), max_length=20, unique=True, null=True, blank=True)

    first_name = models.CharField(max_length=150, blank=True)
    last_name = models.CharField(max_length=150, blank=True)

    preferred_language = models.CharField(
        max_length=10, choices=settings.LANGUAGES, default="en",
        help_text=_("Drives translated emails, notifications and UI direction."),
    )
    auth_provider = models.CharField(
        max_length=20, choices=AuthProvider.choices, default=AuthProvider.LOCAL,
        help_text=_("How the account was originally created."),
    )

    is_verified = models.BooleanField(
        default=False, help_text=_("Email/phone confirmed via OTP (or social provider).")
    )
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)

    # Hashed transaction PIN (Django password hashers). Empty = not yet set.
    # Used to authorize money-out actions (bank withdrawals/transfers).
    transaction_pin = models.CharField(max_length=128, blank=True, default="")

    date_joined = models.DateTimeField(default=timezone.now)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    objects = UserManager()

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = []

    class Meta:
        verbose_name = _("user")
        verbose_name_plural = _("users")
        constraints = [
            models.CheckConstraint(
                check=models.Q(email__isnull=False) | models.Q(phone__isnull=False),
                name="user_has_email_or_phone",
            ),
        ]

    def __str__(self):
        return self.email or self.phone or str(self.id)

    def get_full_name(self):
        return f"{self.first_name} {self.last_name}".strip()

    def get_short_name(self):
        return self.first_name or self.email or self.phone or ""

    @property
    def identifier(self):
        return self.email or self.phone

    # ---- transaction PIN -------------------------------------------------
    @property
    def has_transaction_pin(self) -> bool:
        return bool(self.transaction_pin)

    def set_transaction_pin(self, raw_pin: str):
        """Hash and store a transaction PIN (does not save)."""
        from django.contrib.auth.hashers import make_password
        self.transaction_pin = make_password(str(raw_pin))

    def check_transaction_pin(self, raw_pin: str) -> bool:
        """Verify a raw PIN against the stored hash."""
        from django.contrib.auth.hashers import check_password
        if not self.transaction_pin:
            return False
        return check_password(str(raw_pin), self.transaction_pin)


class OTPCode(models.Model):
    class Purpose(models.TextChoices):
        SIGNUP = "signup_verification", _("Signup verification")
        PASSWORD_RESET = "password_reset", _("Password reset")
        LOGIN = "login", _("Login")

    class Channel(models.TextChoices):
        EMAIL = "email", _("Email")
        PHONE = "phone", _("Phone")

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="otp_codes")
    purpose = models.CharField(max_length=30, choices=Purpose.choices)
    channel = models.CharField(max_length=10, choices=Channel.choices)
    destination = models.CharField(max_length=255)
    code_hash = models.CharField(max_length=255)

    expires_at = models.DateTimeField()
    attempts = models.PositiveSmallIntegerField(default=0)
    is_used = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [models.Index(fields=["user", "purpose", "is_used"])]
        ordering = ["-created_at"]

    @property
    def is_expired(self) -> bool:
        return timezone.now() >= self.expires_at

    def __str__(self):
        return f"{self.purpose} -> {self.destination} ({'used' if self.is_used else 'active'})"


class SocialAccount(models.Model):
    """
    A social identity (Google / Facebook / Apple) linked to a User.

    A user can link several. `provider_user_id` is the provider's stable subject
    id; the (provider, provider_user_id) pair is unique so the same social
    identity can never attach to two users.
    """
    class Provider(models.TextChoices):
        GOOGLE = "google", _("Google")
        FACEBOOK = "facebook", _("Facebook")
        APPLE = "apple", _("Apple")

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="social_accounts")
    provider = models.CharField(max_length=20, choices=Provider.choices)
    provider_user_id = models.CharField(max_length=255)
    email = models.CharField(max_length=255, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["provider", "provider_user_id"], name="uniq_social_identity"
            ),
        ]

    def __str__(self):
        return f"{self.provider}:{self.email or self.provider_user_id}"

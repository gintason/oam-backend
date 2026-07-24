"""Serializers: registration, OTP, login, social auth, password reset."""
from django.conf import settings
from django.contrib.auth.password_validation import validate_password
from django.db.models import Q
from rest_framework import serializers

from .models import User


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ("id", "email", "phone", "first_name", "last_name",
                  "preferred_language", "auth_provider", "is_verified")
        read_only_fields = ("id", "auth_provider", "is_verified")


class RegisterSerializer(serializers.Serializer):
    email = serializers.EmailField(required=False, allow_null=True)
    phone = serializers.CharField(required=False, allow_null=True, max_length=20)
    password = serializers.CharField(write_only=True, min_length=8, style={"input_type": "password"})
    first_name = serializers.CharField(required=False, allow_blank=True, max_length=150)
    last_name = serializers.CharField(required=False, allow_blank=True, max_length=150)
    preferred_language = serializers.ChoiceField(
        choices=[code for code, _ in settings.LANGUAGES], default="en"
    )

    def validate(self, attrs):
        email = (attrs.get("email") or "").strip().lower() or None
        phone = (attrs.get("phone") or "").strip() or None
        if not email and not phone:
            raise serializers.ValidationError("Provide either an email or a phone number to register.")
        if email and User.objects.filter(email__iexact=email).exists():
            raise serializers.ValidationError({"email": "This email is already registered."})
        if phone and User.objects.filter(phone=phone).exists():
            raise serializers.ValidationError({"phone": "This phone number is already registered."})
        validate_password(attrs["password"])
        attrs["email"], attrs["phone"] = email, phone
        return attrs

    def create(self, validated):
        return User.objects.create_user(
            email=validated.get("email"),
            phone=validated.get("phone"),
            password=validated["password"],
            first_name=validated.get("first_name", ""),
            last_name=validated.get("last_name", ""),
            preferred_language=validated.get("preferred_language", "en"),
        )


class _IdentifierMixin(serializers.Serializer):
    identifier = serializers.CharField(help_text="The email or phone used at signup.")

    def resolve_user(self):
        ident = self.validated_data["identifier"].strip()
        user = User.objects.filter(Q(email__iexact=ident) | Q(phone=ident)).first()
        if user is None:
            raise serializers.ValidationError({"identifier": "No account found for this identifier."})
        return user


class VerifyOTPSerializer(_IdentifierMixin):
    code = serializers.CharField(min_length=4, max_length=8)


class ResendOTPSerializer(_IdentifierMixin):
    pass


class LoginSerializer(serializers.Serializer):
    identifier = serializers.CharField(help_text="Email or phone.")
    password = serializers.CharField(write_only=True, style={"input_type": "password"})

    def get_user(self):
        ident = self.validated_data["identifier"].strip()
        return User.objects.filter(Q(email__iexact=ident) | Q(phone=ident)).first()


class LogoutSerializer(serializers.Serializer):
    refresh = serializers.CharField()


class SocialAuthSerializer(serializers.Serializer):
    token = serializers.CharField()
    first_name = serializers.CharField(required=False, allow_blank=True)
    last_name = serializers.CharField(required=False, allow_blank=True)
    email = serializers.EmailField(required=False)
    provider_user_id = serializers.CharField(required=False)


class PasswordResetRequestSerializer(serializers.Serializer):
    """Only captures the identifier. The view resolves the user QUIETLY so the
    endpoint can't be used to discover which accounts exist."""
    identifier = serializers.CharField(help_text="Email or phone.")

    def find_user(self):
        ident = self.validated_data["identifier"].strip()
        return User.objects.filter(Q(email__iexact=ident) | Q(phone=ident)).first()


class PasswordResetConfirmSerializer(serializers.Serializer):
    identifier = serializers.CharField()
    code = serializers.CharField(min_length=4, max_length=8)
    new_password = serializers.CharField(write_only=True, min_length=8, style={"input_type": "password"})

    def find_user(self):
        ident = self.validated_data["identifier"].strip()
        return User.objects.filter(Q(email__iexact=ident) | Q(phone=ident)).first()

    def validate_new_password(self, value):
        validate_password(value)
        return value

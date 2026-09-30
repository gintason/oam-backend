"""Auth endpoints: registration, OTP, login, logout, profile, social, password reset."""
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.token_blacklist.models import (
    BlacklistedToken,
    OutstandingToken,
)
from rest_framework_simplejwt.tokens import RefreshToken

from .models import OTPCode
from .otp import issue_otp, verify_otp
from .serializers import (
    LoginSerializer,
    LogoutSerializer,
    PasswordResetConfirmSerializer,
    PasswordResetRequestSerializer,
    RegisterSerializer,
    ResendOTPSerializer,
    SocialAuthSerializer,
    UserSerializer,
    VerifyOTPSerializer,
)
from .social.exceptions import SocialAuthError
from .social.service import authenticate_social
from .tokens import tokens_for


def _channel_and_destination(user):
    if user.email:
        return OTPCode.Channel.EMAIL, user.email
    return OTPCode.Channel.PHONE, user.phone


def _invalidate_all_sessions(user):
    """Blacklist every outstanding refresh token for this user."""
    for token in OutstandingToken.objects.filter(user=user):
        BlacklistedToken.objects.get_or_create(token=token)


# ----------------------- Registration & OTP -----------------------
class RegisterView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        ref_code = serializer.validated_data.get("referral_code")
        if ref_code:
            try:
                from apps.referrals.services import ReferralService
                ReferralService.attach_referral(user, ref_code)
            except Exception:
                pass
        channel, destination = _channel_and_destination(user)
        issue_otp(user, purpose=OTPCode.Purpose.SIGNUP, channel=channel, destination=destination)
        return Response(
            {"user": UserSerializer(user).data, "tokens": tokens_for(user),
             "verification": {"required": True, "channel": channel, "destination": destination,
                              "message": "A verification code was sent. Verify to unlock all features."}},
            status=status.HTTP_201_CREATED,
        )


class VerifyOTPView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = VerifyOTPSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.resolve_user()
        if user.is_verified:
            return Response({"detail": "Account already verified."}, status=status.HTTP_200_OK)
        ok, reason = verify_otp(user, purpose=OTPCode.Purpose.SIGNUP,
                                code=serializer.validated_data["code"])
        if not ok:
            return Response({"detail": "Verification failed.", "reason": reason},
                            status=status.HTTP_400_BAD_REQUEST)
        user.is_verified = True
        user.save(update_fields=["is_verified", "updated_at"])
        return Response({"detail": "Account verified.", "user": UserSerializer(user).data,
                         "tokens": tokens_for(user)}, status=status.HTTP_200_OK)


class ResendOTPView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = ResendOTPSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.resolve_user()
        if user.is_verified:
            return Response({"detail": "Account already verified."}, status=status.HTTP_200_OK)
        channel, destination = _channel_and_destination(user)
        issue_otp(user, purpose=OTPCode.Purpose.SIGNUP, channel=channel, destination=destination)
        return Response({"detail": "A new verification code was sent.",
                         "channel": channel, "destination": destination}, status=status.HTTP_200_OK)


# ----------------------- Login / Logout / Me ----------------------- 
class LoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.get_user()
        password = serializer.validated_data["password"]
        if user is None or not user.check_password(password):
            return Response({"detail": "Invalid credentials."}, status=status.HTTP_401_UNAUTHORIZED)
        if not user.is_active:
            return Response({"detail": "This account is disabled."}, status=status.HTTP_403_FORBIDDEN)
        if not user.is_verified:
            channel, destination = _channel_and_destination(user)
            issue_otp(user, purpose=OTPCode.Purpose.SIGNUP, channel=channel, destination=destination)
            return Response(
                {"detail": "Account not verified. A new code was sent — please verify to log in.",
                 "reason": "unverified", "verification": {"channel": channel, "destination": destination}},
                status=status.HTTP_403_FORBIDDEN,
            )
        return Response({"user": UserSerializer(user).data, "tokens": tokens_for(user)},
                        status=status.HTTP_200_OK)


class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = LogoutSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            RefreshToken(serializer.validated_data["refresh"]).blacklist()
        except TokenError:
            return Response({"detail": "Invalid or expired refresh token."},
                            status=status.HTTP_400_BAD_REQUEST)
        return Response({"detail": "Logged out."}, status=status.HTTP_200_OK)


class MeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(UserSerializer(request.user).data)

    def patch(self, request):
        """Update first name, last name and phone. Email is read-only."""
        user = request.user
        data = request.data
        phone = data.get("phone")
        if phone is not None:
            phone = str(phone).strip() or None
            if phone and type(user).objects.filter(phone=phone).exclude(pk=user.pk).exists():
                return Response({"phone": "This phone number is already in use."},
                                status=status.HTTP_400_BAD_REQUEST)
            user.phone = phone
        if data.get("first_name") is not None:
            user.first_name = str(data.get("first_name")).strip()
        if data.get("last_name") is not None:
            user.last_name = str(data.get("last_name")).strip()
        user.save()
        return Response(UserSerializer(user).data)


# ----------------------- Social -----------------------
class SocialAuthView(APIView):
    permission_classes = [AllowAny]

    def post(self, request, provider):
        serializer = SocialAuthSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            user, created = authenticate_social(
                provider=provider,
                token=serializer.validated_data["token"],
                data=serializer.validated_data,
            )
        except SocialAuthError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(
            {"user": UserSerializer(user).data, "tokens": tokens_for(user), "created": created},
            status=status.HTTP_200_OK,
        )


# ----------------------- Password reset -----------------------
class PasswordResetRequestView(APIView):
    """
    Step 1: user submits identifier; we send a reset OTP if the account exists.
    Always returns the SAME response so the endpoint can't reveal which
    emails/phones are registered.
    """
    permission_classes = [AllowAny]
    GENERIC = {"detail": "If an account exists for that identifier, a reset code has been sent."}

    def post(self, request):
        serializer = PasswordResetRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.find_user()
        if user is not None:
            channel, destination = _channel_and_destination(user)
            issue_otp(user, purpose=OTPCode.Purpose.PASSWORD_RESET,
                      channel=channel, destination=destination)
        return Response(self.GENERIC, status=status.HTTP_200_OK)


class PasswordResetConfirmView(APIView):
    """
    Step 2: user submits identifier + code + new password. On success we set the
    new password, mark the account verified, and invalidate ALL old sessions.
    """
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = PasswordResetConfirmSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.find_user()
        if user is None:
            return Response({"detail": "Invalid identifier or code."},
                            status=status.HTTP_400_BAD_REQUEST)

        ok, reason = verify_otp(user, purpose=OTPCode.Purpose.PASSWORD_RESET,
                                code=serializer.validated_data["code"])
        if not ok:
            return Response({"detail": "Reset failed.", "reason": reason},
                            status=status.HTTP_400_BAD_REQUEST)

        user.set_password(serializer.validated_data["new_password"])
        user.is_verified = True                      # completing OTP proves control
        user.save(update_fields=["password", "is_verified", "updated_at"])

        _invalidate_all_sessions(user)               # cut off every old login

        return Response(
            {"detail": "Password reset successful. All other sessions were signed out.",
             "user": UserSerializer(user).data, "tokens": tokens_for(user)},
            status=status.HTTP_200_OK,
        )

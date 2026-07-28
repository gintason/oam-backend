"""
Transaction PIN management.

The PIN authorizes money-out actions (bank withdrawals/transfers). It is stored
hashed (Django password hashers) on the user, never in plain text.

  GET  /wallet/pin/    -> {"has_pin": bool}
  POST /wallet/pin/    -> set or change the PIN
       set (first time): {"pin": "1234", "password": "<account password>"}
       change:           {"pin": "1234", "current_pin": "<old pin>"}

Setting the first PIN is authorized with the account password; changing an
existing PIN requires the current PIN. Accounts with no usable password (e.g.
provider-only) may set a first PIN without one.
"""
from rest_framework import serializers, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.common.permissions import IsVerified


class SetPinSerializer(serializers.Serializer):
    pin = serializers.RegexField(r"^\d{4,6}$", error_messages={
        "invalid": "PIN must be 4 to 6 digits."})
    password = serializers.CharField(required=False, allow_blank=True, write_only=True)
    current_pin = serializers.CharField(required=False, allow_blank=True, write_only=True)


class TransactionPinView(APIView):
    permission_classes = [IsAuthenticated, IsVerified]

    def get(self, request):
        return Response({"has_pin": request.user.has_transaction_pin})

    def post(self, request):
        s = SetPinSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        user = request.user
        pin = s.validated_data["pin"]

        if user.has_transaction_pin:
            # Changing an existing PIN requires the current PIN.
            current = s.validated_data.get("current_pin") or ""
            if not user.check_transaction_pin(current):
                return Response({"detail": "Your current PIN is incorrect."},
                                status=status.HTTP_400_BAD_REQUEST)
        elif user.has_usable_password():
            # Setting the first PIN is authorized with the account password.
            password = s.validated_data.get("password") or ""
            if not user.check_password(password):
                return Response({"detail": "Your account password is incorrect."},
                                status=status.HTTP_400_BAD_REQUEST)

        user.set_transaction_pin(pin)
        user.save(update_fields=["transaction_pin", "updated_at"])
        return Response({"has_pin": True})

"""Serializers — note that contact details are conditional, never automatic."""
from rest_framework import serializers

from .models import Conversation, Message


def _display_name(user) -> str:
    for attr in ("full_name", "get_full_name", "name"):
        value = getattr(user, attr, None)
        if callable(value):
            value = value()
        if value:
            return str(value)
    first = (getattr(user, "first_name", "") or "").strip()
    last = (getattr(user, "last_name", "") or "").strip()
    if first or last:
        return f"{first} {last}".strip()
    return (getattr(user, "email", "") or "").split("@")[0] or "OAM user"


class MessageSerializer(serializers.ModelSerializer):
    sender_name = serializers.SerializerMethodField()
    is_mine = serializers.SerializerMethodField()

    class Meta:
        model = Message
        fields = ["id", "body", "sender_name", "is_mine", "read_at", "created_at"]
        read_only_fields = fields

    def get_sender_name(self, obj):
        return _display_name(obj.sender)

    def get_is_mine(self, obj):
        user = self.context.get("user")
        return bool(user and obj.sender_id == user.id)


class ConversationSerializer(serializers.ModelSerializer):
    subject = serializers.SerializerMethodField()
    other_party_name = serializers.SerializerMethodField()
    role = serializers.SerializerMethodField()
    contacts = serializers.SerializerMethodField()
    unread = serializers.SerializerMethodField()
    last_message = serializers.SerializerMethodField()

    class Meta:
        model = Conversation
        fields = [
            "id", "kind", "status", "subject", "other_party_name", "role",
            "contacts", "unread", "last_message", "accepted_at",
            "last_message_at", "created_at",
        ]
        read_only_fields = fields

    def _user(self):
        return self.context.get("user")

    def get_subject(self, obj):
        data = {"title": obj.subject_title()}
        if obj.kind == Conversation.Kind.LISTING and obj.listing_id:
            data["id"] = str(obj.listing_id)
            data["price"] = str(obj.listing.price)
            data["currency"] = obj.listing.currency
        elif obj.kind == Conversation.Kind.ARTISAN and obj.artisan_id:
            data["id"] = str(obj.artisan_id)
            data["category"] = getattr(obj.artisan.category, "name", "")
        return data

    def get_other_party_name(self, obj):
        user = self._user()
        return _display_name(obj.other_party(user)) if user else ""

    def get_role(self, obj):
        user = self._user()
        if not user:
            return ""
        return "customer" if obj.customer_id == user.id else "provider"

    def get_contacts(self, obj):
        """
        Phone numbers, but ONLY after the provider accepts.

        Returning them unconditionally would defeat the point: contacts are
        withheld so the introduction stays on OAM until there's a real booking.
        """
        if not obj.contacts_visible:
            return None
        user = self._user()
        if not user:
            return None

        other = obj.other_party(user)
        phone = getattr(other, "phone", "") or getattr(other, "phone_number", "") or ""
        whatsapp = ""

        # Provider contact details live on their profile, not the user record.
        if obj.customer_id == user.id:
            if obj.kind == Conversation.Kind.LISTING and obj.listing_id:
                phone = obj.listing.contact_phone or phone
                whatsapp = obj.listing.contact_whatsapp or ""
            elif obj.kind == Conversation.Kind.ARTISAN and obj.artisan_id:
                phone = obj.artisan.phone or phone
                whatsapp = obj.artisan.whatsapp or ""

        return {"name": _display_name(other), "phone": phone, "whatsapp": whatsapp}

    def get_unread(self, obj):
        user = self._user()
        if not user:
            return 0
        return obj.messages.filter(read_at__isnull=True).exclude(sender=user).count()

    def get_last_message(self, obj):
        msg = obj.messages.order_by("-created_at").first()
        if not msg:
            return None
        return {"body": msg.body[:120], "created_at": msg.created_at}

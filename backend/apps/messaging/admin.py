from django.contrib import admin

from .models import Conversation, Message


@admin.register(Conversation)
class ConversationAdmin(admin.ModelAdmin):
    list_display = ("id", "kind", "customer", "provider", "status", "last_message_at")
    list_filter = ("kind", "status")
    search_fields = ("customer__email", "provider__email")


@admin.register(Message)
class MessageAdmin(admin.ModelAdmin):
    list_display = ("conversation", "sender", "body", "read_at", "created_at")
    search_fields = ("body",)

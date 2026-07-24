from django.urls import path

from .views import (
    ConversationActionView,
    ConversationDetailView,
    ConversationListView,
    MessageCreateView,
    UnreadCountView,
)

urlpatterns = [
    path("conversations/", ConversationListView.as_view(), name="msg-conversations"),
    path("unread/", UnreadCountView.as_view(), name="msg-unread"),
    path("conversations/<uuid:conversation_id>/", ConversationDetailView.as_view(),
         name="msg-conversation"),
    path("conversations/<uuid:conversation_id>/messages/", MessageCreateView.as_view(),
         name="msg-send"),
    path("conversations/<uuid:conversation_id>/<str:action>/", ConversationActionView.as_view(),
         name="msg-action"),
]

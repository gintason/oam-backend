from django.urls import path

from .views import (RegisterDeviceView, UnregisterDeviceView,
                    NotificationListView, UnreadCountView, MarkReadView)

urlpatterns = [
    path("register-device/", RegisterDeviceView.as_view(), name="register-device"),
    path("unregister-device/", UnregisterDeviceView.as_view(), name="unregister-device"),
    path("", NotificationListView.as_view(), name="notification-list"),
    path("unread/", UnreadCountView.as_view(), name="notification-unread"),
    path("read/", MarkReadView.as_view(), name="notification-read"),
]

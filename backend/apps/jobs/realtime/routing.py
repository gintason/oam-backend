from django.urls import path

from .consumers import JobsConsumer

websocket_urlpatterns = [
    path("ws/jobs/", JobsConsumer.as_asgi()),
]

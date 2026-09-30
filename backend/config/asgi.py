"""
ASGI entrypoint: normal Django HTTP + WebSockets (Django Channels).

# [oam-jobs] Run with:  gunicorn config.asgi:application -k uvicorn.workers.UvicornWorker
"""
import os

from django.core.asgi import get_asgi_application

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.prod")

# Initialise Django BEFORE importing anything that touches models.
django_asgi_app = get_asgi_application()

from channels.routing import ProtocolTypeRouter, URLRouter  # noqa: E402

from apps.jobs.realtime.auth import JWTAuthMiddlewareStack  # noqa: E402
from apps.jobs.realtime.routing import websocket_urlpatterns  # noqa: E402

application = ProtocolTypeRouter({
    "http": django_asgi_app,
    "websocket": JWTAuthMiddlewareStack(URLRouter(websocket_urlpatterns)),
})

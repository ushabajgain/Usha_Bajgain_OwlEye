"""
ASGI config for OwlEye project.

This module configures the ASGI application for both HTTP and WebSocket protocols.
It enables real-time communication features like live maps, alerts, and incident updates.
"""

import os
from django.core.asgi import get_asgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'owleye.settings')

# Initialize Django ASGI application early to ensure the AppRegistry
# is populated before importing code that may import ORM models.
django_asgi_app = get_asgi_application()

from channels.routing import ProtocolTypeRouter, URLRouter
from channels.auth import AuthMiddlewareStack
from channels.security.websocket import AllowedHostsOriginValidator
from core.routing import websocket_urlpatterns

application = ProtocolTypeRouter({
    # HTTP requests are handled by Django's ASGI application
    "http": django_asgi_app,
    
    # WebSocket connections
    "websocket": AllowedHostsOriginValidator(
        AuthMiddlewareStack(
            URLRouter(websocket_urlpatterns)
        )
    ),
})

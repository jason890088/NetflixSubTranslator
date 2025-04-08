"""
ASGI config for netflix_translator project.

It exposes the ASGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/5.1/howto/deployment/asgi/
"""

import os
from channels.routing import ProtocolTypeRouter, URLRouter
from django.core.asgi import get_asgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'netflix_translator.settings')

# delay import
def get_websocket_application():
    from translation.routing import websocket_urlpatterns
    return URLRouter(websocket_urlpatterns)

application = ProtocolTypeRouter({
    "http": get_asgi_application(),
    "websocket": get_websocket_application(),  # 這裡才真正載入
})
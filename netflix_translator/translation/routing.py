from django.urls import re_path
from translation.consumers import SubtitleConsumer


websocket_urlpatterns = [
    re_path(r"ws/translate/$", SubtitleConsumer.as_asgi())
]
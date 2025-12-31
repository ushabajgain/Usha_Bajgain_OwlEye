from django.urls import re_path
from . import consumers

websocket_urlpatterns = [
    re_path(r'ws/heatmap/(?P<event_id>[^/]+)/$', consumers.HeatmapConsumer.as_asgi()),
]

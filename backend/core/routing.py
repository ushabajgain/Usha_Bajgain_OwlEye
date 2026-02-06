from django.urls import re_path
from . import consumers

websocket_urlpatterns = [
    re_path(r'ws/attendance/(?P<event_id>\w+)/$', consumers.AttendanceConsumer.as_asgi()),
    re_path(r'ws/heatmap/(?P<event_id>\w+)/$', consumers.HeatmapConsumer.as_asgi()),
    re_path(r'ws/track/(?P<event_id>\w+)/$', consumers.LocationTrackConsumer.as_asgi()),
    re_path(r'ws/live-map/(?P<event_id>\w+)/$', consumers.LiveMapConsumer.as_asgi()),
]

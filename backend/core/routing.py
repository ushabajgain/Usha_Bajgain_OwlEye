from django.urls import re_path
from . import consumers

websocket_urlpatterns = [
    re_path(r'ws/attendance/(?P<event_id>\w+)/$', consumers.AttendanceConsumer.as_asgi()),
]

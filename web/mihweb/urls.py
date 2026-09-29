"""URL 뿌리.

서브패스(`MIH/`)를 여기 한 곳에서만 붙인다. `viewer/urls.py` 는 접두사를 모른다 —
nginx 가 어디에 걸든 앱은 그대로 돌아야 한다. GSM 과 같은 갈래다.
"""
from django.conf import settings
from django.urls import include, path

urlpatterns = [
    path(settings.URL_PREFIX, include("viewer.urls")),
]

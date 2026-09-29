from django.urls import path

from . import views

app_name = "viewer"

urlpatterns = [
    path("", views.map_page, name="map"),
    path("healthz", views.healthz, name="healthz"),
    path("labels", views.labels_view, name="labels"),
    path("data/<path:relative>", views.data_file, name="data"),
]

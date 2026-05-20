from django.contrib import admin
from django.urls import path
from dashboard import views

urlpatterns = [
    path('admin/', admin.site.urls),
    path('', views.landing_page, name='landing'),
    path('dashboard/', views.dashboard_page, name='dashboard'),
    path('api/readings', views.api_readings, name='api_readings'),
    path('api/readings/latest', views.api_readings_latest, name='api_readings_latest'),
    path('health', views.health_check, name='health_check'),
]

from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),

    path('api/', include('teachers.urls')),      # FIXED
    path('api/dashboard/', include('dashboard.urls')),
    path('api/schools/', include('schools.urls')),
]


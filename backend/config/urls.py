from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from rest_framework_simplejwt.views import TokenRefreshView
from accounts.views import login_user

urlpatterns = [
    path('admin/', admin.site.urls),

    path('api/', include('teachers.urls')),
    path('api/documents/', include('documents.urls')),
    path('api/dashboard/', include('dashboard.urls')),
    path('api/schools/', include('schools.urls')),
    path('api/accounts/', include('accounts.urls')),
    path('api/token/', login_user),  # matches app/login/page.tsx contract
    path('api/token/refresh/', TokenRefreshView.as_view()),
]

urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
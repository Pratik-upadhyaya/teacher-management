from django.contrib import admin
from django.urls import path, include, re_path
from rest_framework_simplejwt.views import TokenRefreshView
from accounts.views import login_user
from documents.views import serve_document

urlpatterns = [
    path('admin/', admin.site.urls),

    path('api/', include('teachers.urls')),
    path('api/documents/', include('documents.urls')),
    path('api/leaves/', include('leaves.urls')),
    path('api/dashboard/', include('dashboard.urls')),
    path('api/schools/', include('schools.urls')),
    path('api/accounts/', include('accounts.urls')),
    path('api/token/', login_user),  # matches app/login/page.tsx contract
    path('api/token/refresh/', TokenRefreshView.as_view()),

    # Uploaded documents (citizenship, degree certs, etc.) are real
    # government ID documents -- these must go through serve_document's
    # auth + ownership check, never Django's bare static() helper (which
    # has no auth at all). Deliberately NOT using django.conf.urls.static
    # here, including in production: if this ever gets deployed behind
    # nginx, do NOT add a plain `location /media/ { alias ...; }` block,
    # since that would bypass this check entirely -- media requests must
    # keep reaching Django.
    re_path(r'^media/(?P<path>.+)$', serve_document),
]
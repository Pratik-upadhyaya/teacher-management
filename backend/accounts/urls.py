from django.urls import path
from .views import register_user, login_user, teacher_detail

urlpatterns = [
    path('register/', register_user),
    path('login/', login_user),

    # Teacher details for view button
    path('teacher/<int:id>/', teacher_detail),
]
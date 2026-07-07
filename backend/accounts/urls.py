from django.urls import path
from .views import register_user, login_user, teacher_detail, create_staff_user

urlpatterns = [
    path('register/', register_user),
    path('login/', login_user),
    path('staff/create/', create_staff_user),  # admin-only: create principal/admin accounts

    # Teacher details for view button
    path('teacher/<int:id>/', teacher_detail),
]
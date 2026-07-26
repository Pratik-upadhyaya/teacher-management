from django.urls import path
from .views import (
    register_user,
    login_user,
    logout_user,
    create_staff_user,
    change_password,
    list_sub_admins,
    delete_sub_admin,
    send_otp,
    verify_otp,
)

urlpatterns = [
    path('register/', register_user),
    path('login/', login_user),
    path('logout/', logout_user),  # blacklists the given refresh token
    path('staff/create/', create_staff_user),  # admin-only: create principal/sub-admin/admin accounts
    path('change-password/', change_password),  # any logged-in user
    path('sub-admins/', list_sub_admins),  # admin-only
    path('sub-admins/<int:id>/', delete_sub_admin),  # admin-only

    # Registration verification (public, throttled -- see accounts/otp.py)
    path('otp/send/', send_otp),
    path('otp/verify/', verify_otp),
]
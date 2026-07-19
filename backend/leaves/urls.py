from django.urls import path
from .views import (
    leave_type_list, my_leave_applications, my_leave_summary,
    teacher_leave_overview,
)

urlpatterns = [
    path('types/', leave_type_list),
    path('mine/', my_leave_applications),
    path('summary/', my_leave_summary),
    path('teacher/<int:teacher_id>/', teacher_leave_overview),
]
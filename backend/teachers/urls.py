from django.urls import path
from .views import (
    teacher_list_create,
    approve_teacher,
    reject_teacher,
    teacher_detail,
)

urlpatterns = [
    path('', teacher_list_create),
    path('<int:teacher_id>/approve/', approve_teacher),
    path('<int:teacher_id>/reject/', reject_teacher),
    path('teacher/<int:id>/', teacher_detail),
]
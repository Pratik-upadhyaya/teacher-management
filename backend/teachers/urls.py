from django.urls import path
from .views import (
    TeacherListCreateView,
    approve_teacher,
    reject_teacher,
    teacher_detail,
    request_changes,
    teacher_me,
)

urlpatterns = [
    path('', TeacherListCreateView.as_view()),
    path('teachers/me/', teacher_me),
    path('<int:teacher_id>/approve/', approve_teacher),
    path('<int:teacher_id>/reject/', reject_teacher),
    path('teacher/<int:id>/', teacher_detail),
    path('teacher/<int:teacher_id>/request-changes/', request_changes),
]
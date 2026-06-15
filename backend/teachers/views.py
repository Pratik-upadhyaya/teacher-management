from django.shortcuts import get_object_or_404
from rest_framework.decorators import api_view
from rest_framework.response import Response
from .models import Teacher
from .serializers import TeacherSerializer


@api_view(['GET', 'POST'])
def teacher_list_create(request):
    if request.method == 'GET':
        teachers = Teacher.objects.all()
        serializer = TeacherSerializer(teachers, many=True)
        return Response(serializer.data)

    if request.method == 'POST':
        serializer = TeacherSerializer(data=request.data)

        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=201)

        return Response(serializer.errors, status=400)


@api_view(['PATCH'])
def approve_teacher(request, teacher_id):
    teacher = get_object_or_404(Teacher, id=teacher_id)
    teacher.status = "approved"
    teacher.save()
    return Response({"message": "Teacher approved"})


@api_view(['PATCH'])
def reject_teacher(request, teacher_id):
    teacher = get_object_or_404(Teacher, id=teacher_id)
    teacher.status = "rejected"
    teacher.save()
    return Response({"message": "Teacher rejected"})


# =========================
# TEACHER DETAIL API
# =========================
@api_view(['GET'])
def teacher_detail(request, id):
    teacher = get_object_or_404(Teacher, id=id)

    data = {
        "id": teacher.id,
        "name": teacher.name,
        "tokenNo": teacher.tokenNo,
        "subject": teacher.subject,
        "phone": teacher.phone,
        "email": teacher.email,
        "status": teacher.status,
        "schoolName": getattr(teacher, "schoolName", ""),
        "photo": teacher.photo.url if hasattr(teacher, "photo") and teacher.photo else None,
    }

    return Response(data)
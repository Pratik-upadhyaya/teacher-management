from rest_framework.decorators import api_view
from rest_framework.response import Response
from django.contrib.auth import authenticate
from .serializers import RegisterSerializer
from teachers.models import Teacher


@api_view(['POST'])
def register_user(request):
    serializer = RegisterSerializer(data=request.data)

    if serializer.is_valid():
        serializer.save()
        return Response({"message": "User registered successfully"}, status=201)

    return Response(serializer.errors, status=400)


@api_view(['POST'])
def login_user(request):
    username = request.data.get("username")
    password = request.data.get("password")

    user = authenticate(username=username, password=password)

    if user:
        return Response({
            "message": "Login successful",
            "username": user.username,
            "role": user.role
        })

    return Response({"error": "Invalid credentials"}, status=401)


# =========================
# TEACHER DETAIL API
# =========================
@api_view(['GET'])
def teacher_detail(request, id):
    try:
        teacher = Teacher.objects.get(id=id)
    except Teacher.DoesNotExist:
        return Response({"error": "Teacher not found"}, status=404)

    data = {
        "id": teacher.id,
        "name": teacher.name,
        "tokenNo": teacher.tokenNo,
        "subject": teacher.subject,
        "phone": teacher.phone,
        "email": teacher.email,
        "schoolName": getattr(teacher, "schoolName", ""),
        "status": teacher.status,
        "photo": teacher.photo.url if hasattr(teacher, "photo") and teacher.photo else None,
        "documents": []
    }

    return Response(data)
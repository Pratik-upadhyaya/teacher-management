from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import authenticate
from .serializers import RegisterSerializer, StaffCreateSerializer
from .permissions import IsAdmin
from teachers.models import Teacher


@api_view(['POST'])
@permission_classes([AllowAny])
def register_user(request):
    """Public registration. Always creates a 'teacher' role account --
    see RegisterSerializer for why role is not accepted from the client."""
    serializer = RegisterSerializer(data=request.data)

    if serializer.is_valid():
        serializer.save()
        return Response({"message": "User registered successfully"}, status=201)

    return Response(serializer.errors, status=400)


@api_view(['POST'])
@permission_classes([IsAuthenticated, IsAdmin])
def create_staff_user(request):
    """Admin-only endpoint to create principal/admin accounts.
    Requires a valid access token for an existing admin user."""
    serializer = StaffCreateSerializer(data=request.data)

    if serializer.is_valid():
        serializer.save()
        return Response({"message": "Staff account created"}, status=201)

    return Response(serializer.errors, status=400)


@api_view(['POST'])
@permission_classes([AllowAny])
def login_user(request):
    """
    Accepts {email, password} (matching app/login/page.tsx). Django's User
    model authenticates by `username` internally, so we look the user up
    by email first, then authenticate with their actual username.
    """
    email = request.data.get("email") or request.data.get("username")
    password = request.data.get("password")

    if not email or not password:
        return Response({"error": "Email and password are required."}, status=400)

    from .models import User
    try:
        user_obj = User.objects.get(email=email)
    except User.DoesNotExist:
        return Response({"error": "Invalid credentials"}, status=401)

    user = authenticate(username=user_obj.username, password=password)

    if user is None:
        return Response({"error": "Invalid credentials"}, status=401)

    refresh = RefreshToken.for_user(user)

    return Response({
        "access": str(refresh.access_token),
        "refresh": str(refresh),
        "username": user.username,
        "role": user.role,
    })


# =========================
# TEACHER DETAIL API
# =========================
@api_view(['GET'])
@permission_classes([IsAuthenticated])
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
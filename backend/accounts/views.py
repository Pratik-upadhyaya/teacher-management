from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import authenticate
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from .serializers import RegisterSerializer, StaffCreateSerializer, SubAdminSerializer
from .permissions import IsAdmin
from .models import User
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

    from .models import User  # noqa: local import kept for clarity at call site
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


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def change_password(request):
    """Lets a logged-in user change their own password. Matches
    app/(portal)/profile/page.tsx: {current_password, new_password}."""
    current_password = request.data.get("current_password")
    new_password = request.data.get("new_password")

    if not current_password or not new_password:
        return Response(
            {"error": "Current and new password are required."}, status=400
        )

    if not request.user.check_password(current_password):
        return Response({"error": "Current password is incorrect."}, status=400)

    if current_password == new_password:
        return Response(
            {"error": "New password must be different from the current password."},
            status=400,
        )

    try:
        # Same validators Django runs for regular account creation
        # (length, not-too-common, not-all-numeric, etc).
        validate_password(new_password, user=request.user)
    except DjangoValidationError as e:
        return Response({"error": " ".join(e.messages)}, status=400)

    request.user.set_password(new_password)
    request.user.save()

    return Response({"message": "Password updated successfully."})


@api_view(['GET'])
@permission_classes([IsAuthenticated, IsAdmin])
def list_sub_admins(request):
    """Admin-only: list all sub-admin accounts. Sub-admins can create/edit
    teacher records but cannot see or manage other sub-admins -- account
    management (this endpoint and create_staff_user) stays admin-only."""
    sub_admins = User.objects.filter(role='sub-admin').order_by('-date_joined')
    return Response(SubAdminSerializer(sub_admins, many=True).data)


@api_view(['DELETE'])
@permission_classes([IsAuthenticated, IsAdmin])
def delete_sub_admin(request, id):
    """Admin-only: remove a sub-admin account. Scoped to role='sub-admin'
    so this endpoint can never be used to delete a principal/admin/teacher
    account, even if someone guesses another user's id."""
    user = User.objects.filter(id=id, role='sub-admin').first()
    if not user:
        return Response({"error": "Sub-admin not found."}, status=404)
    user.delete()
    return Response({"message": "Sub-admin removed."})


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
import re
from rest_framework.decorators import api_view, permission_classes, throttle_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import TokenError
from django.contrib.auth import authenticate
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from django.db.models import Count, Q
from .serializers import RegisterSerializer, StaffCreateSerializer, SubAdminSerializer
from .permissions import IsAdmin, IsAdminOrPrincipal
from .throttles import LoginRateThrottle, OtpSendRateThrottle
from .otp import generate_and_store_otp, check_otp, send_email_otp, send_sms_otp
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
@throttle_classes([LoginRateThrottle])
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
    except User.MultipleObjectsReturned:
        # Shouldn't be reachable now that email is unique=True at the DB
        # level, but this guards any row that predates that migration
        # (e.g. duplicate accounts created before the constraint existed)
        # so login fails cleanly instead of 500ing.
        return Response(
            {"error": "Multiple accounts share this email. Please contact an admin."},
            status=409,
        )

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
def logout_user(request):
    """Blacklists the given refresh token so it can't be used again --
    without this, logging out only cleared the cookie client-side; the
    token itself stayed valid on the server for its full 7-day lifetime.
    Matches whatever calls this with {"refresh": "<token>"}."""
    refresh_str = request.data.get("refresh")
    if not refresh_str:
        return Response({"error": "Refresh token is required."}, status=400)

    try:
        token = RefreshToken(refresh_str)
        token.blacklist()
    except TokenError:
        # Already invalid/expired/blacklisted -- logout still "succeeds"
        # from the user's point of view, nothing further to revoke.
        pass

    return Response({"message": "Logged out."})


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
    """Admin-only: list all sub-admin accounts, with how many teacher
    applications each has approved/rejected. Sub-admins can create/edit
    teacher records but cannot see or manage other sub-admins -- account
    management (this endpoint and create_staff_user) stays admin-only."""
    sub_admins = User.objects.filter(role='sub-admin').annotate(
        approved_count=Count(
            'reviewed_teachers', filter=Q(reviewed_teachers__status='approved')
        ),
        rejected_count=Count(
            'reviewed_teachers', filter=Q(reviewed_teachers__status='rejected')
        ),
    ).order_by('-date_joined')
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
@permission_classes([IsAuthenticated, IsAdminOrPrincipal])
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


# =========================
# REGISTRATION OTP VERIFICATION (email + phone)
# =========================
# Public, throttled endpoints used by the teacher self-registration wizard
# to verify an email/phone actually belongs to the applicant before their
# application can be submitted. See accounts/otp.py for storage/delivery.
_PHONE_RE = re.compile(r"^(98|97)\d{8}$")
_EMAIL_RE = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]+$")


def _validate_otp_target(otp_type, value):
    if otp_type not in ("email", "phone"):
        return "type must be 'email' or 'phone'."
    if not value or not value.strip():
        return "value is required."
    if otp_type == "email" and not _EMAIL_RE.match(value.strip()):
        return "Enter a valid email address."
    if otp_type == "phone" and not _PHONE_RE.match(value.strip()):
        return "Enter a valid Nepali phone number (98/97XXXXXXXX)."
    return None


@api_view(['POST'])
@permission_classes([AllowAny])
@throttle_classes([OtpSendRateThrottle])
def send_otp(request):
    otp_type = request.data.get("type")
    value = (request.data.get("value") or "").strip()

    validation_error = _validate_otp_target(otp_type, value)
    if validation_error:
        return Response({"error": validation_error}, status=400)

    code = generate_and_store_otp(otp_type, value)

    # Optional: the registration wizard's Personal step now runs before
    # the Account step that sends this OTP, so it can pass along the
    # applicant's name/gender to personalize the email greeting (see
    # accounts/otp.py send_email_otp). Not required -- callers hitting
    # this endpoint without them (or the phone/SMS path) still work.
    name = (request.data.get("name") or "").strip()
    gender = (request.data.get("gender") or "").strip()

    try:
        if otp_type == "email":
            send_email_otp(value, code, name=name, gender=gender)
        else:
            send_sms_otp(value, code)
    except Exception:
        return Response(
            {"error": "Could not send verification code. Please try again."},
            status=502,
        )

    return Response({"message": "Verification code sent."})


@api_view(['POST'])
@permission_classes([AllowAny])
def verify_otp(request):
    otp_type = request.data.get("type")
    value = (request.data.get("value") or "").strip()
    code = (request.data.get("code") or "").strip()

    validation_error = _validate_otp_target(otp_type, value)
    if validation_error:
        return Response({"error": validation_error}, status=400)
    if not code:
        return Response({"error": "Enter the code you received."}, status=400)

    success, error_message = check_otp(otp_type, value, code)
    if not success:
        return Response({"error": error_message}, status=400)

    return Response({"message": "Verified."})
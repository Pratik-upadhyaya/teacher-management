# =========================
# IMPORTS
# =========================
from django.shortcuts import get_object_or_404
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from .models import Teacher
from .serializers import TeacherSerializer
from accounts.permissions import IsAdminOrPrincipal


# =========================
# REGISTER + GET ALL TEACHERS
# =========================
@api_view(['GET', 'POST'])
@permission_classes([AllowAny])
def teacher_list_create(request):
    # POST is a public application form -- a new teacher submitting their
    # application has no account yet, so this must stay open (matches
    # app/register/page.tsx, which sends no Authorization header).
    #
    # GET returns every teacher's full PII (phone, email, documents), so it
    # is restricted to admin/principal despite the view itself being AllowAny.

    # =========================
    # GET ALL TEACHERS
    # =========================
    if request.method == 'GET':
        if not (request.user and request.user.is_authenticated
                and IsAdminOrPrincipal().has_permission(request, None)):
            return Response({"error": "Authentication required."}, status=401)
        teachers = Teacher.objects.all()
        serializer = TeacherSerializer(teachers, many=True)
        return Response(serializer.data)

    # =========================
    # CREATE TEACHER
    # =========================
    if request.method == 'POST':
        serializer = TeacherSerializer(data=request.data)

        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=201)

        return Response(serializer.errors, status=400)


# =========================
# CURRENT LOGGED-IN TEACHER (used by login page to greet the user)
# =========================
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def teacher_me(request):
    teacher = Teacher.objects.filter(email=request.user.email).first()
    if not teacher:
        return Response({"error": "No teacher profile linked to this account."}, status=404)
    serializer = TeacherSerializer(teacher)
    return Response(serializer.data)


# =========================
# APPROVE TEACHER
# =========================
@api_view(['PATCH'])
@permission_classes([IsAuthenticated, IsAdminOrPrincipal])
def approve_teacher(request, teacher_id):
    from accounts.models import User

    teacher = get_object_or_404(Teacher, id=teacher_id)
    teacher.status = "approved"

    # Create the teacher's login account now, using the password they set
    # on the application form -- previously this was stored in plaintext
    # and never actually connected to a real login (see comment that used
    # to be in app/register/page.tsx). We hash it into a proper User here,
    # then scrub the plaintext copy so it doesn't linger in the database.
    account_created = False
    if not User.objects.filter(email=teacher.email).exists() and teacher.password:
        user = User(username=teacher.email, email=teacher.email, role='teacher', phone=teacher.phone)
        user.set_password(teacher.password)
        user.save()
        account_created = True

    teacher.password = ""  # scrub plaintext regardless of whether we used it
    teacher.save()

    return Response({
        "message": "Teacher approved",
        "account_created": account_created,
    })


# =========================
# REJECT TEACHER
# =========================
@api_view(['PATCH'])
@permission_classes([IsAuthenticated, IsAdminOrPrincipal])
def reject_teacher(request, teacher_id):
    teacher = get_object_or_404(Teacher, id=teacher_id)
    teacher.status = "rejected"
    teacher.save()
    return Response({"message": "Teacher rejected"})


# =========================
# REQUEST CHANGES
# =========================
@api_view(['PATCH'])
@permission_classes([IsAuthenticated, IsAdminOrPrincipal])
def request_changes(request, teacher_id):
    teacher = get_object_or_404(Teacher, id=teacher_id)

    teacher.remarks = request.data.get("message", "")
    teacher.save()

    return Response({"message": "Change request sent"})


# =========================
# TEACHER DETAIL API
# =========================
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def teacher_detail(request, id):
    teacher = get_object_or_404(Teacher, id=id)

    data = {
        "id": teacher.id,

        # PERSONAL
        "name": teacher.name,
        "fatherName": teacher.fatherName,
        "dob": teacher.dob,
        "phone": teacher.phone,
        "email": teacher.email,
        "permanentAddress": teacher.permanentAddress,
        "permanentWardNo": teacher.permanentWardNo,

        # SCHOOL
        "district": teacher.district,
        "municipality": teacher.municipality,
        "wardNo": teacher.wardNo,
        "schoolName": teacher.schoolName,
        "tokenNo": teacher.tokenNo,
        "subject": teacher.subject,
        "level": teacher.level,
        "grade": teacher.grade,
        "teacherType": teacher.teacherType,

        # JOB
        "appointmentDate": teacher.appointmentDate,
        "promotionDate": teacher.promotionDate,
        "qualification": teacher.qualification,
        "extraordinaryLeave": teacher.extraordinaryLeave,
        "accumulatedLeave": teacher.accumulatedLeave,
        "ageSixtyYear": teacher.ageSixtyYear,

        # DOCUMENTS (IMPORTANT: use .name)
        "citizenship": teacher.citizenship.name if teacher.citizenship else None,
        "degree": teacher.degree.name if teacher.degree else None,
        "transcript": teacher.transcript.name if teacher.transcript else None,
        "teachingLicense": teacher.teachingLicense.name if teacher.teachingLicense else None,
        "appointmentLetter": teacher.appointmentLetter.name if teacher.appointmentLetter else None,

        # ADMIN
        "status": teacher.status,
        "remarks": teacher.remarks,
        "created_at": teacher.created_at,
    }

    return Response(data)
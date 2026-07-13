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
# CURRENT LOGGED-IN TEACHER (used by login page to greet the user,
# and by the Profile page to view/edit contact details)
# =========================
# Fields a teacher is allowed to edit about themselves from the Profile
# page. Deliberately excludes email (it's the login identifier -- see
# comment below), password, status, and every school/service field, which
# only admins/principals should be able to change.
#
# Document fields (citizenship, degree, transcript, teachingLicense,
# appointmentLetter) are also deliberately excluded here -- a teacher can
# no longer overwrite a live document by PATCHing this endpoint. Uploads
# now go through documents.views.my_document_requests as a change request,
# and only land on the Teacher record once an admin/sub-admin/principal
# approves it (see documents.views.approve_document_request).
PROFILE_EDITABLE_FIELDS = ("name", "phone", "permanentAddress")


@api_view(['GET', 'PATCH'])
@permission_classes([IsAuthenticated])
def teacher_me(request):
    teacher = Teacher.objects.filter(email=request.user.email).first()
    if not teacher:
        return Response({"error": "No teacher profile linked to this account."}, status=404)

    if request.method == 'PATCH':
        # Only accept the whitelisted profile fields -- silently ignore
        # anything else in the body (email, status, documents, etc.) rather
        # than trusting TeacherSerializer's fields='__all__' for writes
        # here. Email is intentionally not editable through this endpoint:
        # it's what links this Teacher row to the User login account
        # (teacher_me looks it up via request.user.email) and is also the
        # User's `username`, so changing it here would silently break the
        # teacher's ability to log in. A real "change email" flow would
        # need to update both records together -- out of scope for now.
        profile_data = {k: v for k, v in request.data.items() if k in PROFILE_EDITABLE_FIELDS}
        if profile_data:
            serializer = TeacherSerializer(teacher, data=profile_data, partial=True)
            if not serializer.is_valid():
                return Response(serializer.errors, status=400)
            serializer.save()

        return Response(TeacherSerializer(teacher).data)

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
    teacher.reviewed_by = request.user

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

    message = (request.data.get("message") or "").strip()
    if not message:
        return Response({"error": "A rejection reason is required."}, status=400)

    teacher.status = "rejected"
    teacher.remarks = message
    teacher.reviewed_by = request.user
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
    teacher.reviewed_by = request.user
    teacher.save()

    return Response({"message": "Change request sent"})


# =========================
# TEACHER DETAIL API
# =========================
# Returns a teacher's full PII (DOB, phone, address, document file paths,
# etc.) -- this is reviewer-only, same as teacher_list_create's GET.
# Teachers view their OWN data via teacher_me, not this endpoint.
@api_view(['GET'])
@permission_classes([IsAuthenticated, IsAdminOrPrincipal])
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
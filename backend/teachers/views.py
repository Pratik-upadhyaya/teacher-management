# =========================
# IMPORTS
# =========================
from django.shortcuts import get_object_or_404
from rest_framework.decorators import api_view
from rest_framework.response import Response
from .models import Teacher
from .serializers import TeacherSerializer


# =========================
# REGISTER + GET ALL TEACHERS
# =========================
@api_view(['GET', 'POST'])
def teacher_list_create(request):

    # =========================
    # GET ALL TEACHERS
    # =========================
    if request.method == 'GET':
        teachers = Teacher.objects.all()
        serializer = TeacherSerializer(teachers, many=True)
        return Response(serializer.data)

    # =========================
    # CREATE TEACHER
    # =========================
    if request.method == 'POST':
        print("========== NEW REGISTRATION ==========")
        print("DATA =", request.data)
        print("FILES =", request.FILES)

        serializer = TeacherSerializer(data=request.data)

        if serializer.is_valid():
            serializer.save()
            print("SAVED SUCCESSFULLY")
            return Response(serializer.data, status=201)

        print("ERRORS =", serializer.errors)
        return Response(serializer.errors, status=400)


# =========================
# APPROVE TEACHER
# =========================
@api_view(['PATCH'])
def approve_teacher(request, teacher_id):
    teacher = get_object_or_404(Teacher, id=teacher_id)
    teacher.status = "approved"
    teacher.save()
    return Response({"message": "Teacher approved"})


# =========================
# REJECT TEACHER
# =========================
@api_view(['PATCH'])
def reject_teacher(request, teacher_id):
    teacher = get_object_or_404(Teacher, id=teacher_id)
    teacher.status = "rejected"
    teacher.save()
    return Response({"message": "Teacher rejected"})


# =========================
# REQUEST CHANGES
# =========================
@api_view(['PATCH'])
def request_changes(request, teacher_id):
    teacher = get_object_or_404(Teacher, id=teacher_id)

    teacher.remarks = request.data.get("message", "")
    teacher.save()

    return Response({"message": "Change request sent"})


# =========================
# TEACHER DETAIL API
# =========================
@api_view(['GET'])
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
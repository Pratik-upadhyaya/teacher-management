from django.shortcuts import get_object_or_404
from django.http import FileResponse
from django.utils import timezone
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from .models import School
from .serializers import SchoolSerializer
from .report_export import build_school_report
from accounts.permissions import IsAdminOrSubAdmin
from teachers.models import Teacher


# Raw wizard field names (as sent by both the principal portal and any
# admin-side manual entry) mapped to the actual School model fields.
# Shared by my_school (create/edit) and the admin manual-add path below,
# so the mapping only lives in one place.
def _map_school_payload(data):
    return {
        "emis_code": data.get("emis_code"),
        "school_name": data.get("school_name"),
        "address": data.get("address"),
        "contact": data.get("contact"),
        "email": data.get("email"),
        "established_bs": data.get("established_date"),
        "permission_date_bs": data.get("permission_date"),

        # Step 2
        "bal_kaksha": data.get("bal_kaksha_year"),
        "primary_1_5": data.get("primary_1_5_year"),
        "lower_secondary_6_8": data.get("lower_sec_6_8_year"),
        "secondary_9_10": data.get("secondary_9_10_year"),
        "secondary_11_12": data.get("secondary_11_12_year"),

        # Step 3
        "computer_lab": data.get("computer_lab") == "true",
        "science_lab": data.get("science_lab") == "true",
        "library": data.get("library") == "true",
        "book_corner": data.get("book_corner") == "true",
        "playground": data.get("playground") == "true",

        "land_area": data.get("land_area") or 0,
        "land_unit": data.get("land_unit"),
        "building_count": data.get("num_buildings") or 0,
        "classroom_count": data.get("num_classrooms") or 0,
        "female_toilets": data.get("toilet_female") or 0,
        "male_toilets": data.get("toilet_male") or 0,
    }


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def school_list_create(request):
    # GET: any authenticated user may view schools (reviewer queue +
    # general lookups e.g. transfer forms). Pass ?status=pending/approved/
    # rejected to filter; defaults to all.
    #
    # POST: manual school entry by an admin/sub-admin only. A principal
    # submitting their own school now goes through my_school below instead,
    # which ties the submission to their account and puts it through the
    # same review flow as everything else here.
    if request.method == 'GET':
        schools = School.objects.all()
        status_param = request.GET.get('status')
        if status_param:
            schools = schools.filter(status=status_param)
        serializer = SchoolSerializer(schools, many=True)
        return Response(serializer.data)

    if request.method == 'POST':
        if not IsAdminOrSubAdmin().has_permission(request, None):
            return Response({"error": "Only admins or sub-admins can add schools here."}, status=403)

        mapped_data = _map_school_payload(request.data)
        serializer = SchoolSerializer(data=mapped_data)

        if serializer.is_valid():
            # Manually-entered schools are pre-approved -- an admin typing
            # this in themselves doesn't need to review their own entry.
            serializer.save(status='approved', reviewed_by=request.user, reviewed_at=timezone.now())
            return Response(serializer.data, status=201)

        return Response(serializer.errors, status=400)


# =========================
# PRINCIPAL-FACING: view / submit / edit own school
# =========================
@api_view(['GET', 'POST', 'PATCH'])
@permission_classes([IsAuthenticated])
def my_school(request):
    """GET: this principal's own school submission (or null if none yet).
    POST: first-time submission. PATCH: edit/resubmit at any time -- every
    edit puts the school back to 'pending' so it goes through review again,
    the same way a teacher's application is reviewed."""
    if getattr(request.user, "role", None) != "principal":
        return Response({"error": "Only principal accounts have a school profile."}, status=403)

    school = School.objects.filter(principal=request.user).first()

    if request.method == 'GET':
        if not school:
            return Response({"error": "No school submission found."}, status=404)
        return Response(SchoolSerializer(school).data)

    mapped_data = _map_school_payload(request.data)

    if request.method == 'POST':
        if school:
            return Response(
                {"error": "You have already submitted a school. Edit your existing submission instead."},
                status=400,
            )
        serializer = SchoolSerializer(data=mapped_data)
        if serializer.is_valid():
            new_school = serializer.save(principal=request.user, status='pending')
            return Response(SchoolSerializer(new_school).data, status=201)
        return Response(serializer.errors, status=400)

    if request.method == 'PATCH':
        if not school:
            return Response({"error": "No school submission found to edit. Submit one first."}, status=404)
        serializer = SchoolSerializer(school, data=mapped_data, partial=True)
        if serializer.is_valid():
            updated = serializer.save(status='pending', reviewed_by=None, reviewed_at=None, remarks='')
            return Response(SchoolSerializer(updated).data)
        return Response(serializer.errors, status=400)


# =========================
# REVIEWER-FACING (admin / sub-admin only -- see IsAdminOrSubAdmin)
# =========================
@api_view(['PATCH'])
@permission_classes([IsAuthenticated, IsAdminOrSubAdmin])
def approve_school(request, school_id):
    school = get_object_or_404(School, id=school_id)

    if school.status == 'approved':
        return Response({"error": "This school is already approved."}, status=400)

    school.status = 'approved'
    school.reviewed_by = request.user
    school.reviewed_at = timezone.now()
    school.remarks = ''
    school.save()

    return Response(SchoolSerializer(school).data)


@api_view(['PATCH'])
@permission_classes([IsAuthenticated, IsAdminOrSubAdmin])
def reject_school(request, school_id):
    school = get_object_or_404(School, id=school_id)

    message = (request.data.get("message") or "").strip()
    if not message:
        return Response({"error": "A rejection reason is required."}, status=400)

    school.status = 'rejected'
    school.remarks = message
    school.reviewed_by = request.user
    school.reviewed_at = timezone.now()
    school.save()

    return Response(SchoolSerializer(school).data)


@api_view(['GET'])
@permission_classes([IsAuthenticated, IsAdminOrSubAdmin])
def export_school_report(request, school_id):
    """Individual per-school report, filling the official government
    template with this school's info and its approved teacher roster --
    the same format as the bulk Excel export, but one school per file."""
    school = get_object_or_404(School, id=school_id)
    teachers = Teacher.objects.filter(school=school, status='approved').order_by('id')

    buffer = build_school_report(school, teachers)

    safe_name = "".join(c if c.isalnum() else "_" for c in school.school_name).strip("_") or "school"
    filename = f"{safe_name}_{school.emis_code}.xlsx"

    response = FileResponse(
        buffer,
        content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    )
    response["Content-Disposition"] = f'attachment; filename="{filename}"'
    return response
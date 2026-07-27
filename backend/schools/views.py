from django.db.models import Q
from django.shortcuts import get_object_or_404
from django.http import FileResponse
from django.utils import timezone
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from .models import School, PublicSchoolReference
from .serializers import SchoolSerializer, PublicSchoolReferenceSerializer
from .report_export import build_school_report
from accounts.permissions import IsAdminOrSubAdmin
from teachers.models import Teacher


# Combines the structured district/municipality/ward_no picker (mirroring
# the one teachers use, see lib/districts.tsx) into a single display string
# for the address field, so existing consumers (admin Schools table, bulk
# Excel export, report_export.py's A3 cell) keep working without changes.
def _build_address(district, municipality, ward_no):
    parts = []
    if municipality:
        parts.append(f"{municipality}-{ward_no}" if ward_no else municipality)
    elif ward_no:
        parts.append(f"Ward {ward_no}")
    if district:
        parts.append(district)
    return ", ".join(parts)


# Raw wizard field names (as sent by both the principal portal and any
# admin-side manual entry) mapped to the actual School model fields.
# Shared by my_school (create/edit) and the admin manual-add path below,
# so the mapping only lives in one place.
def _map_school_payload(data):
    district = data.get("district")
    municipality = data.get("municipality")
    ward_no = data.get("ward_no")

    return {
        "emis_code": data.get("emis_code"),
        "school_name": data.get("school_name"),
        "district": district,
        "municipality": municipality,
        "ward_no": ward_no,
        "address": _build_address(district, municipality, ward_no),
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

        # Land area -- one of three Nepal-specific measurement systems,
        # see School.LAND_SYSTEM_CHOICES. Only the fields matching
        # land_unit_system carry meaning; the rest are sent as 0.
        "land_unit_system": data.get("land_unit_system"),
        "land_sqm": data.get("land_sqm") or 0,
        "land_ropani": data.get("land_ropani") or 0,
        "land_aana": data.get("land_aana") or 0,
        "land_paisa": data.get("land_paisa") or 0,
        "land_daan": data.get("land_daan") or 0,
        "land_bigha": data.get("land_bigha") or 0,
        "land_kattha": data.get("land_kattha") or 0,
        "land_dhur": data.get("land_dhur") or 0,

        "building_count": data.get("num_buildings") or 0,
        "classroom_count": data.get("num_classrooms") or 0,
        "female_toilets": data.get("toilet_female") or 0,
        "male_toilets": data.get("toilet_male") or 0,

        # Step 4: Teacher Count (दरबन्दी) -- see School model comment.
        "pre_primary_permanent": data.get("pre_primary_permanent") or 0,
        "pre_primary_contract": data.get("pre_primary_contract") or 0,
        "pre_primary_grant": data.get("pre_primary_grant") or 0,
        "pre_primary_shi_anudan": data.get("pre_primary_shi_anudan") or 0,
        "pre_primary_private": data.get("pre_primary_private") or 0,
        "pre_primary_relief": data.get("pre_primary_relief") or 0,

        "primary_permanent": data.get("primary_permanent") or 0,
        "primary_contract": data.get("primary_contract") or 0,
        "primary_grant": data.get("primary_grant") or 0,
        "primary_shi_anudan": data.get("primary_shi_anudan") or 0,
        "primary_private": data.get("primary_private") or 0,
        "primary_relief": data.get("primary_relief") or 0,

        "lower_sec_permanent": data.get("lower_sec_permanent") or 0,
        "lower_sec_contract": data.get("lower_sec_contract") or 0,
        "lower_sec_grant": data.get("lower_sec_grant") or 0,
        "lower_sec_shi_anudan": data.get("lower_sec_shi_anudan") or 0,
        "lower_sec_private": data.get("lower_sec_private") or 0,
        "lower_sec_relief": data.get("lower_sec_relief") or 0,

        "secondary_9_10_permanent": data.get("secondary_9_10_permanent") or 0,
        "secondary_9_10_contract": data.get("secondary_9_10_contract") or 0,
        "secondary_9_10_grant": data.get("secondary_9_10_grant") or 0,
        "secondary_9_10_shi_anudan": data.get("secondary_9_10_shi_anudan") or 0,
        "secondary_9_10_private": data.get("secondary_9_10_private") or 0,
        "secondary_9_10_relief": data.get("secondary_9_10_relief") or 0,

        "secondary_11_12_permanent": data.get("secondary_11_12_permanent") or 0,
        "secondary_11_12_contract": data.get("secondary_11_12_contract") or 0,
        "secondary_11_12_grant": data.get("secondary_11_12_grant") or 0,
        "secondary_11_12_shi_anudan": data.get("secondary_11_12_shi_anudan") or 0,
        "secondary_11_12_private": data.get("secondary_11_12_private") or 0,
        "secondary_11_12_relief": data.get("secondary_11_12_relief") or 0,
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
# EMIS CODE REFERENCE / AUTOCOMPLETE
# =========================
@api_view(['GET'])
@permission_classes([AllowAny])
def public_school_reference(request):
    """Lookup against the government-registered Public-school list (Kaski
    district, see schools/migrations/0005_seed_public_school_reference.py)
    for the EMIS Code autocomplete on the school (principal) and teacher
    registration forms.

    AllowAny -- teacher registration (app/register/page.tsx) is itself an
    unauthenticated public sign-up flow, so this lookup has to be reachable
    the same way. Only exposes non-sensitive, already-public government
    data (school name/EMIS/address), same as the source spreadsheet.

    ?q= matches against school name or EMIS code (case-insensitive,
    partial). No query -> empty list, to avoid shipping the full 348-row
    table on page load. Results capped at 15, which is a suggestions list
    hint, not a validation gate -- an unmatched code is not an error, since
    Private/Religious schools and schools outside Kaski legitimately won't
    appear here.
    """
    q = (request.GET.get('q') or '').strip()
    if not q:
        return Response([])

    matches = PublicSchoolReference.objects.filter(
        Q(school_name__icontains=q) | Q(emis_code__icontains=q)
    )[:15]
    return Response(PublicSchoolReferenceSerializer(matches, many=True).data)


# =========================
# PRINCIPAL-FACING: view / submit / edit own school
# =========================
@api_view(['GET', 'POST', 'PATCH'])
@permission_classes([IsAuthenticated])
def my_school(request):
    """GET: this account's own school submission (or null if none yet).
    POST: first-time submission. PATCH: edit/resubmit at any time -- every
    edit puts the school back to 'pending' so it goes through review again,
    the same way a teacher's application is reviewed.

    Open to any teacher account (role 'teacher' or 'principal'), not just
    accounts explicitly designated 'principal' -- any teacher at a school
    may be the one filling this out, and it's approved by an admin/sub-admin
    either way (see IsAdminOrSubAdmin below). Admin/sub-admin accounts are
    excluded since they aren't attached to a single school and already have
    the separate manual-add path in school_list_create.
    """
    if getattr(request.user, "role", None) not in ("teacher", "principal"):
        return Response(
            {"error": "Only teacher or principal accounts can submit school information."},
            status=403,
        )

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
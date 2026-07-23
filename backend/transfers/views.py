from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from accounts.permissions import IsAdminOrPrincipal
from documents.file_processing import DocumentValidationError, process_document_upload
from schools.models import School
from teachers.models import Teacher
from .models import TeacherTransferRequest
from .serializers import TeacherTransferRequestSerializer

# Fields the applicant must fill in about the destination school. EMIS code
# is required (not just recommended) since it's the primary way this
# request gets soft-linked to a real School record, matching how
# registration treats schoolEmisCode.
REQUIRED_NEW_SCHOOL_FIELDS = (
    "new_school_name", "new_school_emis_code", "new_district", "new_municipality", "new_ward_no",
)


def _teacher_for(request):
    return Teacher.objects.filter(email=request.user.email).first()


# =========================
# TEACHER-FACING: submit / view own requests
# =========================
@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def my_transfer_requests(request):
    """GET: list this teacher's own transfer requests (any status).
    POST (multipart: new_school_name, new_school_emis_code,
    new_school_address, new_district, new_municipality, new_ward_no,
    reason, transfer_document): submit a request to move to a new school.
    Never touches the live Teacher school/district/municipality/wardNo
    fields -- that only happens once approved (see approve_transfer_request
    below)."""
    teacher = _teacher_for(request)
    if not teacher:
        return Response({"error": "No teacher profile linked to this account."}, status=404)

    if request.method == 'GET':
        return Response(
            TeacherTransferRequestSerializer(teacher.transfer_requests.all(), many=True).data
        )

    # Only one open transfer request at a time -- a second application
    # while one is already pending would leave a reviewer looking at two
    # conflicting destinations for the same teacher. Unlike document change
    # requests (which replace the pending upload per-slot), a transfer is a
    # single ongoing process, so this blocks outright rather than silently
    # overwriting the earlier request.
    if teacher.transfer_requests.filter(status='pending').exists():
        return Response(
            {"error": "You already have a pending transfer request. Please wait for it to be reviewed before submitting another."},
            status=400,
        )

    missing = [f for f in REQUIRED_NEW_SCHOOL_FIELDS if not (request.data.get(f) or "").strip()]
    if missing:
        return Response({"error": "Please fill in all of the new school's details."}, status=400)

    file_obj = request.FILES.get('transfer_document')
    if not file_obj:
        return Response({"error": "A transfer document is required."}, status=400)

    try:
        processed_file = process_document_upload(file_obj)
    except DocumentValidationError as e:
        return Response({"error": str(e)}, status=400)

    new_emis = (request.data.get("new_school_emis_code") or "").strip()
    matched_school = School.objects.filter(emis_code=new_emis).first() if new_emis else None

    transfer_request = TeacherTransferRequest.objects.create(
        teacher=teacher,
        # Snapshot of the CURRENT record -- not client input.
        old_school_name=teacher.schoolName or "",
        old_school_emis_code=teacher.schoolEmisCode or "",
        old_district=teacher.district or "",
        old_municipality=teacher.municipality or "",
        old_ward_no=teacher.wardNo or "",
        new_school_name=(request.data.get("new_school_name") or "").strip(),
        new_school_emis_code=new_emis,
        new_school_address=(request.data.get("new_school_address") or "").strip(),
        new_district=(request.data.get("new_district") or "").strip(),
        new_municipality=(request.data.get("new_municipality") or "").strip(),
        new_ward_no=(request.data.get("new_ward_no") or "").strip(),
        new_school=matched_school,
        transfer_document=processed_file,
        reason=(request.data.get("reason") or "").strip(),
    )
    return Response(TeacherTransferRequestSerializer(transfer_request).data, status=201)


# =========================
# REVIEWER-FACING (admin / sub-admin / principal)
# =========================
@api_view(['GET'])
@permission_classes([IsAuthenticated, IsAdminOrPrincipal])
def transfer_request_list(request):
    """Review queue. Defaults to pending only; pass ?status=all (or
    approved/rejected) to see everything else."""
    status_param = request.GET.get('status', 'pending')
    qs = TeacherTransferRequest.objects.select_related('teacher', 'reviewed_by', 'new_school')
    if status_param != 'all':
        qs = qs.filter(status=status_param)
    return Response(TeacherTransferRequestSerializer(qs, many=True).data)


@api_view(['PATCH'])
@permission_classes([IsAuthenticated, IsAdminOrPrincipal])
def approve_transfer_request(request, request_id):
    transfer_request = get_object_or_404(TeacherTransferRequest, id=request_id)

    if transfer_request.status != 'pending':
        return Response({"error": "This request has already been reviewed."}, status=400)

    # Move the teacher's live school/location fields over now, on approval
    # -- exactly mirroring how document approval copies the staged file
    # onto the live Teacher document field.
    teacher = transfer_request.teacher
    teacher.schoolName = transfer_request.new_school_name
    teacher.schoolEmisCode = transfer_request.new_school_emis_code
    teacher.district = transfer_request.new_district
    teacher.municipality = transfer_request.new_municipality
    teacher.wardNo = transfer_request.new_ward_no
    # Re-resolve the soft-link at approval time (not just re-using whatever
    # was resolved at submission time) in case a matching School record has
    # since been added to the system.
    teacher.school = transfer_request.new_school or School.objects.filter(
        emis_code=transfer_request.new_school_emis_code
    ).first()
    teacher.save(update_fields=[
        "schoolName", "schoolEmisCode", "district", "municipality", "wardNo", "school",
    ])

    transfer_request.status = 'approved'
    transfer_request.reviewed_by = request.user
    transfer_request.reviewed_at = timezone.now()
    transfer_request.save()

    return Response(TeacherTransferRequestSerializer(transfer_request).data)


@api_view(['PATCH'])
@permission_classes([IsAuthenticated, IsAdminOrPrincipal])
def reject_transfer_request(request, request_id):
    transfer_request = get_object_or_404(TeacherTransferRequest, id=request_id)

    if transfer_request.status != 'pending':
        return Response({"error": "This request has already been reviewed."}, status=400)

    message = (request.data.get('message') or '').strip()
    if not message:
        return Response({"error": "A rejection reason is required."}, status=400)

    transfer_request.status = 'rejected'
    transfer_request.review_note = message
    transfer_request.reviewed_by = request.user
    transfer_request.reviewed_at = timezone.now()
    transfer_request.save()

    return Response(TeacherTransferRequestSerializer(transfer_request).data)
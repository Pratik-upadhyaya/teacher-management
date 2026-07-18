import os

from django.conf import settings
from django.core.files.base import ContentFile
from django.http import FileResponse, Http404
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from accounts.permissions import IsAdminOrPrincipal
from leaves.models import LeaveApplication
from teachers.models import Teacher
from .file_processing import DocumentValidationError, process_document_upload
from .models import DocumentChangeRequest
from .serializers import DocumentChangeRequestSerializer

VALID_DOCUMENT_TYPES = {choice[0] for choice in DocumentChangeRequest.DOCUMENT_TYPE_CHOICES}

# Teacher fields that hold a *live* (approved) document -- checked against
# in serve_document below so a teacher can view their own approved file.
TEACHER_DOCUMENT_FIELDS = (
    "citizenship", "degree", "transcript", "teachingLicense", "appointmentLetter",
)


def _teacher_for(request):
    return Teacher.objects.filter(email=request.user.email).first()


# =========================
# TEACHER-FACING: submit / view own requests
# =========================
@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def my_document_requests(request):
    """GET: list this teacher's own change requests (any status).
    POST (multipart: document_type, file): submit a new document for
    review. Never touches the live Teacher document field -- that only
    happens on admin/sub-admin approval."""
    teacher = _teacher_for(request)
    if not teacher:
        return Response({"error": "No teacher profile linked to this account."}, status=404)

    if request.method == 'GET':
        return Response(
            DocumentChangeRequestSerializer(teacher.document_requests.all(), many=True).data
        )

    document_type = request.data.get('document_type')
    file_obj = request.FILES.get('file')

    if document_type not in VALID_DOCUMENT_TYPES:
        return Response({"error": "Invalid or missing document_type."}, status=400)
    if not file_obj:
        return Response({"error": "No file provided."}, status=400)

    try:
        processed_file = process_document_upload(file_obj)
    except DocumentValidationError as e:
        return Response({"error": str(e)}, status=400)

    # Only one pending request per document slot at a time -- resubmitting
    # replaces the pending upload rather than stacking duplicates, so
    # reviewers never see two open requests for the same document.
    existing = teacher.document_requests.filter(
        document_type=document_type, status='pending'
    ).first()
    if existing:
        existing.file = processed_file
        existing.requested_at = timezone.now()
        existing.save()
        return Response(DocumentChangeRequestSerializer(existing).data, status=200)

    change_request = DocumentChangeRequest.objects.create(
        teacher=teacher,
        document_type=document_type,
        file=processed_file,
    )
    return Response(DocumentChangeRequestSerializer(change_request).data, status=201)


# =========================
# REVIEWER-FACING (admin / sub-admin / principal)
# =========================
@api_view(['GET'])
@permission_classes([IsAuthenticated, IsAdminOrPrincipal])
def document_request_list(request):
    """Review queue. Defaults to pending only; pass ?status=all (or
    approved/rejected) to see everything else."""
    status_param = request.GET.get('status', 'pending')
    qs = DocumentChangeRequest.objects.select_related('teacher', 'reviewed_by')
    if status_param != 'all':
        qs = qs.filter(status=status_param)
    return Response(DocumentChangeRequestSerializer(qs, many=True).data)


@api_view(['PATCH'])
@permission_classes([IsAuthenticated, IsAdminOrPrincipal])
def approve_document_request(request, request_id):
    change_request = get_object_or_404(DocumentChangeRequest, id=request_id)

    if change_request.status != 'pending':
        return Response({"error": "This request has already been reviewed."}, status=400)

    # Copy the staged file into the teacher's live document field. Using
    # .save() here (rather than pointing the field at the same stored
    # file) gives the teacher's document its own proper 'documents/' copy,
    # while document_requests/<file> stays behind as the original
    # submission record.
    change_request.file.open('rb')
    content = change_request.file.read()
    change_request.file.close()
    original_name = change_request.file.name.rsplit('/', 1)[-1]

    document_field = getattr(change_request.teacher, change_request.document_type)
    document_field.save(original_name, ContentFile(content), save=False)
    change_request.teacher.save()

    change_request.status = 'approved'
    change_request.reviewed_by = request.user
    change_request.reviewed_at = timezone.now()
    change_request.save()

    return Response(DocumentChangeRequestSerializer(change_request).data)


@api_view(['PATCH'])
@permission_classes([IsAuthenticated, IsAdminOrPrincipal])
def reject_document_request(request, request_id):
    change_request = get_object_or_404(DocumentChangeRequest, id=request_id)

    if change_request.status != 'pending':
        return Response({"error": "This request has already been reviewed."}, status=400)

    message = (request.data.get('message') or '').strip()
    if not message:
        return Response({"error": "A rejection reason is required."}, status=400)

    change_request.status = 'rejected'
    change_request.review_note = message
    change_request.reviewed_by = request.user
    change_request.reviewed_at = timezone.now()
    change_request.save()

    return Response(DocumentChangeRequestSerializer(change_request).data)


# =========================
# AUTHENTICATED MEDIA SERVING
# =========================
# Uploaded documents (citizenship, degree certs, etc.) must never be
# reachable by an unauthenticated request or by an unrelated teacher --
# these are real government ID documents. This view replaces Django's bare
# static()-served MEDIA_URL (which had no auth check at all) with one that
# checks: reviewers (admin/principal/sub-admin) can view any document;
# a teacher can only view a document that is actually theirs, whether
# still pending review (document_requests/...) or already approved onto
# their live record (documents/...). Everyone else gets 403/404.
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def serve_document(request, path):
    user = request.user
    is_reviewer = getattr(user, "role", None) in ("admin", "principal", "sub-admin")

    owner_teacher = None

    change_request = DocumentChangeRequest.objects.filter(file=path).select_related("teacher").first()
    leave_application = LeaveApplication.objects.filter(document=path).select_related("teacher").first()
    if change_request:
        owner_teacher = change_request.teacher
    elif leave_application:
        owner_teacher = leave_application.teacher
    else:
        for field_name in TEACHER_DOCUMENT_FIELDS:
            match = Teacher.objects.filter(**{field_name: path}).first()
            if match:
                owner_teacher = match
                break

    if owner_teacher is None:
        # Not a path any known document record points to -- nothing to serve,
        # regardless of who's asking.
        raise Http404

    is_owner = owner_teacher.email == user.email

    if not (is_reviewer or is_owner):
        return Response({"error": "You do not have permission to view this file."}, status=403)

    # Resolve to an absolute path and confirm it's still inside MEDIA_ROOT --
    # defense-in-depth against path traversal, even though the matches above
    # already constrain `path` to values actually stored on a model.
    media_root = os.path.abspath(settings.MEDIA_ROOT)
    full_path = os.path.abspath(os.path.join(media_root, path))
    if not full_path.startswith(media_root + os.sep) or not os.path.isfile(full_path):
        raise Http404

    return FileResponse(open(full_path, "rb"))
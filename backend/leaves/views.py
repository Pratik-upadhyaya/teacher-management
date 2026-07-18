from datetime import date

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from documents.file_processing import DocumentValidationError, process_document_upload
from teachers.models import Teacher
from .models import LeaveApplication, LeaveType
from .serializers import LeaveApplicationSerializer, LeaveTypeSerializer

# Keep in sync with teachers/views.py's registration-time computation of
# Teacher.extraordinaryLeaveRemaining.
EXTRAORDINARY_LEAVE_CAP_DAYS = 1095


def _teacher_for(request):
    return Teacher.objects.filter(email=request.user.email).first()


def _parse_date(value, field_label):
    """Parses an ISO 'YYYY-MM-DD' string. Raises ValueError with a
    user-facing message on anything else."""
    try:
        return date.fromisoformat(value)
    except (TypeError, ValueError):
        raise ValueError(f"{field_label} must be a valid date (YYYY-MM-DD).")


# =========================
# TEACHER-FACING
# =========================
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def leave_type_list(request):
    """Active leave categories a teacher can apply against, e.g. Sick
    Leave, Home Leave -- each with its annual day quota."""
    types = LeaveType.objects.filter(is_active=True)
    return Response(LeaveTypeSerializer(types, many=True).data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def my_leave_summary(request):
    """Per leave-type quota usage for the requesting teacher, for a given
    calendar year (?year=2026, defaults to the current year). Used to show
    'X of Y days used' on the Holidays page before/while applying."""
    teacher = _teacher_for(request)
    if not teacher:
        return Response({"error": "No teacher profile linked to this account."}, status=404)

    try:
        year = int(request.GET.get('year', date.today().year))
    except ValueError:
        return Response({"error": "Invalid year."}, status=400)

    summary = []
    for leave_type in LeaveType.objects.filter(is_active=True):
        if leave_type.is_lifetime:
            # Career-long types (currently just Extraordinary Leave): the
            # quota does NOT reset every year, so app-tracked usage is
            # summed across every year. "used" also folds in whatever the
            # teacher had already taken *before* registering into this
            # system -- derived from their registration-time
            # extraordinaryLeaveRemaining (see teachers/views.py) -- so the
            # figure shown is their real career total, not just what's
            # been logged through this app since.
            app_used = sum(
                leave_type.applications.filter(teacher=teacher).values_list('days_count', flat=True)
            )
            if leave_type.name == "Extraordinary Leave":
                pre_registration_used = EXTRAORDINARY_LEAVE_CAP_DAYS - teacher.extraordinaryLeaveRemaining
                used = pre_registration_used + app_used
                remaining = max(teacher.extraordinaryLeaveRemaining - app_used, 0)
            else:
                used = app_used
                remaining = max(leave_type.annual_quota_days - app_used, 0)
        else:
            used = sum(
                leave_type.applications.filter(teacher=teacher, year=year).values_list('days_count', flat=True)
            )
            remaining = max(leave_type.annual_quota_days - used, 0)

        summary.append({
            "leave_type": LeaveTypeSerializer(leave_type).data,
            "used_days": used,
            "remaining_days": remaining,
            "year": year,
        })
    return Response(summary)


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def my_leave_applications(request):
    """GET: this teacher's own leave history (optionally ?year=2026).
    POST (multipart: leave_type, start_date, end_date, reason, document):
    self-report a leave already taken. The uploaded document (ward-stamped
    proof) is required and is the approval itself -- there's no further
    in-app review step, matching how this was scoped."""
    teacher = _teacher_for(request)
    if not teacher:
        return Response({"error": "No teacher profile linked to this account."}, status=404)

    if request.method == 'GET':
        qs = teacher.leave_applications.select_related('leave_type')
        year_param = request.GET.get('year')
        if year_param:
            try:
                qs = qs.filter(year=int(year_param))
            except ValueError:
                return Response({"error": "Invalid year."}, status=400)
        return Response(LeaveApplicationSerializer(qs, many=True).data)

    # -- POST: create a new leave record --
    leave_type_id = request.data.get('leave_type')
    leave_type = LeaveType.objects.filter(id=leave_type_id, is_active=True).first()
    if not leave_type:
        return Response({"error": "Invalid or missing leave_type."}, status=400)

    try:
        start_date = _parse_date(request.data.get('start_date'), "Start date")
        end_date = _parse_date(request.data.get('end_date'), "End date")
    except ValueError as e:
        return Response({"error": str(e)}, status=400)

    if end_date < start_date:
        return Response({"error": "End date cannot be before start date."}, status=400)

    days_count = (end_date - start_date).days + 1

    file_obj = request.FILES.get('document')
    if not file_obj:
        return Response({"error": "A ward-stamped supporting document is required."}, status=400)
    try:
        processed_file = process_document_upload(file_obj)
    except DocumentValidationError as e:
        return Response({"error": str(e)}, status=400)

    leave = LeaveApplication.objects.create(
        teacher=teacher,
        leave_type=leave_type,
        start_date=start_date,
        end_date=end_date,
        days_count=days_count,
        year=start_date.year,
        reason=(request.data.get('reason') or '').strip(),
        document=processed_file,
    )
    return Response(LeaveApplicationSerializer(leave).data, status=201)
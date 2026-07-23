from django.db import models
from django.conf import settings


class TeacherTransferRequest(models.Model):
    """A teacher's request to transfer from their current school to a new
    one, with a supporting transfer document (e.g. the official transfer
    order/letter) attached for verification.

    Like documents.DocumentChangeRequest, submitting this never touches the
    live Teacher record directly -- that only happens once an admin,
    sub-admin, or principal approves the request (see
    approve_transfer_request in views.py). This keeps a full history of
    every transfer a teacher has gone through, along with who verified it.
    """

    STATUS_CHOICES = (
        ('pending', 'Pending'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
    )

    teacher = models.ForeignKey(
        'teachers.Teacher',
        on_delete=models.CASCADE,
        related_name='transfer_requests',
    )

    # =========================
    # FROM (current school) -- snapshotted server-side from the teacher's
    # live record at the moment the request is submitted, never trusted
    # from client input. This is what lets a reviewer see the actual
    # from -> to change even if the teacher record moves on again before
    # this particular request gets reviewed.
    # =========================
    old_school_name = models.CharField(max_length=255, blank=True, default="")
    old_school_emis_code = models.CharField(max_length=50, blank=True, default="")
    old_district = models.CharField(max_length=100, blank=True, default="")
    old_municipality = models.CharField(max_length=100, blank=True, default="")
    old_ward_no = models.CharField(max_length=10, blank=True, default="")

    # =========================
    # TO (requested new school) -- entered by the teacher applying.
    # =========================
    new_school_name = models.CharField(max_length=255)
    new_school_emis_code = models.CharField(max_length=50)
    new_school_address = models.TextField(blank=True, default="")
    new_district = models.CharField(max_length=100)
    new_municipality = models.CharField(max_length=100)
    new_ward_no = models.CharField(max_length=10)

    # Soft link to an existing School record if new_school_emis_code
    # matches one -- best-effort, mirroring the same registration-time
    # resolution used in teachers/views.py. Nullable/SET_NULL since the
    # destination school may not be in the system yet, or the EMIS code
    # may be mistyped; new_school_name/new_school_emis_code above remain
    # the source of truth for what the applicant actually entered.
    new_school = models.ForeignKey(
        'schools.School',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='incoming_transfer_requests',
    )

    # The official transfer document (order/letter) proving the transfer.
    # Required -- this is the actual evidence a reviewer verifies against,
    # not optional supporting material.
    transfer_document = models.FileField(upload_to='transfer_requests/')

    reason = models.TextField(blank=True, default="")

    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')

    requested_at = models.DateTimeField(auto_now_add=True)
    reviewed_at = models.DateTimeField(null=True, blank=True)
    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='reviewed_transfer_requests',
    )
    # Optional note from the reviewer, e.g. why a request was rejected.
    review_note = models.CharField(max_length=255, blank=True, default="")

    class Meta:
        ordering = ['-requested_at']

    def __str__(self):
        return f"{self.teacher.name}: {self.old_school_name or '—'} -> {self.new_school_name} ({self.status})"
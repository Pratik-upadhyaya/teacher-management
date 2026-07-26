from django.db import models
from django.conf import settings


class DocumentChangeRequest(models.Model):
    """A teacher's request to upload/replace one of their documents.

    Uploading here never touches the live Teacher.<field> directly -- that
    only happens once an admin/sub-admin/principal approves the request
    (see documents.views.approve_document_request). This keeps a full
    history of what was submitted and who reviewed it, instead of teachers
    silently overwriting verified government documents.
    """

    DOCUMENT_TYPE_CHOICES = (
        ('citizenship', 'Citizenship'),
        ('degree', 'Degree Certificate'),
        ('photo', 'Passport Size Photo'),
        ('teachingLicense', 'Teaching License'),
        ('appointmentLetter', 'Appointment Letter'),
    )

    STATUS_CHOICES = (
        ('pending', 'Pending'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
    )

    teacher = models.ForeignKey(
        'teachers.Teacher',
        on_delete=models.CASCADE,
        related_name='document_requests',
    )
    document_type = models.CharField(max_length=30, choices=DOCUMENT_TYPE_CHOICES)

    # The newly uploaded file, staged here until reviewed. Kept even after
    # approval/rejection as a record of what was submitted.
    file = models.FileField(upload_to='document_requests/')

    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')

    requested_at = models.DateTimeField(auto_now_add=True)
    reviewed_at = models.DateTimeField(null=True, blank=True)
    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='reviewed_document_requests',
    )
    # Optional note from the reviewer, e.g. why a request was rejected.
    review_note = models.CharField(max_length=255, blank=True)

    class Meta:
        ordering = ['-requested_at']

    def __str__(self):
        return f"{self.teacher.name} - {self.document_type} ({self.status})"


class TeacherTransferDocument(models.Model):
    """One of up to 10 old-school transfer documents a Permanent teacher
    submits at registration (client requirement: Permanent teachers may
    have served at multiple prior schools, so a single transfer-letter
    field isn't enough). Uploaded directly at registration time -- unlike
    DocumentChangeRequest, there's no approve/reject step here, since these
    are historical records rather than a live document being replaced.
    """

    teacher = models.ForeignKey(
        'teachers.Teacher',
        on_delete=models.CASCADE,
        related_name='transfer_documents',
    )
    file = models.FileField(upload_to='transfer_documents/')
    uploaded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['uploaded_at']

    def __str__(self):
        return f"{self.teacher.name} - transfer doc ({self.uploaded_at:%Y-%m-%d})"
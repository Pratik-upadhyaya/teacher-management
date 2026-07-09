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
        ('transcript', 'Transcript'),
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
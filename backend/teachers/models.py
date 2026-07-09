from django.db import models
from django.conf import settings


class Teacher(models.Model):
    # =========================
    # STEP 1: PERSONAL INFO
    # =========================
    name = models.CharField(max_length=255)
    fatherName = models.CharField(max_length=255)
    permanentAddress = models.TextField()
    permanentWardNo = models.CharField(max_length=10)
    dob = models.CharField(max_length=20)
    phone = models.CharField(max_length=20)
    email = models.EmailField(unique=True)
    password = models.CharField(max_length=255)

    # =========================
    # STEP 2: SCHOOL INFO
    # =========================
    district = models.CharField(max_length=100, blank=True, null=True)
    municipality = models.CharField(max_length=100, blank=True, null=True)
    wardNo = models.CharField(max_length=10, blank=True, null=True)
    schoolName = models.CharField(max_length=255, blank=True, null=True)
    tokenNo = models.CharField(max_length=100, blank=True, null=True)
    subject = models.CharField(max_length=100, blank=True, null=True)
    level = models.CharField(max_length=100, blank=True, null=True)
    grade = models.CharField(max_length=100, blank=True, null=True)
    teacherType = models.CharField(max_length=100, blank=True, null=True)

    # =========================
    # STEP 3: SERVICE INFO
    # =========================
    appointmentDate = models.CharField(max_length=20, blank=True, null=True)
    promotionDate = models.CharField(max_length=20, blank=True, null=True)
    qualification = models.CharField(max_length=100, blank=True, null=True)
    extraordinaryLeave = models.CharField(max_length=20, blank=True, null=True)
    accumulatedLeave = models.CharField(max_length=20, blank=True, null=True)
    ageSixtyYear = models.CharField(max_length=20, blank=True, null=True)
    remarks = models.TextField(blank=True, null=True)

    # =========================
    # STEP 4: DOCUMENT UPLOADS
    # REAL FILES SAVED IN /media/documents/
    # =========================
    citizenship = models.FileField(
        upload_to='documents/',
        blank=True,
        null=True
    )

    degree = models.FileField(
        upload_to='documents/',
        blank=True,
        null=True
    )

    transcript = models.FileField(
        upload_to='documents/',
        blank=True,
        null=True
    )

    teachingLicense = models.FileField(
        upload_to='documents/',
        blank=True,
        null=True
    )

    appointmentLetter = models.FileField(
        upload_to='documents/',
        blank=True,
        null=True
    )

    # =========================
    # ADMIN STATUS
    # =========================
    status = models.CharField(
        max_length=20,
        default="pending",
        choices=[
            ("pending", "Pending"),
            ("approved", "Approved"),
            ("rejected", "Rejected"),
        ],
    )

    # =========================
    # CREATED TIME
    # =========================
    created_at = models.DateTimeField(auto_now_add=True)

    # Who last approved/rejected/requested changes on this application.
    # Nullable + SET_NULL so removing a sub-admin account later doesn't
    # delete the teacher records they reviewed -- just clears the credit.
    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='reviewed_teachers',
    )

    # =========================
    # STRING DISPLAY
    # =========================
    def __str__(self):
        return self.name
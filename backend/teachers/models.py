from django.db import models
from django.conf import settings


class Teacher(models.Model):
    # =========================
    # STEP 1: PERSONAL INFO
    # =========================
    name = models.CharField(max_length=255)

    # English/Latin-script version of `name`, entered as a plain text
    # field (not run through the NepaliInput transliteration widget,
    # which only ever commits Devanagari and discards the raw English
    # keystrokes). Exists specifically so the bilingual OTP email's
    # English paragraph can address the applicant by an actual English
    # name rather than a lossy reverse-transliteration guess.
    nameEnglish = models.CharField(max_length=255, blank=True, default="")

    fatherName = models.CharField(max_length=255)
    permanentAddress = models.TextField()
    permanentWardNo = models.CharField(max_length=10)
    dob = models.CharField(max_length=20)

    # Used to build the Mr./Mrs. salutation on the registration OTP email
    # (see accounts/otp.py's send_email_otp) -- collected in the wizard's
    # Personal step (Step 1) so it's already known by the time the Account
    # step (Step 2) sends the OTP. blank=True/default="" so it degrades
    # gracefully (no salutation) if ever missing.
    GENDER_CHOICES = [
        ("male", "Male / पुरुष"),
        ("female", "Female / महिला"),
        ("other", "Other / अन्य"),
    ]
    gender = models.CharField(max_length=10, choices=GENDER_CHOICES, blank=True, default="")

    # =========================
    # STEP 2: ACCOUNT
    # =========================
    phone = models.CharField(max_length=20)
    email = models.EmailField(unique=True)
    password = models.CharField(max_length=255)

    # =========================
    # STEP 3: SCHOOL INFO
    # =========================
    district = models.CharField(max_length=100, blank=True, null=True)
    municipality = models.CharField(max_length=100, blank=True, null=True)
    wardNo = models.CharField(max_length=10, blank=True, null=True)
    schoolName = models.CharField(max_length=255, blank=True, null=True)
    schoolEmisCode = models.CharField(max_length=50, blank=True, null=True)

    # Soft link to the actual School record, resolved server-side by
    # matching schoolEmisCode against School.emis_code at registration time
    # (see teachers/views.py). Nullable/SET_NULL on purpose -- a teacher
    # can register before their school exists in the system yet, or type
    # an EMIS code that doesn't match anything (typo, unregistered school).
    # schoolName/schoolEmisCode above remain the source of truth for what
    # the applicant actually entered; this FK is a best-effort resolution
    # of that, not a replacement for it.
    school = models.ForeignKey(
        'schools.School',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='teachers',
    )
    tokenNo = models.CharField(max_length=100, blank=True, null=True)
    subject = models.CharField(max_length=100, blank=True, null=True)
    level = models.CharField(max_length=100, blank=True, null=True)

    # Values/labels must stay in sync with GRADE_LABELS in
    # frontend/lib/teacherLabels.ts (that file is the display-label source
    # of truth; this is the validation source of truth). Kept as three
    # named ranks rather than 1/2/3 to match how the wider civil service
    # framework refers to them.
    GRADE_CHOICES = [
        ("first", "First / प्रथम"),
        ("second", "Second / द्वितीय"),
        ("third", "Third / तृतीय"),
    ]
    grade = models.CharField(max_length=100, choices=GRADE_CHOICES, blank=True, null=True)
    teacherType = models.CharField(max_length=100, blank=True, null=True)

    # =========================
    # STEP 4: SERVICE INFO
    # =========================
    appointmentDate = models.CharField(max_length=20, blank=True, null=True)
    promotionDate = models.CharField(max_length=20, blank=True, null=True)
    qualification = models.CharField(max_length=100, blank=True, null=True)
    extraordinaryLeave = models.CharField(max_length=20, blank=True, null=True)
    
    # Remaining balance out of the 1095-day (3-year) career cap on
    # extraordinary leave, computed server-side at registration as
    # max(1095 - extraordinaryLeave, 0) -- see teachers/views.py. Never
    # client-writable (see TeacherSerializer's extra_kwargs). Existing
    # records from before this field existed default to 0 rather than
    # trying to backfill a number from potentially inconsistent old data;
    # an admin can correct individual records via Django admin if needed.
    extraordinaryLeaveRemaining = models.PositiveIntegerField(default=0)
    ageSixtyYear = models.CharField(max_length=20, blank=True, null=True)
    remarks = models.TextField(blank=True, null=True)

    # =========================
    # STEP 5: DOCUMENT UPLOADS
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
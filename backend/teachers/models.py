from django.db import models
from django.db.models import Q
from django.conf import settings
from django.core.exceptions import ValidationError
from .validation import get_teacher_required_field_errors


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

    # English/Latin-script version of `subject`, entered as a plain text
    # field -- same rationale as nameEnglish above: NepaliInput only ever
    # commits Devanagari and discards the raw English keystrokes, so this
    # captures what the teacher actually typed in English.
    subjectEnglish = models.CharField(max_length=100, blank=True, default="")

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
    # For a non-Permanent teacher, or a Permanent teacher who was directly
    # appointed Permanent (never served under a different category first),
    # this is simply their appointment date.
    #
    # For a Permanent teacher who *was* appointed under a different
    # category before becoming Permanent (see
    # wasDifferentTypeBeforePermanent below), this is the date of that
    # ORIGINAL appointment -- the date they became Permanent is recorded
    # separately in permanentAppointmentDate.
    appointmentDate = models.CharField(max_length=20, blank=True, null=True)

    # Only meaningful when teacherType == "permanent". Tri-state
    # (None/True/False) rather than a plain default=False so an
    # unanswered wizard step is distinguishable from an explicit "No" --
    # the registration serializer requires this to be explicitly set for
    # Permanent applicants (see teachers/serializers.py).
    wasDifferentTypeBeforePermanent = models.BooleanField(null=True, blank=True)

    # Only collected/required when wasDifferentTypeBeforePermanent is
    # True -- the date this teacher was made Permanent, distinct from
    # appointmentDate above (their original appointment under whatever
    # category they held before).
    permanentAppointmentDate = models.CharField(max_length=20, blank=True, null=True)

    # Grade-promotion dates (Third -> Second -> First), NOT related to
    # becoming Permanent -- only applicable when teacherType ==
    # "permanent", and only for however many promotions this teacher's
    # current `grade` implies:
    #   grade == "third"  -> neither field applies (still at entry grade)
    #   grade == "second" -> promotionDate required (Third -> Second)
    #   grade == "first"  -> promotionDate AND promotionDate2 required
    #                        (Third -> Second, then Second -> First)
    # Required-ness for both is enforced conditionally in
    # teachers/serializers.py, not at the model level, since it depends
    # on teacherType and grade together.
    promotionDate = models.CharField(max_length=20, blank=True, null=True)
    promotionDate2 = models.CharField(max_length=20, blank=True, null=True)

    # Split into two so a teacher whose entry qualification (e.g. SLC/SEE)
    # differs from what they've since completed (e.g. Master's) can record
    # both -- the two are commonly, but not always, the same value, so the
    # frontend offers a "same as minimum" convenience toggle rather than
    # forcing them apart. Same QUALIFICATION_LABELS choices for both (see
    # lib/teacherLabels.ts).
    minQualification = models.CharField(max_length=100, blank=True, null=True)
    highestQualification = models.CharField(max_length=100, blank=True, null=True)

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

    # Passport size photo -- shown as the teacher's avatar on their own
    # profile page (app/(portal)/profile/page.tsx), not just a document
    # in the Documents list, so it goes through the same upload path as
    # the other 4 document fields but is treated specially on the
    # frontend for display. Was "transcript" (an academic mark-sheet)
    # before this field was repurposed.
    photo = models.FileField(
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

    # Only collected/required when highestQualification differs from
    # minQualification -- `degree` above already covers the case where
    # they're the same (a single certificate proves both). Also plugged
    # into the DocumentChangeRequest re-upload flow like the other
    # document fields (see documents/models.py's DOCUMENT_TYPE_CHOICES
    # and documents/views.py's TEACHER_DOCUMENT_FIELDS).
    highestQualificationDocument = models.FileField(
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
    # DB-LEVEL CONSTRAINTS
    # =========================
    # A second, independent enforcement layer beneath Teacher.clean() and
    # TeacherSerializer.validate() -- these fire on every INSERT/UPDATE
    # regardless of code path (API, Django admin, a future script, a
    # data migration), which neither of those two can guarantee alone.
    #
    # Only fields verified against the actual committed data as having
    # ZERO current violations are constrained here (checked via a
    # one-off audit script against db.sqlite3's 11 real teacher rows --
    # see chat history for the full breakdown). Adding a CheckConstraint
    # for a column that any existing row already violates would make
    # Django's SQLite table-rebuild migration fail outright, since
    # SQLite has no ALTER TABLE ADD CONSTRAINT -- Django works around
    # that by copying every row into a freshly-constrained table.
    #
    # Deliberately NOT constrained here despite being "required" at the
    # application layer, because current data violates them:
    #   - photo: missing on every existing row (predates this field
    #     being repurposed from the old `transcript` field -- nobody's
    #     actual photo was ever backfilled).
    #   - wasDifferentTypeBeforePermanent: unset on all existing
    #     Permanent rows (the question didn't exist before this
    #     feature).
    #   - promotionDate / promotionDate2 (grade-conditional): missing on
    #     a handful of existing Permanent/Grade-First rows for the same
    #     reason.
    # Also deliberately NOT constrained: highestQualificationDocument's
    # "required only if minQualification != highestQualification" rule
    # needs a cross-field F() comparison, which is more fragile as a raw
    # SQL CHECK than it's worth given it's already trivially satisfied
    # by today's data (no row has differing qualifications yet) and
    # already enforced at the application layer.
    #
    # Revisit once the above gaps are backfilled -- these constraints
    # can be widened incrementally without touching the ones already here.
    class Meta:
        constraints = [
            models.CheckConstraint(
                condition=Q(citizenship__isnull=False) & ~Q(citizenship=""),
                name="teacher_citizenship_required",
            ),
            models.CheckConstraint(
                condition=Q(degree__isnull=False) & ~Q(degree=""),
                name="teacher_degree_required",
            ),
            models.CheckConstraint(
                condition=Q(teachingLicense__isnull=False) & ~Q(teachingLicense=""),
                name="teacher_teachingLicense_required",
            ),
            models.CheckConstraint(
                condition=Q(appointmentLetter__isnull=False) & ~Q(appointmentLetter=""),
                name="teacher_appointmentLetter_required",
            ),
            models.CheckConstraint(
                condition=Q(appointmentDate__isnull=False) & ~Q(appointmentDate=""),
                name="teacher_appointmentDate_required",
            ),
            # extraordinaryLeave required only for Permanent teachers.
            models.CheckConstraint(
                condition=~Q(teacherType="permanent")
                | (Q(extraordinaryLeave__isnull=False) & ~Q(extraordinaryLeave="")),
                name="teacher_extraordinaryLeave_required_if_permanent",
            ),
            # permanentAppointmentDate required only when a Permanent
            # teacher indicated they were a different type before.
            models.CheckConstraint(
                condition=~Q(teacherType="permanent")
                | ~Q(wasDifferentTypeBeforePermanent=True)
                | (Q(permanentAppointmentDate__isnull=False) & ~Q(permanentAppointmentDate="")),
                name="teacher_permanentAppointmentDate_required_if_was_different",
            ),
        ]

    # =========================
    # STRING DISPLAY
    # =========================
    def __str__(self):
        return self.name

    # =========================
    # VALIDATION (ModelForm paths only, e.g. Django's built-in /admin/
    # site's "Add Teacher" form -- NOT called automatically by .save(),
    # so this doesn't affect the DRF API path (already enforced
    # separately by TeacherSerializer.validate()) or any other plain
    # .save() caller such as the document-approval flow.
    # =========================
    def clean(self):
        super().clean()
        # Deliberately scoped to brand-new records only (self.pk is
        # None). These required-field rules didn't exist when older
        # Teacher rows were created, and TeacherAdmin's
        # list_editable = ('status', 'extraordinaryLeaveRemaining')
        # depends on being able to save an *existing* row -- e.g.
        # approving a legacy application -- without every one of these
        # fields being backfilled first. Enforcing on edits would
        # silently block reviewing old applications.
        if self.pk is not None:
            return
        errors = get_teacher_required_field_errors(lambda f: getattr(self, f, None))
        if errors:
            raise ValidationError(errors)
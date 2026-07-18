from django.db import models


class LeaveType(models.Model):
    """A category of leave a teacher can apply for (e.g. Sick Leave), with
    an annual day quota. Seeded with the standard categories under Nepal's
    Civil Service Regulations via a data migration; admins can add/adjust
    quotas from the Django admin without a code change.
    """

    name = models.CharField(max_length=100, unique=True)
    name_np = models.CharField(
        max_length=100, blank=True, null=True,
        help_text="Nepali label shown alongside the English name, e.g. बिरामी बिदा.",
    )
    annual_quota_days = models.PositiveIntegerField(
        help_text="Days allowed per calendar year for this leave type (or the lifetime cap, if is_lifetime)."
    )
    is_lifetime = models.BooleanField(
        default=False,
        help_text=(
            "True for career-long leave types (e.g. Extraordinary Leave) whose quota does NOT "
            "reset every year -- annual_quota_days is instead an absolute career cap, and usage "
            "is summed across every year rather than the current one. See leaves/views.py, and "
            "note Extraordinary Leave specifically draws its per-teacher remaining balance from "
            "Teacher.extraordinaryLeaveRemaining rather than this shared annual_quota_days value."
        ),
    )
    is_active = models.BooleanField(
        default=True,
        help_text="Inactive types are hidden from the teacher-facing apply form but kept for historical records.",
    )

    class Meta:
        ordering = ['name']

    def __str__(self):
        return self.name


class LeaveApplication(models.Model):
    """A teacher's self-reported record of leave already taken, backed by
    a ward-stamped supporting document. There is no in-app approval step --
    the ward's stamp on the uploaded document *is* the approval; this model
    just gives the teacher and the school a running record of it. See
    leaves/views.py for the quota-warning behaviour (soft, non-blocking --
    matching the school-EMIS soft-link pattern already used elsewhere in
    this app).
    """

    teacher = models.ForeignKey(
        'teachers.Teacher',
        on_delete=models.CASCADE,
        related_name='leave_applications',
    )
    leave_type = models.ForeignKey(
        LeaveType,
        on_delete=models.PROTECT,  # never silently orphan historical leave records
        related_name='applications',
    )
    start_date = models.DateField()
    end_date = models.DateField()

    # Inclusive day count, computed server-side from start/end at save time
    # (see leaves/views.py) rather than trusted from the client.
    days_count = models.PositiveIntegerField()

    # Which calendar year this leave counts against for quota purposes.
    # Derived from start_date.year at save time -- stored as its own column
    # (rather than queried via start_date__year each time) so summing "days
    # used this year" per teacher/type is a plain indexed filter.
    year = models.PositiveIntegerField()

    reason = models.TextField(blank=True)

    # The ward-stamped proof document. Required -- this is the actual
    # evidence of approval, not optional supporting material.
    document = models.FileField(upload_to='leave_documents/')

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-start_date']

    def __str__(self):
        return f"{self.teacher.name} - {self.leave_type.name} ({self.start_date} to {self.end_date})"
from rest_framework import serializers
from .models import Teacher
from .validation import get_teacher_required_field_errors


class TeacherSerializer(serializers.ModelSerializer):
    # Read-only nested view of the linked School record (if the soft-link
    # in teachers/views.py found a match by EMIS code). Kept separate from
    # schoolName/schoolEmisCode, which stay as whatever the applicant typed.
    school_detail = serializers.SerializerMethodField()

    # "own" / "submitted_by_other" / "not_submitted" -- tells the frontend
    # whether the School Information form still needs to be shown for this
    # account. Deliberately does a *live* lookup by schoolEmisCode rather
    # than trusting the `school` FK (which is only resolved once, at
    # registration time -- see teachers/views.py -- so it stays null
    # forever for a teacher who registered before their school's
    # submission existed). School.emis_code is unique, so at most one
    # School row can ever match.
    school_info_status = serializers.SerializerMethodField()

    class Meta:
        model = Teacher
        fields = '__all__'
        extra_kwargs = {
            # Accepted on write (application submission) but never sent back
            # out in any response -- this was previously leaking every
            # teacher's plaintext password to admins via GET /api/.
            'password': {'write_only': True},
            # Server-resolved only (see teachers/views.py's EMIS-code
            # matching on create) -- must NOT be client-writable, or a
            # teacher could POST an arbitrary `school` id and claim to
            # belong to any school regardless of their entered EMIS code.
            'school': {'read_only': True},
            # Server-computed only at registration (1095 minus the entered
            # extraordinaryLeave value, floored at 0) -- see
            # teachers/views.py. Never client-writable.
            'extraordinaryLeaveRemaining': {'read_only': True},
        }

    def get_school_detail(self, obj):
        if obj.school_id:
            return {
                "id": obj.school.id,
                "school_name": obj.school.school_name,
                "emis_code": obj.school.emis_code,
            }
        return None

    def get_school_info_status(self, obj):
        # Import here (rather than top-level) to avoid a circular import
        # between the teachers and schools apps at module load time.
        from schools.models import School

        emis = (obj.schoolEmisCode or "").strip()
        if not emis:
            return "not_submitted"

        school = School.objects.filter(emis_code=emis).first()
        # A School row can exist with no principal yet -- e.g. an admin's
        # manual entry from the government list (schools/views.py's
        # school_list_create) -- which doesn't count as "submitted".
        if not school or not school.principal_id:
            return "not_submitted"

        request = self.context.get("request")
        user = getattr(request, "user", None) if request else None
        if user is not None and school.principal_id == user.id:
            return "own"
        return "submitted_by_other"

    # Model fields stay blank=True/null=True (so old rows and partial
    # profile-edit PATCHes -- see teachers/views.py's teacher_me, which
    # only ever touches name/phone/permanentAddress -- aren't affected),
    # so "required on a new application" is enforced here instead of at
    # the model/extra_kwargs level. Only runs for a full (non-partial)
    # write, i.e. registration submission -- teacher_me's PATCH always
    # passes partial=True and never includes any of these fields anyway,
    # but this guard makes that explicit rather than incidental.
    def validate(self, attrs):
        if self.partial:
            return attrs

        errors = get_teacher_required_field_errors(attrs.get)
        if errors:
            raise serializers.ValidationError(errors)
        return attrs
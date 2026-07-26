from rest_framework import serializers
from .models import Teacher


class TeacherSerializer(serializers.ModelSerializer):
    # Read-only nested view of the linked School record (if the soft-link
    # in teachers/views.py found a match by EMIS code). Kept separate from
    # schoolName/schoolEmisCode, which stay as whatever the applicant typed.
    school_detail = serializers.SerializerMethodField()

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

        errors = {}

        def require(field, message):
            if not attrs.get(field):
                errors[field] = message

        # Document uploads -- compulsory on every application regardless
        # of teacherType.
        require("citizenship", "Citizenship document is required.")
        require("degree", "Degree certificate is required.")
        require("photo", "Passport size photo is required.")
        require("teachingLicense", "Teaching license is required.")
        require("appointmentLetter", "Appointment letter is required.")

        # Only required when the two qualifications actually differ --
        # if they're the same, `degree` above already covers it.
        min_q = attrs.get("minQualification")
        highest_q = attrs.get("highestQualification")
        if min_q and highest_q and min_q != highest_q:
            require(
                "highestQualificationDocument",
                "Highest Qualification document is required when it differs from Minimum Qualification.",
            )

        # Appointment Date applies to every teacherType (see
        # app/register/page.tsx's Step3, which validates it unconditionally).
        require("appointmentDate", "Appointment Date is required.")

        teacher_type = attrs.get("teacherType")
        if teacher_type == "permanent":
            # Extraordinary Leave Taken is only ever shown/collected for
            # Permanent teachers (see app/register/page.tsx's Step3) --
            # required for them, not applicable otherwise.
            require("extraordinaryLeave", "Extraordinary Leave Taken is required for Permanent teachers.")

            was_different = attrs.get("wasDifferentTypeBeforePermanent")
            if was_different is None:
                errors["wasDifferentTypeBeforePermanent"] = (
                    "Please specify whether you were appointed under a different type before becoming Permanent."
                )
            elif was_different:
                require(
                    "permanentAppointmentDate",
                    "Appointment Date (as Permanent) is required when you were a different type before.",
                )

            grade = attrs.get("grade")
            if grade == "second":
                require("promotionDate", "Promotion Date is required for Grade Second.")
            elif grade == "first":
                require("promotionDate", "Promotion Date (Third → Second) is required for Grade First.")
                require("promotionDate2", "Promotion Date (Second → First) is required for Grade First.")

        if errors:
            raise serializers.ValidationError(errors)
        return attrs
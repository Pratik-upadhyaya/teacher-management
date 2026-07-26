from rest_framework import serializers
from .models import Teacher
from .validation import get_teacher_required_field_errors


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

        errors = get_teacher_required_field_errors(attrs.get)
        if errors:
            raise serializers.ValidationError(errors)
        return attrs
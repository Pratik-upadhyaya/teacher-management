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
        }

    def get_school_detail(self, obj):
        if obj.school_id:
            return {
                "id": obj.school.id,
                "school_name": obj.school.school_name,
                "emis_code": obj.school.emis_code,
            }
        return None
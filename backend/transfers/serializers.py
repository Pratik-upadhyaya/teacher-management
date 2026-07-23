from rest_framework import serializers
from .models import TeacherTransferRequest


class TeacherTransferRequestSerializer(serializers.ModelSerializer):
    teacherName = serializers.CharField(source='teacher.name', read_only=True)
    teacherId = serializers.IntegerField(source='teacher.id', read_only=True)
    reviewedByName = serializers.CharField(
        source='reviewed_by.username', read_only=True, default=None
    )

    class Meta:
        model = TeacherTransferRequest
        fields = [
            'id',
            'teacher',
            'teacherId',
            'teacherName',
            'old_school_name',
            'old_school_emis_code',
            'old_district',
            'old_municipality',
            'old_ward_no',
            'new_school_name',
            'new_school_emis_code',
            'new_school_address',
            'new_district',
            'new_municipality',
            'new_ward_no',
            'transfer_document',
            'reason',
            'status',
            'requested_at',
            'reviewed_at',
            'reviewed_by',
            'reviewedByName',
            'review_note',
        ]
        # teacher and the old_* snapshot are only ever set server-side from
        # the logged-in teacher's own record; status/reviewed_* are only
        # ever set by approve/reject in views.py -- none of these are ever
        # trusted from client input.
        read_only_fields = [
            'teacher',
            'old_school_name',
            'old_school_emis_code',
            'old_district',
            'old_municipality',
            'old_ward_no',
            'status',
            'requested_at',
            'reviewed_at',
            'reviewed_by',
        ]
from rest_framework import serializers
from .models import DocumentChangeRequest


class DocumentChangeRequestSerializer(serializers.ModelSerializer):
    teacherName = serializers.CharField(source='teacher.name', read_only=True)
    teacherId = serializers.IntegerField(source='teacher.id', read_only=True)
    reviewedByName = serializers.CharField(
        source='reviewed_by.username', read_only=True, default=None
    )

    class Meta:
        model = DocumentChangeRequest
        fields = [
            'id',
            'teacher',
            'teacherId',
            'teacherName',
            'document_type',
            'file',
            'status',
            'requested_at',
            'reviewed_at',
            'reviewed_by',
            'reviewedByName',
            'review_note',
        ]
        # teacher/status/reviewed_* are only ever set by the views
        # (teacher is inferred from the logged-in user, status/reviewer are
        # set by approve/reject) -- never trusted from client input.
        read_only_fields = ['teacher', 'status', 'requested_at', 'reviewed_at', 'reviewed_by']
from rest_framework import serializers
from .models import School


class SchoolSerializer(serializers.ModelSerializer):
    reviewedByName = serializers.CharField(
        source='reviewed_by.username', read_only=True, default=None
    )
    principalName = serializers.CharField(
        source='principal.username', read_only=True, default=None
    )

    class Meta:
        model = School
        fields = '__all__'
        # status/reviewed_*/principal are only ever set by the views
        # (principal is inferred from the logged-in user on creation,
        # status/reviewer are set by approve/reject), never trusted from
        # client input -- same reasoning as DocumentChangeRequestSerializer.
        read_only_fields = ['principal', 'status', 'reviewed_by', 'reviewed_at']
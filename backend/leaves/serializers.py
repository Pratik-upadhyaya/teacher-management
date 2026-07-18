from rest_framework import serializers

from .models import LeaveApplication, LeaveType


class LeaveTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = LeaveType
        fields = ['id', 'name', 'name_np', 'annual_quota_days', 'is_lifetime']


class LeaveApplicationSerializer(serializers.ModelSerializer):
    # Nested read-only detail so the frontend can show the type's name/quota
    # without a second round trip.
    leave_type_detail = LeaveTypeSerializer(source='leave_type', read_only=True)

    class Meta:
        model = LeaveApplication
        fields = [
            'id', 'leave_type', 'leave_type_detail',
            'start_date', 'end_date', 'days_count', 'year',
            'reason', 'document', 'created_at',
        ]
        # Every field here is set by the view (teacher inferred from the
        # logged-in user, days_count/year computed server-side, document
        # validated+processed before saving) -- this serializer is used for
        # *output* only. See leaves/views.py.
        read_only_fields = fields
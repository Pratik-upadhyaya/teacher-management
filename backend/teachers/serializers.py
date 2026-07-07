from rest_framework import serializers
from .models import Teacher

class TeacherSerializer(serializers.ModelSerializer):
    class Meta:
        model = Teacher
        fields = '__all__'
        extra_kwargs = {
            # Accepted on write (application submission) but never sent back
            # out in any response -- this was previously leaking every
            # teacher's plaintext password to admins via GET /api/.
            'password': {'write_only': True}
        }
from rest_framework import serializers
from .models import User


class RegisterSerializer(serializers.ModelSerializer):
    """
    Public self-registration. Role is intentionally NOT accepted from the
    client here -- every self-registered account is a 'teacher'. Principal
    and admin accounts must be created by an existing admin (see
    accounts/views.py: create_staff_user), not through open registration.
    """
    password = serializers.CharField(write_only=True, min_length=8)

    class Meta:
        model = User
        fields = ['username', 'email', 'password', 'phone']

    def create(self, validated_data):
        user = User(
            username=validated_data['username'],
            email=validated_data['email'],
            role='teacher',
            phone=validated_data.get('phone')
        )
        user.set_password(validated_data['password'])
        user.save()
        return user


class StaffCreateSerializer(serializers.ModelSerializer):
    """Used by admins to create principal/admin accounts. Only reachable
    by an authenticated admin -- see create_staff_user view."""
    password = serializers.CharField(write_only=True, min_length=8)

    class Meta:
        model = User
        fields = ['username', 'email', 'password', 'role', 'phone']

    def validate_role(self, value):
        if value not in ('principal', 'admin'):
            raise serializers.ValidationError("Role must be 'principal' or 'admin'.")
        return value

    def create(self, validated_data):
        user = User(
            username=validated_data['username'],
            email=validated_data['email'],
            role=validated_data['role'],
            phone=validated_data.get('phone')
        )
        user.set_password(validated_data['password'])
        user.save()
        return user
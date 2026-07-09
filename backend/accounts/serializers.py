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
    """Used by admins to create principal/sub-admin/admin accounts. Only
    reachable by an authenticated admin -- see create_staff_user view."""
    password = serializers.CharField(write_only=True, min_length=8)

    class Meta:
        model = User
        fields = ['username', 'email', 'password', 'role', 'phone', 'first_name']
        extra_kwargs = {'first_name': {'required': False}}

    def validate_role(self, value):
        if value not in ('principal', 'sub-admin', 'admin'):
            raise serializers.ValidationError(
                "Role must be 'principal', 'sub-admin', or 'admin'."
            )
        return value

    def create(self, validated_data):
        user = User(
            username=validated_data['username'],
            email=validated_data['email'],
            role=validated_data['role'],
            phone=validated_data.get('phone'),
            first_name=validated_data.get('first_name', ''),
        )
        user.set_password(validated_data['password'])
        user.save()
        return user


class SubAdminSerializer(serializers.ModelSerializer):
    """Read-only listing of sub-admin accounts for the admin panel.
    Deliberately excludes password -- it's never sent to the client.
    `first_name` is used as the display name, since User (unlike Teacher)
    has no dedicated 'name' field."""

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'phone', 'first_name', 'date_joined']
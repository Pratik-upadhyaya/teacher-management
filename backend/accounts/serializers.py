from rest_framework import serializers
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
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

    def validate_password(self, value):
        # min_length=8 above only checks length. This runs the same
        # AUTH_PASSWORD_VALIDATORS settings.py already declares (common
        # password check, not-too-similar-to-username/email, not entirely
        # numeric) -- accounts/views.py:change_password already does this
        # for password changes, but registration itself never did, so
        # e.g. "aaaaaaaa" was a fully valid password until now.
        temp_user = User(
            username=self.initial_data.get('username', ''),
            email=self.initial_data.get('email', ''),
        )
        try:
            validate_password(value, user=temp_user)
        except DjangoValidationError as e:
            raise serializers.ValidationError(list(e.messages))
        return value

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

    def validate_password(self, value):
        # Same rationale as RegisterSerializer above -- this path can
        # create admin accounts, so weak-password enforcement matters at
        # least as much here.
        temp_user = User(
            username=self.initial_data.get('username', ''),
            email=self.initial_data.get('email', ''),
        )
        try:
            validate_password(value, user=temp_user)
        except DjangoValidationError as e:
            raise serializers.ValidationError(list(e.messages))
        return value

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
    has no dedicated 'name' field. `approved_count`/`rejected_count` come
    from annotations in list_sub_admins, not real model fields."""

    approved_count = serializers.IntegerField(read_only=True, default=0)
    rejected_count = serializers.IntegerField(read_only=True, default=0)

    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'phone', 'first_name', 'date_joined',
            'approved_count', 'rejected_count',
        ]
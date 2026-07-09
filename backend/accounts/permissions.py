from rest_framework.permissions import BasePermission


class IsAdmin(BasePermission):
    """Allows access only to authenticated users with role == 'admin'."""

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and getattr(request.user, "role", None) == "admin"
        )


class IsAdminOrPrincipal(BasePermission):
    """Allows access to authenticated users with role 'admin', 'principal',
    or 'sub-admin'. Use this for actions like approving/rejecting teacher
    applications and viewing dashboard stats. Creating/managing staff
    accounts (including other sub-admins) stays admin-only -- see IsAdmin."""

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and getattr(request.user, "role", None) in ("admin", "principal", "sub-admin")
        )
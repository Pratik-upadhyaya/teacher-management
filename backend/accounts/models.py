from django.contrib.auth.models import AbstractUser
from django.contrib.auth.models import UserManager as DjangoUserManager
from django.db import models


class UserManager(DjangoUserManager):
    def create_superuser(self, username, email=None, password=None, **extra_fields):
        extra_fields.setdefault("role", "admin")
        return super().create_superuser(username, email, password, **extra_fields)


class User(AbstractUser):
    ROLE_CHOICES = (
        ('teacher', 'Teacher'),
        ('principal', 'Principal'),
        ('sub-admin', 'Sub Admin'),
        ('admin', 'Admin'),
    )

    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='teacher')
    phone = models.CharField(max_length=20, blank=True, null=True)

    # Every account-creation path (self-registration, admin-created staff)
    # looks users up by email, and login_user does User.objects.get(email=...),
    # which raises MultipleObjectsReturned if two accounts share an email.
    # unique=True closes that at the DB level and makes DRF auto-validate
    # it (400 on duplicate) instead of allowing it through silently.
    email = models.EmailField('email address', unique=True)

    objects = UserManager()

    def __str__(self):
        return self.username
from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status
from accounts.models import User
from teachers.models import Teacher
from .models import LeaveType


class LeaveTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.teacher_user = User.objects.create_user(
            username="teacher@example.com",
            email="teacher@example.com",
            password="TeacherPassword123!",
            role="teacher",
        )
        self.teacher = Teacher.objects.create(
            name="Hari Sharma",
            email="teacher@example.com",
            phone="9800000002",
            teacherType="permanent",
            tokenNo="TSC-102",
            status="approved",
        )
        self.leave_type = LeaveType.objects.create(
            name="Sick Leave",
            annual_quota_days=12,
            is_lifetime=False,
            is_active=True,
        )

    def test_leave_type_list(self):
        self.client.force_authenticate(user=self.teacher_user)
        response = self.client.get("/api/leaves/types/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)

    def test_my_leave_summary(self):
        self.client.force_authenticate(user=self.teacher_user)
        response = self.client.get("/api/leaves/summary/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["remaining_days"], 12)

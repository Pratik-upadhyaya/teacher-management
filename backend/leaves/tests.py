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
            appointmentDate="2080/01/01",
            extraordinaryLeave="0",
            citizenship="citizenship.pdf",
            degree="degree.pdf",
            teachingLicense="license.pdf",
            appointmentLetter="appointment.pdf",
            status="approved",
        )
        # "Sick Leave" is already seeded by leaves/migrations/
        # 0002_seed_leave_types.py (along with 6 other standard types) --
        # creating another one here would violate LeaveType.name's unique
        # constraint. Fetch the seeded row instead of creating a new one.
        self.leave_type = LeaveType.objects.get(name="Sick Leave")

    def test_leave_type_list(self):
        self.client.force_authenticate(user=self.teacher_user)
        response = self.client.get("/api/leaves/types/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # All active seeded types are returned, not just "Sick Leave" --
        # assert against the live count/name set rather than assuming this
        # is the only leave type in the system.
        self.assertEqual(len(response.data), LeaveType.objects.filter(is_active=True).count())
        names = [t["name"] for t in response.data]
        self.assertIn("Sick Leave", names)

    def test_my_leave_summary(self):
        self.client.force_authenticate(user=self.teacher_user)
        response = self.client.get("/api/leaves/summary/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), LeaveType.objects.filter(is_active=True).count())
        sick_leave_entry = next(
            entry for entry in response.data if entry["leave_type"]["name"] == "Sick Leave"
        )
        self.assertEqual(sick_leave_entry["remaining_days"], 12)

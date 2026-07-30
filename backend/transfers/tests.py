from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status
from accounts.models import User
from teachers.models import Teacher


class TransferTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.teacher_user = User.objects.create_user(
            username="teacher@example.com",
            email="teacher@example.com",
            password="TeacherPassword123!",
            role="teacher",
        )
        self.teacher = Teacher.objects.create(
            name="Sita Thapa",
            email="teacher@example.com",
            phone="9800000003",
            teacherType="permanent",
            tokenNo="TSC-103",
            appointmentDate="2080/01/01",
            extraordinaryLeave="0",
            citizenship="citizenship.pdf",
            degree="degree.pdf",
            teachingLicense="license.pdf",
            appointmentLetter="appointment.pdf",
            status="approved",
        )

    def test_my_transfer_requests_empty(self):
        self.client.force_authenticate(user=self.teacher_user)
        response = self.client.get("/api/transfers/requests/mine/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data, [])

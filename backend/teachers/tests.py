from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status
from django.core.files.uploadedfile import SimpleUploadedFile
from accounts.models import User
from accounts.otp import generate_and_store_otp, check_otp
from .models import Teacher
from schools.models import School


class TeacherTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin_user = User.objects.create_user(
            username="admin@example.com",
            email="admin@example.com",
            password="AdminPassword123!",
            role="admin",
        )
        self.teacher_user = User.objects.create_user(
            username="teacher@example.com",
            email="teacher@example.com",
            password="TeacherPassword123!",
            role="teacher",
        )
        self.school = School.objects.create(
            emis_code="12345678",
            school_name="Shree Secondary School",
            district="Kaski",
            municipality="Pokhara",
            status="approved",
        )
        self.teacher = Teacher.objects.create(
            name="Ram Shrestha",
            email="teacher@example.com",
            phone="9800000001",
            school=self.school,
            schoolName="Shree Secondary School",
            schoolEmisCode="12345678",
            teacherType="permanent",
            tokenNo="TSC-101",
            subject="Science",
            appointmentDate="2080/01/01",
            extraordinaryLeave="0",
            status="pending",
        )

    def test_teacher_me_authenticated(self):
        self.client.force_authenticate(user=self.teacher_user)
        response = self.client.get("/api/teachers/me/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["email"], "teacher@example.com")

    def test_teacher_me_patch(self):
        self.client.force_authenticate(user=self.teacher_user)
        response = self.client.patch(
            "/api/teachers/me/",
            {"name": "Ram Bahadur Shrestha", "phone": "9811111111"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.teacher.refresh_from_db()
        self.assertEqual(self.teacher.name, "Ram Bahadur Shrestha")
        self.assertEqual(self.teacher.phone, "9811111111")

    def test_approve_teacher_admin(self):
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.patch(f"/api/{self.teacher.id}/approve/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.teacher.refresh_from_db()
        self.assertEqual(self.teacher.status, "approved")

    def test_reject_teacher_admin(self):
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.patch(
            f"/api/{self.teacher.id}/reject/",
            {"message": "Incomplete documentation"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.teacher.refresh_from_db()
        self.assertEqual(self.teacher.status, "rejected")
        self.assertEqual(self.teacher.remarks, "Incomplete documentation")

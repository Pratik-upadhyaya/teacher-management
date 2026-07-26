from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status
from accounts.models import User
from .models import School, PublicSchoolReference


class SchoolTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin_user = User.objects.create_user(
            username="admin@example.com",
            email="admin@example.com",
            password="AdminPassword123!",
            role="admin",
        )
        self.teacher_user = User.objects.create_user(
            username="principal@example.com",
            email="principal@example.com",
            password="TeacherPassword123!",
            role="teacher",
        )
        self.school_ref = PublicSchoolReference.objects.create(
            emis_code="99988877",
            school_name="Shree Public Secondary",
            district="Kaski",
            municipality="Pokhara",
            ward_no="1",
        )

    def test_public_school_reference_search(self):
        response = self.client.get("/api/schools/public-reference/?q=Shree")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["emis_code"], "99988877")

    def test_my_school_submission(self):
        self.client.force_authenticate(user=self.teacher_user)
        payload = {
            "emis_code": "99988877",
            "school_name": "Shree Public Secondary",
            "district": "Kaski",
            "municipality": "Pokhara",
            "ward_no": "1",
        }
        response = self.client.post("/api/schools/my-school/", payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["status"], "pending")

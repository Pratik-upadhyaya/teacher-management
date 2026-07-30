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
        # Query by the fixture's own EMIS code rather than a generic name
        # fragment like "Shree" -- schools/migrations/0005_seed_public_
        # school_reference.py seeds ~350 real Kaski schools into this same
        # table, several of which also contain "Shree" in their name, so a
        # name-based query can no longer assume it only matches this
        # fixture. The EMIS code is unique and won't collide.
        response = self.client.get("/api/schools/public-reference/?q=99988877")
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
            "contact": "9800000000",
            "established_date": "2050",
        }
        response = self.client.post("/api/schools/me/", payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["status"], "pending")

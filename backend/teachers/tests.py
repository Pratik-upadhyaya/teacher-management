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
            citizenship="citizenship.pdf",
            degree="degree.pdf",
            teachingLicense="license.pdf",
            appointmentLetter="appointment.pdf",
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

    # ── Registration creates a login account immediately ──────────────
    def test_registration_creates_login_account(self):
        code = generate_and_store_otp("email", "newteacher@example.com")
        check_otp("email", "newteacher@example.com", code)

        response = self.client.post(
            "/api/",
            {
                "name": "Hari Gurung", "nameEnglish": "Hari Gurung", "fatherName": "Ram Gurung",
                "gender": "male", "permanentAddress": "Pokhara", "permanentWardNo": "5",
                "dob": "2040/01/01",
                "phone": "9811111111", "email": "newteacher@example.com", "password": "TeacherPassword123!",
                "district": "Kaski", "municipality": "Pokhara", "wardNo": "5",
                "schoolName": "Shree Secondary School", "schoolEmisCode": "12345678",
                "subject": "Science", "subjectEnglish": "Science", "level": "secondary",
                "teacherType": "temporary",
                "appointmentDate": "2080/01/01",
                "minQualification": "bachelor", "highestQualification": "bachelor",
                "citizenship": SimpleUploadedFile("citizenship.pdf", b"x", content_type="application/pdf"),
                "degree": SimpleUploadedFile("degree.pdf", b"x", content_type="application/pdf"),
                "seeSlcCertificate": SimpleUploadedFile("see.pdf", b"x", content_type="application/pdf"),
                "photo": SimpleUploadedFile("photo.jpg", b"x", content_type="image/jpeg"),
                "teachingLicense": SimpleUploadedFile("license.pdf", b"x", content_type="application/pdf"),
                "appointmentLetter": SimpleUploadedFile("appointment.pdf", b"x", content_type="application/pdf"),
            },
            format="multipart",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)

        # A User account should now exist -- and the teacher can log in
        # with it right away, before any admin has approved anything.
        self.assertTrue(User.objects.filter(email="newteacher@example.com").exists())
        login_response = self.client.post(
            "/api/token/",
            {"email": "newteacher@example.com", "password": "TeacherPassword123!"},
            format="json",
        )
        self.assertEqual(login_response.status_code, status.HTTP_200_OK, login_response.data)

        # Plaintext password should be scrubbed off the Teacher row.
        new_teacher = Teacher.objects.get(email="newteacher@example.com")
        self.assertEqual(new_teacher.password, "")
        self.assertEqual(new_teacher.status, "pending")

    # ── teacher_application: pending/rejected teacher can view + edit ──
    def test_teacher_application_get(self):
        self.client.force_authenticate(user=self.teacher_user)
        response = self.client.get("/api/teachers/me/application/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["status"], "pending")

    def test_teacher_application_patch_pending_resubmits(self):
        self.teacher.status = "rejected"
        self.teacher.remarks = "Please re-upload a clearer citizenship document."
        self.teacher.reviewed_by = self.admin_user
        self.teacher.save()

        self.client.force_authenticate(user=self.teacher_user)
        response = self.client.patch(
            "/api/teachers/me/application/",
            {"subject": "Mathematics"},
            format="multipart",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        self.teacher.refresh_from_db()
        self.assertEqual(self.teacher.subject, "Mathematics")
        # Editing resubmits the application: back to pending, remarks and
        # reviewer cleared.
        self.assertEqual(self.teacher.status, "pending")
        self.assertEqual(self.teacher.remarks, "")
        self.assertIsNone(self.teacher.reviewed_by)

    def test_teacher_application_patch_rejects_status_field(self):
        # A teacher can't smuggle themselves straight to "approved" by
        # PATCHing the workflow field directly -- it's not in the
        # editable whitelist, so it's silently dropped.
        self.client.force_authenticate(user=self.teacher_user)
        response = self.client.patch(
            "/api/teachers/me/application/",
            {"status": "approved", "subject": "Mathematics"},
            format="multipart",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.teacher.refresh_from_db()
        self.assertEqual(self.teacher.status, "pending")  # not "approved"

    def test_teacher_application_patch_blocked_once_approved(self):
        self.teacher.status = "approved"
        self.teacher.save()

        self.client.force_authenticate(user=self.teacher_user)
        response = self.client.patch(
            "/api/teachers/me/application/",
            {"subject": "Mathematics"},
            format="multipart",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.teacher.refresh_from_db()
        self.assertEqual(self.teacher.subject, "Science")  # unchanged

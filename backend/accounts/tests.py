from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status
from .models import User
from .otp import generate_and_store_otp, is_verified, check_otp


class AccountTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user_password = "SecurePassword123!"
        self.user = User.objects.create_user(
            username="testteacher@example.com",
            email="testteacher@example.com",
            password=self.user_password,
            role="teacher",
            phone="9800000000",
        )

    def test_login_success(self):
        response = self.client.post(
            "/api/token/",
            {"email": "testteacher@example.com", "password": self.user_password},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("access", response.data)
        self.assertIn("refresh", response.data)

    def test_login_invalid_credentials(self):
        response = self.client.post(
            "/api/token/",
            {"email": "testteacher@example.com", "password": "wrongpassword"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_otp_flow(self):
        code = generate_and_store_otp("email", "applicant@example.com")
        self.assertTrue(code)
        
        # Verify correct OTP
        success, error = check_otp("email", "applicant@example.com", code)
        self.assertTrue(success)
        self.assertTrue(is_verified("email", "applicant@example.com"))

    def test_change_password(self):
        self.client.force_authenticate(user=self.user)
        new_password = "BrandNewPassword123!"
        response = self.client.post(
            "/api/accounts/change-password/",
            {
                "current_password": self.user_password,
                "new_password": new_password,
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Verify user can log in with new password
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password(new_password))

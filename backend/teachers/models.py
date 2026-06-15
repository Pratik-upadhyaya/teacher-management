from django.db import models

class Teacher(models.Model):
    # Step 1
    name = models.CharField(max_length=255)
    fatherName = models.CharField(max_length=255)
    permanentAddress = models.TextField()
    permanentWardNo = models.CharField(max_length=10)
    dob = models.CharField(max_length=20)
    phone = models.CharField(max_length=20)
    email = models.EmailField(unique=True)
    password = models.CharField(max_length=255)

    # Step 2
    district = models.CharField(max_length=100, blank=True, null=True)
    municipality = models.CharField(max_length=100, blank=True, null=True)
    wardNo = models.CharField(max_length=10, blank=True, null=True)
    schoolName = models.CharField(max_length=255, blank=True, null=True)
    tokenNo = models.CharField(max_length=100, blank=True, null=True)
    subject = models.CharField(max_length=100, blank=True, null=True)
    level = models.CharField(max_length=100, blank=True, null=True)
    grade = models.CharField(max_length=100, blank=True, null=True)
    teacherType = models.CharField(max_length=100, blank=True, null=True)

    # Step 3
    appointmentDate = models.CharField(max_length=20, blank=True, null=True)
    promotionDate = models.CharField(max_length=20, blank=True, null=True)
    qualification = models.CharField(max_length=100, blank=True, null=True)
    extraordinaryLeave = models.CharField(max_length=20, blank=True, null=True)
    accumulatedLeave = models.CharField(max_length=20, blank=True, null=True)
    ageSixtyYear = models.CharField(max_length=20, blank=True, null=True)
    remarks = models.TextField(blank=True, null=True)

    # Step 4 (documents)
    citizenship = models.CharField(max_length=255, blank=True, null=True)
    degree = models.CharField(max_length=255, blank=True, null=True)
    transcript = models.CharField(max_length=255, blank=True, null=True)
    teachingLicense = models.CharField(max_length=255, blank=True, null=True)
    appointmentLetter = models.CharField(max_length=255, blank=True, null=True)

    # Admin
    status = models.CharField(
        max_length=20,
        default="pending",
        choices=[
            ("pending", "Pending"),
            ("approved", "Approved"),
            ("rejected", "Rejected"),
        ],
    )

    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name
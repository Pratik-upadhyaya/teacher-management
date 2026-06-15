from django.db import models


class School(models.Model):
    emis_code = models.CharField(max_length=50, unique=True)
    school_name = models.CharField(max_length=255)
    address = models.TextField()
    contact = models.CharField(max_length=20)
    email = models.EmailField(blank=True, null=True)
    established_bs = models.CharField(max_length=20)
    permission_date_bs = models.CharField(max_length=20, blank=True, null=True)

    # Step 2: Sections
    bal_kaksha = models.CharField(max_length=20, blank=True, null=True)
    primary_1_5 = models.CharField(max_length=20, blank=True, null=True)
    lower_secondary_6_8 = models.CharField(max_length=20, blank=True, null=True)
    secondary_9_10 = models.CharField(max_length=20, blank=True, null=True)
    secondary_11_12 = models.CharField(max_length=20, blank=True, null=True)

    # Step 3: Infrastructure
    computer_lab = models.BooleanField(default=False)
    science_lab = models.BooleanField(default=False)
    library = models.BooleanField(default=False)
    book_corner = models.BooleanField(default=False)
    playground = models.BooleanField(default=False)

    land_area = models.FloatField(default=0)
    land_unit = models.CharField(max_length=50, blank=True, null=True)
    building_count = models.IntegerField(default=0)
    classroom_count = models.IntegerField(default=0)
    female_toilets = models.IntegerField(default=0)
    male_toilets = models.IntegerField(default=0)

    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.school_name
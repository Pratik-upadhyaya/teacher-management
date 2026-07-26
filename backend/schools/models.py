from django.conf import settings
from django.db import models


class School(models.Model):
    emis_code = models.CharField(max_length=50, unique=True)
    school_name = models.CharField(max_length=255)

    # address is now derived server-side from district/municipality/ward_no
    # (see views._build_address) rather than typed freeform, mirroring the
    # structured district/municipality picker already used for teachers
    # (lib/districts.tsx on the frontend). Kept as a plain field (rather
    # than computed at read time) so existing consumers -- the admin
    # Schools table, the bulk Excel export, report_export.py's A3 cell --
    # keep working unchanged.
    address = models.TextField(blank=True)
    district = models.CharField(max_length=100, blank=True, null=True)
    municipality = models.CharField(max_length=100, blank=True, null=True)
    ward_no = models.CharField(max_length=10, blank=True, null=True)

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

    # ── Land area: Nepal uses three separate, non-convertible-by-simple-
    # -factor measurement systems depending on region/context (a Ropani
    # isn't a fixed multiple of a Bigha the way km is of m), so rather than
    # one field + a unit dropdown, the principal picks which system applies
    # and fills in that system's own component units. Only the fields for
    # the chosen land_unit_system are meaningful; the rest stay at 0.
    LAND_SYSTEM_CHOICES = [
        ("metric", "Square Meter"),
        ("ropani", "Ropani-Aana-Paisa-Daan"),
        ("bigha", "Bigha-Kattha-Dhur"),
    ]
    land_unit_system = models.CharField(
        max_length=10, choices=LAND_SYSTEM_CHOICES, blank=True, null=True
    )
    land_sqm = models.FloatField(default=0)          # metric
    land_ropani = models.IntegerField(default=0)     # hill system
    land_aana = models.IntegerField(default=0)
    land_paisa = models.IntegerField(default=0)
    land_daan = models.IntegerField(default=0)
    land_bigha = models.IntegerField(default=0)       # terai system
    land_kattha = models.IntegerField(default=0)
    land_dhur = models.IntegerField(default=0)

    building_count = models.IntegerField(default=0)
    classroom_count = models.IntegerField(default=0)
    female_toilets = models.IntegerField(default=0)
    male_toilets = models.IntegerField(default=0)

    created_at = models.DateTimeField(auto_now_add=True)

    # =========================
    # SUBMITTER LINK + ADMIN REVIEW
    # =========================
    # One account owns (at most) one School submission -- this is what "my
    # school" means on the principal portal, mirroring how a Teacher row is
    # looked up by request.user.email in teachers.views. Despite the field
    # name (kept for compatibility with existing serializer output /
    # frontend), any teacher account can now submit here, not just accounts
    # with role == "principal" -- see my_school() in views.py. OneToOne (not
    # FK) since one account manages exactly one school submission.
    principal = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='school',
    )

    status = models.CharField(
        max_length=20,
        default="pending",
        choices=[
            ("pending", "Pending"),
            ("approved", "Approved"),
            ("rejected", "Rejected"),
        ],
    )

    remarks = models.TextField(blank=True, default="")

    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='reviewed_schools',
    )
    reviewed_at = models.DateTimeField(null=True, blank=True)

    def land_area_display(self):
        """Human-readable land area string for whichever of the three
        systems was chosen -- used by report_export.py and anywhere else
        that just wants one printable value rather than the raw fields."""
        if self.land_unit_system == "metric":
            return f"{self.land_sqm} sq.m." if self.land_sqm else ""
        if self.land_unit_system == "ropani":
            if any([self.land_ropani, self.land_aana, self.land_paisa, self.land_daan]):
                return (
                    f"{self.land_ropani}-{self.land_aana}-{self.land_paisa}-{self.land_daan} "
                    f"(Ropani-Aana-Paisa-Daan)"
                )
            return ""
        if self.land_unit_system == "bigha":
            if any([self.land_bigha, self.land_kattha, self.land_dhur]):
                return f"{self.land_bigha}-{self.land_kattha}-{self.land_dhur} (Bigha-Kattha-Dhur)"
            return ""
        return ""

    def __str__(self):
        return self.school_name
from django.db import migrations

# 1095 days = 3 years, the career-long cap on extraordinary leave under
# Nepal's Civil Service Regulations. Unlike the other seeded leave types,
# this one is_lifetime=True: its quota doesn't reset every year, and the
# per-teacher remaining balance actually comes from
# Teacher.extraordinaryLeaveRemaining (set at registration -- see
# teachers/views.py), not from this shared annual_quota_days value. The
# 1095 here mainly documents the absolute cap; see leaves/views.py for how
# the two combine into what a teacher sees.
EXTRAORDINARY_LEAVE_TYPE = {
    "name": "Extraordinary Leave",
    "name_np": "असाधारण बिदा",
    "annual_quota_days": 1095,
    "is_lifetime": True,
}


def seed_extraordinary_leave(apps, schema_editor):
    LeaveType = apps.get_model('leaves', 'LeaveType')
    LeaveType.objects.get_or_create(
        name=EXTRAORDINARY_LEAVE_TYPE["name"], defaults=EXTRAORDINARY_LEAVE_TYPE
    )


def remove_extraordinary_leave(apps, schema_editor):
    LeaveType = apps.get_model('leaves', 'LeaveType')
    LeaveType.objects.filter(name=EXTRAORDINARY_LEAVE_TYPE["name"]).delete()


class Migration(migrations.Migration):

    dependencies = [
        ('leaves', '0003_leavetype_is_lifetime_and_more'),
    ]

    operations = [
        migrations.RunPython(seed_extraordinary_leave, remove_extraordinary_leave),
    ]
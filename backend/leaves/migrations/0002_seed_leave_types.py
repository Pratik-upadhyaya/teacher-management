from django.db import migrations

# Default categories under Nepal's Civil Service Act/Regulations. Quotas
# here are the standard annual entitlements; admins can adjust per-type via
# the Django admin if EDCU Kaski's actual policy differs.
DEFAULT_LEAVE_TYPES = [
    {"name": "Sick Leave", "name_np": "बिरामी बिदा", "annual_quota_days": 12},
    {"name": "Home Leave", "name_np": "गृह बिदा", "annual_quota_days": 30},
    {"name": "Festival Leave", "name_np": "पर्व बिदा", "annual_quota_days": 12},
    {"name": "Maternity Leave", "name_np": "सुत्केरी बिदा", "annual_quota_days": 98},
    {"name": "Paternity Leave", "name_np": "पितृत्व बिदा", "annual_quota_days": 15},
    {"name": "Mourning Leave", "name_np": "शोक बिदा", "annual_quota_days": 13},
]


def seed_leave_types(apps, schema_editor):
    LeaveType = apps.get_model('leaves', 'LeaveType')
    for entry in DEFAULT_LEAVE_TYPES:
        LeaveType.objects.get_or_create(name=entry["name"], defaults=entry)


def remove_seeded_leave_types(apps, schema_editor):
    LeaveType = apps.get_model('leaves', 'LeaveType')
    LeaveType.objects.filter(name__in=[e["name"] for e in DEFAULT_LEAVE_TYPES]).delete()


class Migration(migrations.Migration):

    dependencies = [
        ('leaves', '0001_initial'),
    ]

    operations = [
        migrations.RunPython(seed_leave_types, remove_seeded_leave_types),
    ]
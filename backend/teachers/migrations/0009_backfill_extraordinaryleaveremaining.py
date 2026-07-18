from django.db import migrations

EXTRAORDINARY_LEAVE_CAP_DAYS = 1095


def backfill_extraordinary_leave_remaining(apps, schema_editor):
    """Computes extraordinaryLeaveRemaining for every existing teacher from
    their already-entered extraordinaryLeave (days taken), the same formula
    applied to new registrations going forward (see teachers/views.py):
    remaining = max(1095 - taken, 0). Non-numeric/blank extraordinaryLeave
    values are treated as 0 taken (i.e. full 1095 remaining) rather than
    left at the previous 0 placeholder.
    """
    Teacher = apps.get_model('teachers', 'Teacher')
    for teacher in Teacher.objects.all():
        raw = (teacher.extraordinaryLeave or '').strip()
        try:
            taken = int(raw) if raw else 0
        except ValueError:
            taken = 0
        remaining = max(EXTRAORDINARY_LEAVE_CAP_DAYS - taken, 0)
        if teacher.extraordinaryLeaveRemaining != remaining:
            teacher.extraordinaryLeaveRemaining = remaining
            teacher.save(update_fields=['extraordinaryLeaveRemaining'])


def noop_reverse(apps, schema_editor):
    # No sensible reverse (the previous state was just "0 for everyone") --
    # leave computed values in place going backward.
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('teachers', '0008_teacher_extraordinaryleaveremaining'),
    ]

    operations = [
        migrations.RunPython(backfill_extraordinary_leave_remaining, noop_reverse),
    ]
    
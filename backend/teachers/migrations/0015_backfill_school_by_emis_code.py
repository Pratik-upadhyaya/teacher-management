from django.db import migrations


def link_teachers_to_schools_by_emis_code(apps, schema_editor):
    """One-time backfill for the historical gap: Teacher.school was only
    ever set at registration time, and only if a matching School already
    existed then. This links every currently-unlinked teacher whose typed
    schoolEmisCode matches an existing school's emis_code -- going
    forward, schools.signals.link_pending_teachers_by_emis_code keeps this
    from recurring."""
    Teacher = apps.get_model('teachers', 'Teacher')
    School = apps.get_model('schools', 'School')

    schools_by_emis = {
        s.emis_code: s
        for s in School.objects.exclude(emis_code__isnull=True).exclude(emis_code='')
    }

    unlinked = Teacher.objects.filter(school__isnull=True).exclude(
        schoolEmisCode__isnull=True
    ).exclude(schoolEmisCode='')

    for teacher in unlinked:
        school = schools_by_emis.get(teacher.schoolEmisCode)
        if school:
            teacher.school = school
            teacher.save(update_fields=['school'])


def noop_reverse(apps, schema_editor):
    # Not reversible in any meaningful sense -- we don't know which of
    # these links (if any) already existed before this migration ran, so
    # there's nothing safe to undo. Leaving the links in place on reverse
    # is far less harmful than blanking out potentially-correct data.
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('teachers', '0014_teacher_citizenship_required_and_more'),
        ('schools', '0006_teacher_quota_fields'),
    ]

    operations = [
        migrations.RunPython(link_teachers_to_schools_by_emis_code, noop_reverse),
    ]
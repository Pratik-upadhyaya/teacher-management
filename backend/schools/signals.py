"""Keeps Teacher.school populated going forward.

Previously, a teacher's link to their School was only ever attempted once,
at the moment they registered (see teachers/views.py's POST handler) --
and only succeeded if a School row with a matching emis_code already
existed at that exact instant. A teacher who registered before their
school was added to the system (the common case: schools are frequently
entered/approved well after teachers have already applied) was left with
school=None permanently, since nothing ever retried the match. In
practice this meant every approved teacher in the database had an unset
school FK, and every report built from `teacher.school` silently showed
zero teachers.

This signal covers the other half of that timing gap: whenever a School
row is created OR its emis_code changes (edited, or set for the first
time), re-scan for teachers whose typed schoolEmisCode matches it and are
still unlinked, and link them. Combined with the existing registration-time
match, a teacher gets linked whichever record -- theirs or their school's
-- is created/edited second.

This does NOT cover a teacher whose schoolEmisCode was simply mistyped and
never matches anything; that's a data-entry error requiring an actual
correction (of either record) before this signal has anything to match --
by design, since there's no reliable way to auto-detect a typo.
"""
from django.db.models.signals import post_save
from django.dispatch import receiver

from .models import School


@receiver(post_save, sender=School)
def link_pending_teachers_by_emis_code(sender, instance, **kwargs):
    # Local import: teachers/models.py's Teacher.school is a string-referenced
    # FK to 'schools.School' precisely to avoid a hard import cycle between
    # these two apps -- importing Teacher at call time (not module load
    # time) keeps that same separation for this signal.
    from teachers.models import Teacher

    if not instance.emis_code:
        return

    Teacher.objects.filter(
        schoolEmisCode=instance.emis_code,
        school__isnull=True,
    ).update(school=instance)
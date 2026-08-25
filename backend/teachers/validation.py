"""
Shared "is this application actually complete" logic for Teacher.

Used by two independent callers, deliberately kept in sync via this one
function rather than duplicated:
  - teachers/serializers.py's TeacherSerializer.validate() -- enforced on
    every registration submitted through the public API.
  - teachers/models.py's Teacher.clean() -- enforced when a *new* Teacher
    is created through a Django ModelForm (e.g. the built-in /admin/
    site's "Add Teacher" page). Deliberately NOT enforced when editing an
    existing Teacher (see Teacher.clean()'s pk check) -- these
    requirements didn't exist when older records were created, and
    TeacherAdmin's list_editable status field relies on being able to
    save an existing row (e.g. approving it) without every one of these
    fields being backfilled first. Retroactively enforcing this on edits
    would silently block approving/reviewing legacy applications.

`get_field` abstracts over the two different shapes of "where do I read
a field's value from":
  - the serializer calls this with attrs.get (a dict already run through
    to_internal_value -- FileField values are UploadedFile instances)
  - the model calls this with a lambda around getattr (FileField values
    are FieldFile instances)
Both are falsy when empty, so the same `not get_field(...)` checks work
for either caller.
"""
from typing import Callable, Optional


def get_teacher_required_field_errors(get_field: Callable[[str], object]) -> dict:
    errors: dict = {}

    def require(field, message):
        if not get_field(field):
            errors[field] = message

    # Document uploads -- compulsory on every application regardless of
    # teacherType.
    require("citizenship", "Citizenship document is required.")
    require("degree", "Degree certificate is required.")
    require("photo", "Passport size photo is required.")
    require("teachingLicense", "Teaching license is required.")
    require("appointmentLetter", "Appointment letter is required.")

    # Only required when the two qualifications actually differ -- if
    # they're the same, `degree` above already covers it.
    min_q = get_field("minQualification")
    highest_q = get_field("highestQualification")
    if min_q and highest_q and min_q != highest_q:
        require(
            "highestQualificationDocument",
            "Highest Qualification document is required when it differs from Minimum Qualification.",
        )

    # Appointment Date applies to every teacherType.
    require("appointmentDate", "Appointment Date is required.")

    teacher_type = get_field("teacherType")
    if teacher_type == "permanent":
        # Extraordinary Leave Taken is only ever shown/collected for
        # Permanent teachers -- required for them, not applicable
        # otherwise.
        require("extraordinaryLeave", "Extraordinary Leave Taken is required for Permanent teachers.")

        was_different = get_field("wasDifferentTypeBeforePermanent")
        if was_different is None:
            errors["wasDifferentTypeBeforePermanent"] = (
                "Please specify whether you were appointed under a different type before becoming Permanent."
            )
        elif was_different:
            require(
                "permanentAppointmentDate",
                "Appointment Date (as Permanent) is required when you were a different type before.",
            )

        grade = get_field("grade")
        if grade == "second":
            require("promotionDate", "Promotion Date is required for Grade Second.")
        elif grade == "first":
            require("promotionDate", "Promotion Date (Third → Second) is required for Grade First.")
            require("promotionDate2", "Promotion Date (Second → First) is required for Grade First.")

        # Special Promotion -- Permanent-only, like the fields above (not
        # related to the grade-based promotionDate/promotionDate2 ladder).
        specially_promoted = get_field("isSpeciallyPromoted")
        if specially_promoted is None:
            errors["isSpeciallyPromoted"] = (
                "Please specify whether you have been specially promoted."
            )
        elif specially_promoted:
            require(
                "specialPromotionDate",
                "Special Promotion Date is required when you have been specially promoted.",
            )

    return errors
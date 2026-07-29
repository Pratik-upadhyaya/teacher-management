from django.contrib import admin

from .models import Teacher


@admin.register(Teacher)
class TeacherAdmin(admin.ModelAdmin):
    list_display = (
        'name', 'email', 'schoolName', 'district', 'status',
        'extraordinaryLeaveRemaining', 'created_at',
    )
    list_editable = ('status', 'extraordinaryLeaveRemaining')
    list_filter = ('status', 'district', 'level')
    search_fields = ('name', 'email', 'phone', 'schoolName', 'tokenNo')
    readonly_fields = ('created_at', 'password')
    # `password` is excluded from editing (shown read-only above so it's
    # visible that a value exists, without making it easy to view/change
    # by accident) -- self-registration credential handling is out of
    # scope for this change.
    fieldsets = (
        ('Personal Info', {'fields': (
            'name', 'nameEnglish', 'fatherName', 'gender', 'permanentAddress', 'permanentWardNo',
            'dob', 'phone', 'email', 'password',
        )}),
        ('School Info', {'fields': (
            'district', 'municipality', 'wardNo', 'schoolName',
            'schoolEmisCode', 'school', 'tokenNo', 'subject', 'subjectEnglish', 'level',
            'grade', 'teacherType',
        )}),
        ('Service Info', {'fields': (
            'appointmentDate', 'promotionDate', 'minQualification', 'highestQualification',
            'extraordinaryLeave', 'extraordinaryLeaveRemaining',
            'ageSixtyYear', 'remarks',
        )}),
        ('Documents', {'fields': (
            'citizenship', 'degree', 'photo', 'teachingLicense',
            'appointmentLetter', 'seeSlcCertificate',
        )}),
        ('Review Status', {'fields': ('status', 'reviewed_by', 'created_at')}),
    )
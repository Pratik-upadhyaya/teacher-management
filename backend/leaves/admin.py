from django.contrib import admin

from .models import LeaveApplication, LeaveType


@admin.register(LeaveType)
class LeaveTypeAdmin(admin.ModelAdmin):
    list_display = ('name', 'name_np', 'annual_quota_days', 'is_lifetime', 'is_active')
    list_editable = ('annual_quota_days', 'is_active')


@admin.register(LeaveApplication)
class LeaveApplicationAdmin(admin.ModelAdmin):
    list_display = ('teacher', 'leave_type', 'start_date', 'end_date', 'days_count', 'year', 'created_at')
    list_filter = ('leave_type', 'year')
    search_fields = ('teacher__name', 'teacher__email')
    readonly_fields = ('created_at',)
from django.urls import path
from .views import (
    school_list_create,
    school_detail,
    my_school,
    approve_school,
    reject_school,
    export_school_report,
    export_all_schools_report,
    public_school_reference,
)

urlpatterns = [
    path('', school_list_create),
    path('me/', my_school),
    path('public-reference/', public_school_reference),
    path('export-all/', export_all_schools_report),
    path('<int:school_id>/approve/', approve_school),
    path('<int:school_id>/reject/', reject_school),
    path('<int:school_id>/export/', export_school_report),
    path('<int:school_id>/', school_detail),
]
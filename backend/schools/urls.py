from django.urls import path
from .views import school_list_create, my_school, approve_school, reject_school, export_school_report

urlpatterns = [
    path('', school_list_create),
    path('me/', my_school),
    path('<int:school_id>/approve/', approve_school),
    path('<int:school_id>/reject/', reject_school),
    path('<int:school_id>/export/', export_school_report),
]
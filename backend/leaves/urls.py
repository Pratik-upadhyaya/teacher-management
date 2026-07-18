from django.urls import path
from .views import leave_type_list, my_leave_applications, my_leave_summary

urlpatterns = [
    path('types/', leave_type_list),
    path('mine/', my_leave_applications),
    path('summary/', my_leave_summary),
]
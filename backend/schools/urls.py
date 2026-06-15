from django.urls import path
from .views import school_list_create

urlpatterns = [
    path('', school_list_create),
]
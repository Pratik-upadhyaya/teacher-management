from django.urls import path
from .views import (
    my_document_requests,
    document_request_list,
    approve_document_request,
    reject_document_request,
)

urlpatterns = [
    path('change-requests/', document_request_list),
    path('change-requests/mine/', my_document_requests),
    path('change-requests/<int:request_id>/approve/', approve_document_request),
    path('change-requests/<int:request_id>/reject/', reject_document_request),
]
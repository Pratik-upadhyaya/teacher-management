from django.urls import path
from .views import (
    my_transfer_requests,
    transfer_request_list,
    approve_transfer_request,
    reject_transfer_request,
)

urlpatterns = [
    path('requests/', transfer_request_list),
    path('requests/mine/', my_transfer_requests),
    path('requests/<int:request_id>/approve/', approve_transfer_request),
    path('requests/<int:request_id>/reject/', reject_transfer_request),
]
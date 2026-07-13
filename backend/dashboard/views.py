from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from teachers.models import Teacher
from accounts.permissions import IsAdminOrPrincipal


@api_view(['GET'])
@permission_classes([IsAuthenticated, IsAdminOrPrincipal])
def dashboard_stats(request):
    total_teachers = Teacher.objects.count()
    pending = Teacher.objects.filter(status='pending').count()
    approved = Teacher.objects.filter(status='approved').count()
    rejected = Teacher.objects.filter(status='rejected').count()

    pending_teachers = Teacher.objects.filter(status='pending').values(
        'id',
        'name',
        'tokenNo',
        'subject'
    )

    approved_teachers = Teacher.objects.filter(status='approved').values(
        'id',
        'name',
        'tokenNo',
        'subject',
        'phone',
        'email'
    )

  
    rejected_teachers = Teacher.objects.filter(status='rejected').values(
        'id',
        'name',
        'tokenNo',
        'subject',
        'phone',
        'email',
        'remarks'
    )

    data = {
        "total_teachers": total_teachers,
        "pending_approvals": pending,
        "approved": approved,
        "rejected": rejected,
        "pending_teachers": list(pending_teachers),
        "approved_teachers": list(approved_teachers),
        "rejected_teachers": list(rejected_teachers),
    }

    return Response(data)
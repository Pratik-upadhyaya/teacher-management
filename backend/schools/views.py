from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from .models import School
from .serializers import SchoolSerializer
from accounts.permissions import IsAdminOrPrincipal


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def school_list_create(request):
    # GET: any authenticated user may view schools.
    # POST: creating a school record is restricted to admin/principal --
    # flag for Pratik to confirm this matches the intended workflow.
    if request.method == 'POST' and not IsAdminOrPrincipal().has_permission(request, None):
        return Response({"error": "Only admins or principals can create schools."}, status=403)
    if request.method == 'GET':
        schools = School.objects.all()
        serializer = SchoolSerializer(schools, many=True)
        return Response(serializer.data)

    if request.method == 'POST':
        data = request.data.copy()

        mapped_data = {
            "emis_code": data.get("emis_code"),
            "school_name": data.get("school_name"),
            "address": data.get("address"),
            "contact": data.get("contact"),
            "email": data.get("email"),
            "established_bs": data.get("established_date"),
            "permission_date_bs": data.get("permission_date"),

            # Step 2
            "bal_kaksha": data.get("bal_kaksha_year"),
            "primary_1_5": data.get("primary_1_5_year"),
            "lower_secondary_6_8": data.get("lower_sec_6_8_year"),
            "secondary_9_10": data.get("secondary_9_10_year"),
            "secondary_11_12": data.get("secondary_11_12_year"),

            # Step 3
            "computer_lab": data.get("computer_lab") == "true",
            "science_lab": data.get("science_lab") == "true",
            "library": data.get("library") == "true",
            "book_corner": data.get("book_corner") == "true",
            "playground": data.get("playground") == "true",

            "land_area": data.get("land_area") or 0,
            "land_unit": data.get("land_unit"),
            "building_count": data.get("num_buildings") or 0,
            "classroom_count": data.get("num_classrooms") or 0,
            "female_toilets": data.get("toilet_female") or 0,
            "male_toilets": data.get("toilet_male") or 0,
        }

        serializer = SchoolSerializer(data=mapped_data)

        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=201)

        return Response(serializer.errors, status=400)
from rest_framework.views import exception_handler
from rest_framework.response import Response
from rest_framework import status

def custom_exception_handler(exc, context):
    # Call REST framework's default exception handler first,
    # to get the standard error response.
    response = exception_handler(exc, context)

    # Now add the HTTP status code to the response.
    if response is not None:
        # Only add status_code if response.data is a dict (not a list)
        if isinstance(response.data, dict):
            response.data['status_code'] = response.status_code
    else:
        # Avoid exposing stack traces. Log internally if necessary.
        return Response(
            {"detail": "Internal Server Error"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

    return response

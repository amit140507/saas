from rest_framework.views import exception_handler
from rest_framework import status

def custom_exception_handler(exc, context):
    response = exception_handler(exc, context)

    if response is None:
        return response

    if "detail" in response.data:
        message = str(response.data["detail"])

        if response.status_code == status.HTTP_403_FORBIDDEN:
            code = "permission_denied"
        elif response.status_code == status.HTTP_401_UNAUTHORIZED:
            code = "authentication_failed"
        elif response.status_code == status.HTTP_404_NOT_FOUND:
            code = "not_found"
        else:
            code = "error"

        response.data = {
            "error": {
                "code": code,
                "message": message,
            }
        }

    return response
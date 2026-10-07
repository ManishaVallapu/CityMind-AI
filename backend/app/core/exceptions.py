from typing import Any, Optional
from fastapi import HTTPException, status


class CityMindHTTPException(HTTPException):
    def __init__(
        self,
        status_code: int,
        detail: str,
        code: str = "ERROR",
        extra: Optional[Any] = None,
    ):
        super().__init__(
            status_code=status_code,
            detail={"success": False, "code": code, "message": detail, "extra": extra},
        )


class AuthenticationError(CityMindHTTPException):
    def __init__(self, detail: str = "Could not validate credentials"):
        super().__init__(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=detail,
            code="AUTHENTICATION_FAILED",
        )


class AuthorizationError(CityMindHTTPException):
    def __init__(self, detail: str = "You do not have permission to perform this action"):
        super().__init__(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=detail,
            code="PERMISSION_DENIED",
        )


class NotFoundError(CityMindHTTPException):
    def __init__(self, detail: str = "Resource not found"):
        super().__init__(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=detail,
            code="RESOURCE_NOT_FOUND",
        )


class ConflictError(CityMindHTTPException):
    def __init__(self, detail: str = "Resource conflict"):
        super().__init__(
            status_code=status.HTTP_409_CONFLICT,
            detail=detail,
            code="RESOURCE_CONFLICT",
        )


class BadRequestError(CityMindHTTPException):
    def __init__(self, detail: str = "Invalid request"):
        super().__init__(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=detail,
            code="BAD_REQUEST",
        )


class PayloadTooLargeError(CityMindHTTPException):
    def __init__(self, detail: str = "File size exceeds maximum permitted limit"):
        super().__init__(
            status_code=413,
            detail=detail,
            code="PAYLOAD_TOO_LARGE",
        )



class UnsupportedMediaTypeError(CityMindHTTPException):
    def __init__(self, detail: str = "Unsupported media type"):
        super().__init__(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail=detail,
            code="UNSUPPORTED_MEDIA_TYPE",
        )


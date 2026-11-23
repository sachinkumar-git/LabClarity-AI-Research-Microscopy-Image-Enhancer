"""Domain errors and FastAPI handlers producing the shared JSON error envelope."""
from __future__ import annotations

import logging

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

logger = logging.getLogger("labclarity.errors")


class ServiceError(Exception):
    """Operational error with an HTTP status and a stable machine-readable code."""

    status_code = 500
    code = "INTERNAL_ERROR"

    def __init__(self, message: str):
        super().__init__(message)
        self.message = message


class BadRequestError(ServiceError):
    status_code, code = 400, "VALIDATION_ERROR"


class InvalidImageError(ServiceError):
    status_code, code = 400, "INVALID_IMAGE"


class ImageTooLargeError(ServiceError):
    status_code, code = 413, "IMAGE_TOO_LARGE"


class UnknownModelError(ServiceError):
    status_code, code = 404, "UNKNOWN_MODEL"


class ModelUnavailableError(ServiceError):
    status_code, code = 422, "MODEL_UNAVAILABLE"


class UnauthorizedError(ServiceError):
    status_code, code = 401, "UNAUTHORIZED"


class InferenceError(ServiceError):
    status_code, code = 500, "INFERENCE_FAILED"


def _envelope(status: int, code: str, message: str, details=None) -> JSONResponse:
    error = {"code": code, "message": message}
    if details:
        error["details"] = details
    return JSONResponse(status_code=status, content={"success": False, "error": error})


def register_error_handlers(app: FastAPI) -> None:
    @app.exception_handler(ServiceError)
    async def _service_error(_: Request, exc: ServiceError):
        if exc.status_code >= 500:
            logger.error("%s: %s", exc.code, exc.message)
        return _envelope(exc.status_code, exc.code, exc.message)

    @app.exception_handler(RequestValidationError)
    async def _validation_error(_: Request, exc: RequestValidationError):
        details = [f"{'.'.join(map(str, e['loc']))}: {e['msg']}" for e in exc.errors()]
        return _envelope(422, "VALIDATION_ERROR", "Invalid request", details)

    @app.exception_handler(StarletteHTTPException)
    async def _http_error(_: Request, exc: StarletteHTTPException):
        code = "NOT_FOUND" if exc.status_code == 404 else "HTTP_ERROR"
        return _envelope(exc.status_code, code, str(exc.detail))

    @app.exception_handler(Exception)
    async def _unhandled(_: Request, exc: Exception):
        logger.exception("Unhandled error: %s", exc)
        return _envelope(500, "INTERNAL_ERROR", "An unexpected error occurred")

"""Standard error classes and FastAPI exception handlers."""

from __future__ import annotations

from typing import Any

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

from civitro_common.logger import get_logger

log = get_logger(__name__)


# ---------------------------------------------------------------------------
# Base exception hierarchy
# ---------------------------------------------------------------------------


class CivitroError(Exception):
    """Base exception for all Civitro application errors."""

    status_code: int = 500
    error_code: str = "INTERNAL_ERROR"

    def __init__(
        self,
        message: str = "An internal error occurred",
        *,
        detail: Any = None,
    ) -> None:
        super().__init__(message)
        self.message = message
        self.detail = detail


class NotFoundError(CivitroError):
    status_code = 404
    error_code = "NOT_FOUND"

    def __init__(self, resource: str = "Resource", id: str | None = None) -> None:
        msg = f"{resource} not found" if id is None else f"{resource} '{id}' not found"
        super().__init__(msg)


class BadRequestError(CivitroError):
    status_code = 400
    error_code = "BAD_REQUEST"


class ConflictError(CivitroError):
    status_code = 409
    error_code = "CONFLICT"


class UnauthorizedError(CivitroError):
    status_code = 401
    error_code = "UNAUTHORIZED"

    def __init__(self, message: str = "Authentication required") -> None:
        super().__init__(message)


class ForbiddenError(CivitroError):
    status_code = 403
    error_code = "FORBIDDEN"

    def __init__(self, message: str = "Access denied") -> None:
        super().__init__(message)


class ValidationError(CivitroError):
    status_code = 422
    error_code = "VALIDATION_ERROR"


class RateLimitError(CivitroError):
    status_code = 429
    error_code = "RATE_LIMITED"

    def __init__(self, message: str = "Too many requests") -> None:
        super().__init__(message)


class ServiceUnavailableError(CivitroError):
    status_code = 503
    error_code = "SERVICE_UNAVAILABLE"

    def __init__(self, service: str = "Downstream service") -> None:
        super().__init__(f"{service} is temporarily unavailable")


class PaymentRequiredError(CivitroError):
    status_code = 402
    error_code = "PAYMENT_REQUIRED"

    def __init__(self, message: str = "Subscription or payment required") -> None:
        super().__init__(message)


# ---------------------------------------------------------------------------
# FastAPI exception handlers
# ---------------------------------------------------------------------------


def _civitro_error_response(exc: CivitroError) -> JSONResponse:
    body: dict[str, Any] = {
        "error": exc.error_code,
        "message": exc.message,
    }
    if exc.detail is not None:
        body["detail"] = exc.detail
    return JSONResponse(status_code=exc.status_code, content=body)


async def _civitro_exception_handler(_request: Request, exc: CivitroError) -> JSONResponse:
    if exc.status_code >= 500:
        log.error("server error", error=exc.error_code, message=exc.message)
    else:
        log.warning("client error", error=exc.error_code, message=exc.message)
    return _civitro_error_response(exc)


async def _generic_exception_handler(_request: Request, exc: Exception) -> JSONResponse:
    log.exception("unhandled exception", error=str(exc))
    return JSONResponse(
        status_code=500,
        content={"error": "INTERNAL_ERROR", "message": "An unexpected error occurred"},
    )


def register_exception_handlers(app: FastAPI) -> None:
    """Register Civitro exception handlers on a FastAPI application."""
    app.add_exception_handler(CivitroError, _civitro_exception_handler)  # type: ignore[arg-type]
    app.add_exception_handler(Exception, _generic_exception_handler)

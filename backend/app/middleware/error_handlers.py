from fastapi import Request
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException


async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "detail": exc.detail,
            "status_code": exc.status_code,
            "request_id": getattr(request.state, "request_id", None),
        },
    )


async def validation_exception_handler(request: Request, exc):
    return JSONResponse(
        status_code=422,
        content={
            "detail": "Validation error",
            "errors": exc.errors() if hasattr(exc, "errors") else str(exc),
            "status_code": 422,
            "request_id": getattr(request.state, "request_id", None),
        },
    )


async def general_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=500,
        content={
            "detail": "Internal server error",
            "status_code": 500,
            "request_id": getattr(request.state, "request_id", None),
        },
    )

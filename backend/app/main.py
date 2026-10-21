"""
Main FastAPI Application Entrypoint for LastPlate.
Initializes lifespan events, CORS middleware, custom exception handlers,
and registers all versioned API routes.
"""

import time
from contextlib import asynccontextmanager
from typing import AsyncGenerator

from fastapi import FastAPI, HTTPException, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.v1.api import api_router
from app.core.config import settings
from app.core.logging import get_logger, setup_logging
from app.schemas.common import ErrorDetail, ErrorEnvelope

# Initialize application logger
setup_logging()
logger = get_logger("lastplate.main")


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """
    Application lifespan context manager.
    Handles startup configuration and graceful teardown tasks.
    """
    logger.info(
        f"Starting {settings.PROJECT_NAME} v{settings.VERSION} "
        f"[env={settings.ENVIRONMENT}, debug={settings.DEBUG}]"
    )
    logger.info(f"Allowed CORS origins: {settings.ALLOWED_ORIGINS}")
    yield
    logger.info(f"Shutting down {settings.PROJECT_NAME} gracefully...")


# FastAPI application instance
app = FastAPI(
    title=settings.PROJECT_NAME,
    description=settings.PROJECT_DESCRIPTION,
    version=settings.VERSION,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# Configure Cross-Origin Resource Sharing (CORS)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Request timing middleware
@app.middleware("http")
async def add_process_time_header(request: Request, call_next):
    """Measures total request processing time and adds X-Process-Time header."""
    start_time = time.perf_counter()
    response = await call_next(request)
    process_time = (time.perf_counter() - start_time) * 1000  # ms
    response.headers["X-Process-Time"] = f"{process_time:.2f}ms"
    return response


# Global Exception Handlers for Standardized Envelopes
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(
    request: Request, exc: RequestValidationError
) -> JSONResponse:
    """Format Pydantic schema validation failures into standard ErrorEnvelope."""
    error_details = []
    for err in exc.errors():
        field_path = " -> ".join(str(loc) for loc in err.get("loc", []))
        error_details.append(
            ErrorDetail(
                field=field_path,
                message=err.get("msg", "Invalid value"),
                error_type=err.get("type", "value_error"),
            )
        )

    envelope = ErrorEnvelope(
        success=False,
        error_code="VALIDATION_ERROR",
        message="Request body or query parameter validation failed.",
        details=error_details,
    )
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
        content=envelope.model_dump(),
    )


from starlette.exceptions import HTTPException as StarletteHTTPException


@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(
    request: Request, exc: StarletteHTTPException
) -> JSONResponse:
    """Format explicit HTTPExceptions and 404s into standard ErrorEnvelope."""
    envelope = ErrorEnvelope(
        success=False,
        error_code=f"HTTP_{exc.status_code}",
        message=str(exc.detail),
        details=None,
    )
    return JSONResponse(
        status_code=exc.status_code,
        content=envelope.model_dump(),
    )


@app.exception_handler(Exception)
async def unhandled_exception_handler(
    request: Request, exc: Exception
) -> JSONResponse:
    """Catch unhandled errors, log traceback, and return standard ErrorEnvelope."""
    logger.exception(f"Unhandled server error on {request.method} {request.url.path}: {exc}")
    message = (
        str(exc)
        if settings.DEBUG
        else "An internal server error occurred. Please try again later."
    )
    envelope = ErrorEnvelope(
        success=False,
        error_code="INTERNAL_SERVER_ERROR",
        message=message,
        details=None,
    )
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content=envelope.model_dump(),
    )


# Root welcome endpoint
@app.get("/", tags=["Root"])
async def root_overview() -> dict:
    """Root overview providing quick access to API docs and version info."""
    return {
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "environment": settings.ENVIRONMENT,
        "documentation": "/docs",
        "api_v1_prefix": settings.API_V1_STR,
        "health_check": f"{settings.API_V1_STR}/health",
    }


# Mount API v1 router
app.include_router(api_router, prefix=settings.API_V1_STR)

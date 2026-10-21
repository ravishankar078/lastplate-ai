"""
Standardized API Schemas and Response Envelopes.
Ensures uniform contract across all HTTP responses, errors, and health checks.
"""

from datetime import datetime
from typing import Any, Generic, List, Optional, TypeVar
from pydantic import BaseModel, Field

DataT = TypeVar("DataT")


class ResponseEnvelope(BaseModel, Generic[DataT]):
    """Standard success wrapper for single item or data payload."""

    success: bool = Field(default=True, description="Indicates request success.")
    message: Optional[str] = Field(
        default=None, description="Human-readable informational message."
    )
    data: Optional[DataT] = Field(
        default=None, description="Response payload."
    )


class PaginatedResponse(BaseModel, Generic[DataT]):
    """Standard pagination wrapper for list results."""

    success: bool = Field(default=True, description="Indicates request success.")
    total: int = Field(..., description="Total count of items matching query.")
    page: int = Field(default=1, description="Current page number (1-indexed).")
    page_size: int = Field(default=20, description="Items per page.")
    items: List[DataT] = Field(default_factory=list, description="Page items.")


class ErrorDetail(BaseModel):
    """Field-level error detail."""

    field: Optional[str] = Field(
        default=None, description="Field path causing validation error."
    )
    message: str = Field(..., description="Validation failure explanation.")
    error_type: Optional[str] = Field(
        default=None, description="Pydantic validation error type tag."
    )


class ErrorEnvelope(BaseModel):
    """Standardized error envelope for all 4xx/5xx responses."""

    success: bool = Field(default=False, description="Always False for error responses.")
    error_code: str = Field(..., description="Machine-readable error identifier.")
    message: str = Field(..., description="Human-readable error explanation.")
    details: Optional[List[ErrorDetail]] = Field(
        default=None, description="Field-level validation error details when applicable."
    )


class HealthResponse(BaseModel):
    """System health and liveness payload."""

    status: str = Field(default="healthy", description="Application status: healthy or degraded.")
    app: str = Field(..., description="Application name.")
    version: str = Field(..., description="Application version.")
    environment: str = Field(..., description="Current running environment.")
    timestamp: datetime = Field(
        default_factory=datetime.utcnow, description="Server UTC timestamp."
    )


class ReadinessResponse(BaseModel):
    """System readiness probe payload (checks external dependencies)."""

    ready: bool = Field(..., description="Readiness status for receiving traffic.")
    services: dict = Field(
        default_factory=dict, description="Status of dependent downstream services."
    )
    timestamp: datetime = Field(
        default_factory=datetime.utcnow, description="Server UTC timestamp."
    )

"""
AuditLog ORM Model.
Provides an immutable record of all operational state transitions, claims,
volunteer handovers, safety holds, and administrative approvals.
"""

from datetime import datetime
from typing import Optional
import uuid
from sqlalchemy import DateTime, ForeignKey, String, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, UUIDPrimaryKeyMixin


class AuditLog(Base, UUIDPrimaryKeyMixin):
    """Immutable audit trail entry for regulatory compliance and food safety tracking."""

    __tablename__ = "audit_logs"

    entity_type: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    entity_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), nullable=False, index=True
    )
    action: Mapped[str] = mapped_column(String(100), nullable=False, index=True)

    actor_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    actor_role: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)

    payload_before: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    payload_after: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)

    ip_address: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    timestamp: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
        index=True,
    )

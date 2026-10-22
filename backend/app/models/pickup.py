"""
Pickup ORM Model.
Tracks collection and delivery operational execution, assigned volunteer,
and secure single-use expiring QR/PIN verification tokens.
"""

from datetime import datetime
from typing import TYPE_CHECKING, List, Optional
import uuid
from sqlalchemy import Boolean, DateTime, Enum, ForeignKey, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin, UUIDPrimaryKeyMixin

if TYPE_CHECKING:
    from app.models.donation import Donation
    from app.models.organization import Organization
    from app.models.route import RouteStop
    from app.models.user import User


class Pickup(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Operational pickup and delivery lifecycle record."""

    __tablename__ = "pickups"

    donation_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("donations.id", ondelete="CASCADE"),
        unique=True,
        nullable=False,
        index=True,
    )

    recipient_organization_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    volunteer_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    status: Mapped[str] = mapped_column(
        Enum(
            "pending_volunteer",
            "assigned",
            "collected",
            "delivered",
            "failed",
            name="pickup_status_enum",
            create_type=True,
        ),
        default="pending_volunteer",
        nullable=False,
        index=True,
    )

    scheduled_pickup_time: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    estimated_delivery_time: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    actual_pickup_time: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    actual_delivery_time: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    # Secure Single-Use Expiring Verification Token & Backup PIN
    verification_pin: Mapped[str] = mapped_column(String(10), nullable=False)
    verification_token: Mapped[str] = mapped_column(
        String(255), unique=True, nullable=False, index=True
    )
    token_expires_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )
    is_token_used: Mapped[bool] = mapped_column(
        Boolean, default=False, nullable=False
    )

    # Relationships
    donation: Mapped["Donation"] = relationship(
        "Donation", back_populates="pickup"
    )
    recipient_organization: Mapped["Organization"] = relationship(
        "Organization", back_populates="received_pickups"
    )
    volunteer: Mapped[Optional["User"]] = relationship(
        "User", back_populates="assigned_pickups"
    )
    route_stops: Mapped[List["RouteStop"]] = relationship(
        "RouteStop", back_populates="pickup"
    )

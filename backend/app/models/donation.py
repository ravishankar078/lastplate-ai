"""
Donation ORM Model.
Represents surplus food posts with quantity, safety parameters, storage conditions,
and strict lifecycle state machine.
"""

from datetime import datetime
from typing import TYPE_CHECKING, List, Optional
import uuid
from sqlalchemy import DateTime, Enum, Float, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin, UUIDPrimaryKeyMixin

if TYPE_CHECKING:
    from app.models.match import Match
    from app.models.organization import Organization
    from app.models.pickup import Pickup


class Donation(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Surplus food donation entity with complete food safety and traceability attributes."""

    __tablename__ = "donations"

    donor_organization_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    food_type: Mapped[str] = mapped_column(
        Enum(
            "cooked_meals",
            "bakery",
            "raw_produce",
            "packaged_goods",
            "dairy_chilled",
            name="food_type_enum",
            create_type=True,
        ),
        nullable=False,
        index=True,
    )

    quantity_kg: Mapped[float] = mapped_column(Float, nullable=False)
    portions: Mapped[int] = mapped_column(Integer, nullable=False)

    # Food Safety & Collection Windows
    preparation_time: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )
    pickup_deadline: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, index=True
    )

    storage_condition: Mapped[str] = mapped_column(
        Enum(
            "ambient",
            "refrigerated",
            "frozen",
            "hot_holding",
            name="storage_condition_enum",
            create_type=True,
        ),
        nullable=False,
    )

    allergens: Mapped[list] = mapped_column(JSONB, default=list, nullable=False)
    measured_temp_c: Mapped[Optional[float]] = mapped_column(Float, nullable=True)

    # Finite State Machine Status
    status: Mapped[str] = mapped_column(
        Enum(
            "available",
            "matched",
            "accepted",
            "assigned",
            "in_transit",
            "delivered",
            "cancelled",
            "safety_hold",
            name="donation_status_enum",
            create_type=True,
        ),
        default="available",
        nullable=False,
        index=True,
    )

    safety_notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Relationships
    donor_organization: Mapped["Organization"] = relationship(
        "Organization", back_populates="donations"
    )
    matches: Mapped[List["Match"]] = relationship(
        "Match", back_populates="donation", cascade="all, delete-orphan"
    )
    pickup: Mapped[Optional["Pickup"]] = relationship(
        "Pickup", back_populates="donation", uselist=False
    )

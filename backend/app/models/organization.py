"""
Organization ORM Model.
Represents Donor organizations (restaurants, caterers, bakeries) and
Recipient organizations (NGO shelters, community kitchens, food banks).
"""

from typing import TYPE_CHECKING, List, Optional
from sqlalchemy import Boolean, Enum, Float, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin, UUIDPrimaryKeyMixin

if TYPE_CHECKING:
    from app.models.donation import Donation
    from app.models.match import Match
    from app.models.pickup import Pickup
    from app.models.user import User


class Organization(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Organization entity with geospatial location, operational capacity, and verification status."""

    __tablename__ = "organizations"

    name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    org_type: Mapped[str] = mapped_column(
        Enum(
            "restaurant",
            "bakery",
            "caterer",
            "canteen",
            "event_organizer",
            "ngo_shelter",
            "community_kitchen",
            "food_bank",
            name="org_type_enum",
            create_type=True,
        ),
        nullable=False,
        index=True,
    )

    address: Mapped[str] = mapped_column(String(255), nullable=False)
    postal_code: Mapped[str] = mapped_column(String(30), nullable=False)

    # Geospatial Coordinates (SRID 4326 WGS-84)
    latitude: Mapped[float] = mapped_column(Float, nullable=False, index=True)
    longitude: Mapped[float] = mapped_column(Float, nullable=False, index=True)

    contact_phone: Mapped[str] = mapped_column(String(50), nullable=False)
    contact_email: Mapped[str] = mapped_column(String(255), nullable=False)

    is_verified: Mapped[bool] = mapped_column(
        Boolean, default=False, nullable=False, index=True
    )
    verification_notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Operational Capacity & Handling Capabilities
    max_daily_meals: Mapped[int] = mapped_column(
        Integer, default=100, nullable=False
    )
    refrigeration_available: Mapped[bool] = mapped_column(
        Boolean, default=True, nullable=False
    )

    # JSON configuration structures
    operating_hours: Mapped[Optional[dict]] = mapped_column(
        JSONB, nullable=True, default=dict
    )
    dietary_capabilities: Mapped[Optional[list]] = mapped_column(
        JSONB, nullable=True, default=list
    )

    # Relationships
    users: Mapped[List["User"]] = relationship(
        "User", back_populates="organization"
    )
    donations: Mapped[List["Donation"]] = relationship(
        "Donation", back_populates="donor_organization"
    )
    received_matches: Mapped[List["Match"]] = relationship(
        "Match", back_populates="recipient_organization"
    )
    received_pickups: Mapped[List["Pickup"]] = relationship(
        "Pickup", back_populates="recipient_organization"
    )

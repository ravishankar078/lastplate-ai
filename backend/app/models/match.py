"""
Match ORM Model.
Represents AI-ranked candidate pairings between surplus donations and eligible NGOs.
Enforces atomic acceptance and transparent score breakdown.
"""

from typing import TYPE_CHECKING
import uuid
from sqlalchemy import Enum, Float, ForeignKey, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin, UUIDPrimaryKeyMixin

if TYPE_CHECKING:
    from app.models.donation import Donation
    from app.models.organization import Organization


class Match(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Candidate match recommendation linking a donation to an eligible recipient."""

    __tablename__ = "matches"
    __table_args__ = (
        UniqueConstraint("donation_id", "recipient_organization_id", name="uq_donation_recipient_match"),
    )

    donation_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("donations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    recipient_organization_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    score: Mapped[float] = mapped_column(Float, nullable=False, index=True)
    score_breakdown: Mapped[dict] = mapped_column(
        JSONB,
        nullable=False,
        default=lambda: {
            "distance": 0.0,
            "urgency": 0.0,
            "capacity": 0.0,
            "reliability": 0.0,
        },
    )

    status: Mapped[str] = mapped_column(
        Enum(
            "suggested",
            "accepted",
            "declined",
            "expired",
            name="match_status_enum",
            create_type=True,
        ),
        default="suggested",
        nullable=False,
        index=True,
    )

    # Relationships
    donation: Mapped["Donation"] = relationship(
        "Donation", back_populates="matches"
    )
    recipient_organization: Mapped["Organization"] = relationship(
        "Organization", back_populates="received_matches"
    )

"""
Notification ORM Model.
Stores notifications for match offers, volunteer assignments, handovers, and safety alerts.
"""

from typing import TYPE_CHECKING
import uuid
from sqlalchemy import Boolean, Enum, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin, UUIDPrimaryKeyMixin

if TYPE_CHECKING:
    from app.models.user import User


class Notification(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """User notification entity for operational and safety events."""

    __tablename__ = "notifications"

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    title: Mapped[str] = mapped_column(String(255), nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)

    notification_type: Mapped[str] = mapped_column(
        Enum(
            "match_offer",
            "volunteer_assigned",
            "pickup_ready",
            "delivery_confirmed",
            "safety_alert",
            name="notification_type_enum",
            create_type=True,
        ),
        nullable=False,
        index=True,
    )

    is_read: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    metadata_json: Mapped[dict] = mapped_column(JSONB, default=dict, nullable=False)

    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="notifications")

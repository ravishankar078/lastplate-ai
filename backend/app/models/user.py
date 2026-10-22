"""
User ORM Model.
Represents individual accounts for Food Donors, NGOs, Volunteers, and Admins.
"""

from typing import TYPE_CHECKING, List, Optional
import uuid
from sqlalchemy import Boolean, Enum, ForeignKey, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin, UUIDPrimaryKeyMixin

if TYPE_CHECKING:
    from app.models.notification import Notification
    from app.models.organization import Organization
    from app.models.pickup import Pickup
    from app.models.route import Route


class User(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """User account entity with role-based authorization attributes."""

    __tablename__ = "users"

    email: Mapped[str] = mapped_column(
        String(255), unique=True, index=True, nullable=False
    )
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    phone: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)

    role: Mapped[str] = mapped_column(
        Enum(
            "donor",
            "ngo",
            "volunteer",
            "admin",
            name="user_role_enum",
            create_type=True,
        ),
        nullable=False,
        index=True,
    )

    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    is_verified: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    organization_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("organizations.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    # Relationships
    organization: Mapped[Optional["Organization"]] = relationship(
        "Organization", back_populates="users", foreign_keys=[organization_id]
    )
    routes: Mapped[List["Route"]] = relationship(
        "Route", back_populates="volunteer"
    )
    assigned_pickups: Mapped[List["Pickup"]] = relationship(
        "Pickup", back_populates="volunteer"
    )
    notifications: Mapped[List["Notification"]] = relationship(
        "Notification", back_populates="user", cascade="all, delete-orphan"
    )

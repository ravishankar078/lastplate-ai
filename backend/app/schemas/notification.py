"""
Pydantic Schemas for In-App Notifications.
Enforces typed payloads for operational and safety alerts across roles.
"""

from datetime import datetime
from typing import Any, Dict, Optional
import uuid
from pydantic import BaseModel, Field


class NotificationResponse(BaseModel):
    """Notification entity representation returned to users."""

    id: uuid.UUID
    user_id: uuid.UUID
    title: str
    message: str
    notification_type: str
    is_read: bool
    metadata_json: Dict[str, Any] = Field(default_factory=dict)
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class UnreadCountResponse(BaseModel):
    """Unread notifications tally."""

    unread_count: int

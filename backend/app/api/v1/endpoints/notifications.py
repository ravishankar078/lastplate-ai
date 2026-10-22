"""
In-App Notifications API Endpoints.
Allows users to retrieve match offer alerts, operational updates, and mark notifications as read.
"""

from typing import List, Optional
import uuid
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_active_user
from app.db.session import get_db
from app.models.notification import Notification
from app.models.user import User
from app.schemas.common import ResponseEnvelope
from app.schemas.notification import NotificationResponse, UnreadCountResponse

router = APIRouter()


@router.get(
    "",
    response_model=ResponseEnvelope[List[NotificationResponse]],
    summary="List current user's notifications",
)
async def list_notifications(
    unread_only: bool = Query(False, alias="unreadOnly"),
    limit: int = Query(50, ge=1, le=100),
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
) -> ResponseEnvelope[List[NotificationResponse]]:
    """Retrieves operational and safety notifications for the authenticated user."""
    stmt = select(Notification).where(Notification.user_id == current_user.id)
    if unread_only:
        stmt = stmt.where(Notification.is_read == False)  # noqa: E712

    stmt = stmt.order_by(Notification.created_at.desc()).limit(limit)
    res = await db.execute(stmt)
    notifications = res.scalars().all()

    return ResponseEnvelope[List[NotificationResponse]](
        success=True,
        message=f"Retrieved {len(notifications)} notifications.",
        data=list(notifications),
    )


@router.get(
    "/unread-count",
    response_model=ResponseEnvelope[UnreadCountResponse],
    summary="Get unread notification count",
)
async def get_unread_count(
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
) -> ResponseEnvelope[UnreadCountResponse]:
    """Returns the total number of unread notifications for the user badge."""
    stmt = (
        select(func.count())
        .select_from(Notification)
        .where(
            Notification.user_id == current_user.id,
            Notification.is_read == False,  # noqa: E712
        )
    )
    res = await db.execute(stmt)
    count = res.scalar_one() or 0

    return ResponseEnvelope[UnreadCountResponse](
        success=True,
        message="Unread notification count retrieved.",
        data=UnreadCountResponse(unread_count=count),
    )


@router.patch(
    "/{notification_id}/read",
    response_model=ResponseEnvelope[NotificationResponse],
    summary="Mark single notification as read",
)
async def mark_notification_as_read(
    notification_id: uuid.UUID,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
) -> ResponseEnvelope[NotificationResponse]:
    """Marks a specific notification as read."""
    stmt = select(Notification).where(
        Notification.id == notification_id,
        Notification.user_id == current_user.id,
    )
    res = await db.execute(stmt)
    notif = res.scalar_one_or_none()
    if not notif:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found.",
        )

    notif.is_read = True
    await db.commit()
    await db.refresh(notif)

    return ResponseEnvelope[NotificationResponse](
        success=True,
        message="Notification marked as read.",
        data=notif,
    )


@router.post(
    "/read-all",
    response_model=ResponseEnvelope[dict],
    summary="Mark all user notifications as read",
)
async def mark_all_notifications_as_read(
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
) -> ResponseEnvelope[dict]:
    """Marks all pending notifications for the current user as read."""
    stmt = (
        update(Notification)
        .where(
            Notification.user_id == current_user.id,
            Notification.is_read == False,  # noqa: E712
        )
        .values(is_read=True)
    )
    result = await db.execute(stmt)
    await db.commit()

    return ResponseEnvelope[dict](
        success=True,
        message=f"Marked {result.rowcount} notifications as read.",
        data={"updated_count": result.rowcount},
    )

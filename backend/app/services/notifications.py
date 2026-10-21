from uuid import UUID

from app.models import Notification


def make_notification(
    recipient_id: UUID,
    category: str,
    title: str,
    message: str,
    resource_type: str | None = None,
    resource_id: str | None = None,
) -> Notification:
    return Notification(
        recipient_id=recipient_id,
        category=category,
        title=title,
        message=message,
        resource_type=resource_type,
        resource_id=resource_id,
    )

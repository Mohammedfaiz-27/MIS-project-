from datetime import datetime
from typing import Optional
import logging

logger = logging.getLogger(__name__)


class NotificationService:
    """
    Mock notification service for WhatsApp/SMS notifications.
    In production, integrate with actual SMS/WhatsApp API providers.
    """

    @staticmethod
    async def send_followup_reminder(
        phone_number: str,
        customer_name: str,
        site_location: str,
        followup_date: datetime
    ) -> bool:
        """
        Send follow-up reminder notification.
        Mock implementation - logs the notification.
        """
        message = (
            f"Reminder: Follow-up with {customer_name} at {site_location} "
            f"scheduled for {followup_date.strftime('%Y-%m-%d')}"
        )
        logger.info(f"[MOCK NOTIFICATION] To: {phone_number}, Message: {message}")
        return True

    @staticmethod
    async def send_lead_assignment(
        phone_number: str,
        salesperson_name: str,
        customer_name: str,
        site_location: str
    ) -> bool:
        """
        Notify salesperson of new lead assignment.
        Mock implementation - logs the notification.
        """
        message = (
            f"New lead assigned: {customer_name} at {site_location}. "
            f"Please follow up within 24 hours."
        )
        logger.info(f"[MOCK NOTIFICATION] To: {phone_number}, Message: {message}")
        return True

    @staticmethod
    async def send_approval_notification(
        phone_number: str,
        entry_id: str,
        status: str,
        reason: Optional[str] = None
    ) -> bool:
        """
        Notify salesperson of sales entry approval/rejection.
        Mock implementation - logs the notification.
        """
        if status == "approved":
            message = f"Your sales entry {entry_id} has been approved."
        else:
            message = f"Your sales entry {entry_id} was rejected. Reason: {reason}"

        logger.info(f"[MOCK NOTIFICATION] To: {phone_number}, Message: {message}")
        return True

    @staticmethod
    async def send_overdue_alert(
        phone_number: str,
        customer_name: str,
        days_overdue: int
    ) -> bool:
        """
        Alert about overdue follow-up.
        Mock implementation - logs the notification.
        """
        message = (
            f"OVERDUE: Follow-up with {customer_name} is {days_overdue} days overdue. "
            f"Please take action immediately."
        )
        logger.info(f"[MOCK NOTIFICATION] To: {phone_number}, Message: {message}")
        return True

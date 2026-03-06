from __future__ import annotations

from linkedin_api import Linkedin


def send_message(client: Linkedin, recipient_urn: str, message: str) -> bool:
    """Send a LinkedIn DM to a connection."""
    return client.send_message(message_body=message, recipients=[recipient_urn])

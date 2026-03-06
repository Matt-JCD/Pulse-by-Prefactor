from __future__ import annotations

import logging
from typing import Optional
from linkedin_api import Linkedin

_client: Optional[Linkedin] = None
logger = logging.getLogger(__name__)


def get_client(email: str = "", password: str = "", li_at: str = "", jsessionid: str = "") -> Linkedin:
    """
    Reuse same session across detection, enrichment, and sending.
    Use email/password only.
    """
    global _client
    if _client is None:
        if email and password:
            logger.info("Creating LinkedIn client with email/password auth")
            _client = Linkedin(email, password)
        else:
            raise RuntimeError("No LinkedIn credentials: set LI_EMAIL+LI_PASSWORD")
    return _client


def get_my_urn(client: Linkedin) -> str:
    """Get the authenticated user's URN dynamically."""
    profile = client.get_user_profile()
    mini = profile.get("miniProfile", profile)
    urn = mini.get("entityUrn", mini.get("objectUrn", ""))
    logger.info("Resolved LinkedIn user URN %s", urn)
    logger.debug("LinkedIn user profile keys: %s", list(profile.keys()))
    return urn

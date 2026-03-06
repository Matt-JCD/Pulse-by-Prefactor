from __future__ import annotations

from typing import Optional
from linkedin_api import Linkedin

_client: Optional[Linkedin] = None


def get_client(email: str, password: str) -> Linkedin:
    """Reuse same session across detection, enrichment, and sending."""
    global _client
    if _client is None:
        _client = Linkedin(email, password)
    return _client


def get_my_urn(client: Linkedin) -> str:
    """Get the authenticated user's URN dynamically."""
    profile = client.get_user_profile()
    # The miniProfile or plain profile dict contains the URN
    mini = profile.get("miniProfile", profile)
    return mini.get("entityUrn", mini.get("objectUrn", ""))

from __future__ import annotations

import http.cookiejar
from typing import Optional
from linkedin_api import Linkedin

_client: Optional[Linkedin] = None


def get_client(email: str = "", password: str = "", li_at: str = "") -> Linkedin:
    """
    Reuse same session across detection, enrichment, and sending.
    Prefers li_at cookie over email/password to avoid CHALLENGE on server IPs.
    """
    global _client
    if _client is None:
        if li_at:
            jar = http.cookiejar.CookieJar()
            cookie = http.cookiejar.Cookie(
                version=0, name="li_at", value=li_at,
                port=None, port_specified=False,
                domain=".linkedin.com", domain_specified=True, domain_initial_dot=True,
                path="/", path_specified=True,
                secure=True, expires=None, discard=True,
                comment=None, comment_url=None, rest={}, rfc2109=False,
            )
            jar.set_cookie(cookie)
            _client = Linkedin("", "", cookies=jar)
        elif email and password:
            _client = Linkedin(email, password)
        else:
            raise RuntimeError("No LinkedIn credentials: set LI_AT or LI_EMAIL+LI_PASSWORD")
    return _client


def get_my_urn(client: Linkedin) -> str:
    """Get the authenticated user's URN dynamically."""
    profile = client.get_user_profile()
    # The miniProfile or plain profile dict contains the URN
    mini = profile.get("miniProfile", profile)
    return mini.get("entityUrn", mini.get("objectUrn", ""))

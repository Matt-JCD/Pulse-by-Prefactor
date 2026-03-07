from __future__ import annotations

import logging
from typing import Optional

import httpx

from app.config import LINKDAPI_API_KEY

logger = logging.getLogger(__name__)

BASE_URL = "https://linkdapi.com/api/v1"


def _headers() -> dict[str, str]:
    return {"X-linkdapi-apikey": LINKDAPI_API_KEY}


def fetch_profile(username: str) -> Optional[dict]:
    """Fetch full LinkedIn profile via LinkdAPI. Returns None on failure."""
    try:
        resp = httpx.get(
            f"{BASE_URL}/profile/full",
            headers=_headers(),
            params={"username": username},
            timeout=30,
        )
        resp.raise_for_status()
        return resp.json()
    except Exception:
        logger.exception("[linkdapi] Failed to fetch profile for %s", username)
        return None


def fetch_posts(profile_urn: str, count: int = 5) -> list[dict]:
    """Fetch recent posts via LinkdAPI. Returns empty list on failure."""
    try:
        resp = httpx.get(
            f"{BASE_URL}/posts/all",
            headers=_headers(),
            params={"urn": profile_urn, "count": count},
            timeout=30,
        )
        resp.raise_for_status()
        data = resp.json()
        if isinstance(data, list):
            return data
        return data.get("posts", data.get("data", []))
    except Exception:
        logger.exception("[linkdapi] Failed to fetch posts for %s", profile_urn)
        return []


def enrich_profile(username: str) -> dict:
    """
    Fetch profile + posts for a LinkedIn username.
    Returns a dict with 'profile' and 'recent_posts' keys.
    """
    profile = fetch_profile(username)
    if not profile:
        return {"profile": None, "recent_posts": []}

    posts = []
    urn = profile.get("urn") or profile.get("profileUrn") or profile.get("entityUrn")
    if urn:
        posts = fetch_posts(urn)

    return {"profile": profile, "recent_posts": posts}

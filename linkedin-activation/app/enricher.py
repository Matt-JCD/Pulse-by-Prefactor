from __future__ import annotations

from linkedin_api import Linkedin


def enrich_profile(client: Linkedin, public_identifier: str) -> dict:
    """
    Full profile data for a 1st-degree connection.
    They're connected, so Voyager returns everything.
    """
    profile = client.get_profile(public_identifier)
    contact_info = client.get_profile_contact_info(public_identifier)

    posts: list = []
    try:
        posts = client.get_profile_posts(public_identifier, post_count=5)
    except Exception:
        pass

    return {
        "profile": profile,
        "contact_info": contact_info,
        "recent_posts": posts,
    }

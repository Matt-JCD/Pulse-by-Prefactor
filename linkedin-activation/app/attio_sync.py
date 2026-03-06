from __future__ import annotations

import logging

import httpx

ATTIO_API = "https://api.attio.com/v2"
ATTIO_TIMEOUT = httpx.Timeout(20.0, connect=10.0)
logger = logging.getLogger(__name__)


def _headers(api_key: str) -> dict:
    return {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}


async def upsert_person(enrichment: dict, api_key: str) -> str:
    """Upsert a person record in Attio, deduplicated on LinkedIn URL."""
    profile = enrichment["profile"]
    contact = enrichment.get("contact_info", {})

    public_id = profile.get("public_id", profile.get("publicIdentifier", ""))

    values: dict = {
        "name": [
            {
                "first_name": profile.get("firstName", ""),
                "last_name": profile.get("lastName", ""),
                "full_name": f"{profile.get('firstName', '')} {profile.get('lastName', '')}",
            }
        ],
        "linkedin": [f"https://linkedin.com/in/{public_id}"],
        "job_title": [profile.get("headline", "")],
        "description": [build_summary(enrichment)],
    }

    location = profile.get("locationName", "")
    if location:
        values["primary_location"] = [location]

    emails = contact.get("email_address", [])
    if emails:
        values["email_addresses"] = emails if isinstance(emails, list) else [emails]

    twitter = contact.get("twitter", [])
    if twitter:
        handle = twitter[0].get("name", "") if isinstance(twitter[0], dict) else twitter[0]
        if handle:
            values["twitter"] = [handle]

    logger.info("Upserting Attio person for LinkedIn profile %s", public_id or "<unknown>")
    async with httpx.AsyncClient(timeout=ATTIO_TIMEOUT) as http:
        resp = await http.put(
            f"{ATTIO_API}/objects/people/records",
            json={"data": {"values": values}},
            params={"matching_attribute": "linkedin"},
            headers=_headers(api_key),
        )
        resp.raise_for_status()
        return resp.json()["data"]["id"]["record_id"]


async def add_sent_note(record_id: str, message: str, api_key: str):
    """Add a note to the person record after sending the LinkedIn message."""
    logger.info("Adding Attio note to record %s", record_id)
    async with httpx.AsyncClient(timeout=ATTIO_TIMEOUT) as http:
        resp = await http.post(
            f"{ATTIO_API}/notes",
            json={
                "data": {
                    "parent_object": "people",
                    "parent_record_id": record_id,
                    "title": "LinkedIn Activation Message Sent",
                    "format": "plaintext",
                    "content": f"Message sent: {message}",
                }
            },
            headers=_headers(api_key),
        )
        resp.raise_for_status()


def build_summary(enrichment: dict) -> str:
    """Headline + about excerpt + latest post excerpt for Attio description."""
    profile = enrichment["profile"]
    posts = enrichment.get("recent_posts", [])

    parts = [profile.get("headline", "")]

    if profile.get("summary"):
        parts.append(f"About: {profile['summary'][:300]}")

    if posts:
        latest = posts[0].get("commentary", posts[0].get("text", ""))[:150]
        if latest:
            parts.append(f"Latest post: {latest}")

    return " | ".join([p for p in parts if p])

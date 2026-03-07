from __future__ import annotations

import logging
import time
from datetime import datetime, timezone

import httpx
from supabase import Client

from app import db
from app.config import ATTIO_API_KEY

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


# ---------------------------------------------------------------------------
# Outreach → Attio sync (linkedin_outreach table)
# ---------------------------------------------------------------------------

def parse_company_from_headline(headline: str | None) -> str | None:
    """
    Best-effort parse of company name from LinkedIn headline.
    Common patterns: "Role @ Company", "Role at Company", "Role | Company"
    """
    if not headline:
        return None
    for sep in (" @ ", " at ", " | ", " @", " AT "):
        if sep in headline:
            company = headline.split(sep, 1)[1].strip()
            return company or None
    return None


def _upsert_company(company_name: str, api_key: str) -> str:
    """Upsert a company in Attio by name. Returns record_id."""
    with httpx.Client(timeout=ATTIO_TIMEOUT) as http:
        resp = http.put(
            f"{ATTIO_API}/objects/companies/records",
            json={"data": {"values": {"name": [company_name]}}},
            params={"matching_attribute": "name"},
            headers=_headers(api_key),
        )
        resp.raise_for_status()
        return resp.json()["data"]["id"]["record_id"]


def _upsert_outreach_person(
    row: dict, company_record_id: str | None, api_key: str
) -> str:
    """Upsert a person in Attio from an outreach row. Returns record_id."""
    values: dict = {
        "name": [
            {
                "first_name": row.get("first_name") or "",
                "last_name": row.get("last_name") or "",
                "full_name": row.get("full_name") or "",
            }
        ],
        "job_title": [row.get("headline") or ""],
        "linkedin": [row.get("linkedin_profile_url") or ""],
        "description": [
            f"LinkedIn connection — connected {row.get('connection_since', 'unknown')}"
        ],
    }

    if company_record_id:
        values["company"] = [
            {"target_object": "companies", "target_record_id": company_record_id}
        ]

    with httpx.Client(timeout=ATTIO_TIMEOUT) as http:
        resp = http.put(
            f"{ATTIO_API}/objects/people/records",
            json={"data": {"values": values}},
            params={"matching_attribute": "linkedin"},
            headers=_headers(api_key),
        )
        resp.raise_for_status()
        return resp.json()["data"]["id"]["record_id"]


def sync_outreach_to_attio(supabase_client: Client, outreach_row: dict) -> dict:
    """
    Sync a single outreach row to Attio (company + person).
    Returns {"person_record_id": str, "company_record_id": str | None}.
    """
    api_key = ATTIO_API_KEY
    if not api_key:
        raise RuntimeError("ATTIO_API_KEY not configured")

    company_record_id = None
    company_name = parse_company_from_headline(outreach_row.get("headline"))

    if company_name:
        try:
            company_record_id = _upsert_company(company_name, api_key)
            logger.info("[outreach:attio] Company upserted: %s -> %s", company_name, company_record_id)
        except Exception:
            logger.exception("Failed to upsert company %s — continuing without link", company_name)

    person_record_id = _upsert_outreach_person(outreach_row, company_record_id, api_key)
    logger.info("[outreach:attio] Person upserted: %s -> %s", outreach_row.get("full_name"), person_record_id)

    db.update_outreach(outreach_row["id"], {
        "attio_person_record_id": person_record_id,
        "attio_company_record_id": company_record_id,
        "attio_synced_at": datetime.now(timezone.utc).isoformat(),
    })

    return {"person_record_id": person_record_id, "company_record_id": company_record_id}


def sync_all_unsynced(
    supabase_client: Client,
    status_filter: str | None = None,
    limit: int | None = None,
) -> dict:
    """
    Sync all unsynced outreach rows to Attio.
    Returns {"synced": int, "companies": int, "people": int, "errors": list}.
    """
    rows = db.get_unsynced_outreach(status_filter=status_filter, limit=limit)
    logger.info("[outreach:attio] Sync started: %d rows to process", len(rows))
    synced = 0
    companies = 0
    people = 0
    errors: list[str] = []

    for row in rows:
        try:
            result = sync_outreach_to_attio(supabase_client, row)
            synced += 1
            people += 1
            if result["company_record_id"]:
                companies += 1
            if synced < len(rows):
                time.sleep(0.5)
        except Exception as e:
            name = row.get("full_name") or row.get("id")
            logger.exception("Attio sync failed for %s", name)
            errors.append(f"{name}: {e}")

    logger.info("[outreach:attio] Sync complete: %d synced, %d companies, %d people, %d errors", synced, companies, people, len(errors))
    return {"synced": synced, "companies": companies, "people": people, "errors": errors}

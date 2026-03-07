from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone

from app import db
from app.config import PB_CONNECTIONS_AGENT_ID
from app.phantombuster import expected_webhook_url, format_date_for_pb, launch_connections_export

logger = logging.getLogger(__name__)


def _parse_override_date(raw_value: str) -> datetime:
    """Accept a few operator-friendly date formats for manual backfills."""
    for fmt in ("%m-%d-%Y", "%Y-%m-%d", "%d.%m.%Y"):
        try:
            return datetime.strptime(raw_value.strip(), fmt).replace(tzinfo=timezone.utc)
        except ValueError:
            continue
    raise ValueError("Unsupported date format. Use MM-DD-YYYY, YYYY-MM-DD, or DD.MM.YYYY.")


def launch_detection(date_after_override: str | None = None) -> dict:
    """
    Launch PB connections export agent.
    Uses the most recent connection_since date from the outreach table,
    falling back to 7 days ago if no rows exist.
    Returns the PB launch response dict.
    """
    rows = db.get_outreach_by_status("detected", limit=1)
    latest_date = None

    # Check all rows for the most recent connection_since
    all_rows = (
        db.get_db()
        .table(db.OUTREACH_TABLE)
        .select("connection_since")
        .order("connection_since", desc=True)
        .limit(1)
        .execute()
    ).data

    if all_rows and all_rows[0].get("connection_since"):
        try:
            latest_date = datetime.fromisoformat(all_rows[0]["connection_since"].replace("Z", "+00:00"))
        except (ValueError, TypeError):
            latest_date = None

    if date_after_override:
        latest_date = _parse_override_date(date_after_override)
        logger.info(
            "[outreach:detection] Using manual date override=%s parsed=%s",
            date_after_override,
            latest_date.isoformat(),
        )
    elif latest_date is None:
        latest_date = datetime.now(timezone.utc) - timedelta(days=7)

    date_str = format_date_for_pb(latest_date)
    logger.info(
        "[outreach:detection] Launching PB connections export agentId=%s dateAfter=%s webhook=%s",
        PB_CONNECTIONS_AGENT_ID or "<missing>",
        date_str,
        expected_webhook_url() or "<not-configured>",
    )
    result = launch_connections_export(date_str)
    logger.info("[outreach:detection] PB launch accepted, containerId=%s", result.get("containerId"))
    return result

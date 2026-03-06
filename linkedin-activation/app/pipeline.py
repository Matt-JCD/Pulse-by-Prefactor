from __future__ import annotations

import argparse
import asyncio
import logging

from slack_sdk import WebClient

from app import db
from app.attio_sync import upsert_person
from app.config import (
    ANTHROPIC_API_KEY,
    ATTIO_API_KEY,
    LI_AT,
    LI_EMAIL,
    LI_JSESSIONID,
    LI_PASSWORD,
    SLACK_BOT_TOKEN,
    SLACK_CHANNEL,
    require_env_vars,
    require_linkedin_credentials,
)
from app.detector import find_new_connections, get_recent_connections
from app.drafter import draft_message
from app.enricher import enrich_profile
from app.linkedin_client import get_client
from app.slack_bot import post_approval, post_run_summary

RATE_LIMIT_DELAY = 3  # seconds between LinkedIn API calls
BLOCKING_CALL_TIMEOUT = 60
logger = logging.getLogger(__name__)


async def run_pipeline(dry_run: bool = False) -> dict:
    """Full pipeline: detect -> enrich -> attio -> draft -> slack."""
    require_env_vars("SLACK_BOT_TOKEN", "SLACK_CHANNEL")
    require_linkedin_credentials()

    errors: list[str] = []
    new_count = 0
    slack = WebClient(token=SLACK_BOT_TOKEN)

    # Authenticate with LinkedIn
    try:
        li = await asyncio.wait_for(
            asyncio.to_thread(get_client, LI_EMAIL, LI_PASSWORD, LI_AT, LI_JSESSIONID),
            timeout=BLOCKING_CALL_TIMEOUT,
        )
    except Exception as e:
        errors.append(f"LinkedIn auth failed: {e}")
        await asyncio.to_thread(post_run_summary, 0, errors, dry_run, slack, SLACK_CHANNEL)
        return {"new_count": 0, "errors": errors}

    # Detect new connections
    try:
        current = await asyncio.wait_for(
            asyncio.to_thread(get_recent_connections, li),
            timeout=BLOCKING_CALL_TIMEOUT,
        )
        await asyncio.sleep(RATE_LIMIT_DELAY)
        new = await asyncio.to_thread(find_new_connections, current)
        new_count = len(new)
        logger.info("Detected %s new LinkedIn connection(s)", new_count)
    except Exception as e:
        errors.append(f"Connection detection failed: {e}")
        await asyncio.to_thread(post_run_summary, 0, errors, dry_run, slack, SLACK_CHANNEL)
        return {"new_count": 0, "errors": errors}

    if not new:
        await asyncio.to_thread(post_run_summary, 0, errors, dry_run, slack, SLACK_CHANNEL)
        return {"new_count": 0, "errors": errors}

    require_env_vars("ATTIO_API_KEY", "ANTHROPIC_API_KEY")

    # Process each new connection
    for conn_data in new:
        name = f"{conn_data.get('first_name', '')} {conn_data.get('last_name', '')}"
        try:
            # Insert into Supabase
            row = await asyncio.to_thread(db.insert_connection, conn_data)
            connection_id = row["id"]

            # Enrich via LinkedIn
            await asyncio.sleep(RATE_LIMIT_DELAY)
            enrichment = await asyncio.wait_for(
                asyncio.to_thread(enrich_profile, li, conn_data["public_identifier"]),
                timeout=BLOCKING_CALL_TIMEOUT,
            )
            await asyncio.to_thread(db.set_status, connection_id, "enriched")

            # Push to Attio
            attio_id = await upsert_person(enrichment, ATTIO_API_KEY)
            await asyncio.to_thread(db.set_attio_id, connection_id, attio_id)

            # Draft message via Claude
            draft = await asyncio.wait_for(
                asyncio.to_thread(draft_message, enrichment, ANTHROPIC_API_KEY),
                timeout=BLOCKING_CALL_TIMEOUT,
            )
            await asyncio.to_thread(db.set_draft, connection_id, draft)

            if dry_run:
                print(f"[DRY RUN] {name}: {draft}")
                continue

            # Post to Slack for approval
            conn_for_slack = await asyncio.to_thread(db.get_connection, connection_id)
            ts = await asyncio.to_thread(post_approval, conn_for_slack, slack, SLACK_CHANNEL)
            await asyncio.to_thread(db.set_slack_ts, connection_id, ts)

        except Exception as e:
            errors.append(f"{name}: {e}")
            continue

        await asyncio.sleep(RATE_LIMIT_DELAY)

    await asyncio.to_thread(post_run_summary, new_count, errors, dry_run, slack, SLACK_CHANNEL)
    return {"new_count": new_count, "errors": errors}


def main():
    parser = argparse.ArgumentParser(description="LinkedIn Activation Pipeline")
    parser.add_argument("--dry-run", action="store_true", help="Run without sending to Slack")
    args = parser.parse_args()

    asyncio.run(run_pipeline(dry_run=args.dry_run))


if __name__ == "__main__":
    main()

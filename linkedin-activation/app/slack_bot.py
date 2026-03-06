from __future__ import annotations

from slack_sdk import WebClient

from app import db
from app.attio_sync import add_sent_note
from app.sender import send_message as li_send_message


# ---------------------------------------------------------------------------
# Block Kit builders
# ---------------------------------------------------------------------------

def build_approval_block(conn: dict) -> list:
    """Build Slack Block Kit message for connection approval."""
    attio_link = ""
    if conn.get("attio_record_id"):
        attio_link = f" · <https://app.attio.com/people/{conn['attio_record_id']}|Attio>"

    return [
        {
            "type": "header",
            "text": {"type": "plain_text", "text": f"\U0001f514 {conn['first_name']} {conn['last_name']}"},
        },
        {
            "type": "section",
            "text": {
                "type": "mrkdwn",
                "text": (
                    f"*{conn.get('headline', '')}*\n"
                    f"<https://linkedin.com/in/{conn['public_identifier']}|LinkedIn>{attio_link}"
                ),
            },
        },
        {"type": "divider"},
        {
            "type": "section",
            "text": {"type": "mrkdwn", "text": f"*Draft:*\n> {conn['draft_message']}"},
        },
        {
            "type": "actions",
            "elements": [
                {
                    "type": "button",
                    "text": {"type": "plain_text", "text": "\u2705 Send"},
                    "style": "primary",
                    "action_id": "approve_message",
                    "value": conn["id"],
                },
                {
                    "type": "button",
                    "text": {"type": "plain_text", "text": "\u270f\ufe0f Edit"},
                    "action_id": "edit_message",
                    "value": conn["id"],
                },
                {
                    "type": "button",
                    "text": {"type": "plain_text", "text": "\u274c Skip"},
                    "style": "danger",
                    "action_id": "skip_message",
                    "value": conn["id"],
                },
            ],
        },
    ]


def build_edit_modal(connection_id: str, current_draft: str) -> dict:
    """Build a Slack modal for editing a draft message."""
    return {
        "type": "modal",
        "callback_id": "edit_draft_modal",
        "private_metadata": connection_id,
        "title": {"type": "plain_text", "text": "Edit Draft"},
        "submit": {"type": "plain_text", "text": "Save"},
        "close": {"type": "plain_text", "text": "Cancel"},
        "blocks": [
            {
                "type": "input",
                "block_id": "draft_block",
                "label": {"type": "plain_text", "text": "Message (max 200 chars)"},
                "element": {
                    "type": "plain_text_input",
                    "action_id": "draft_input",
                    "initial_value": current_draft,
                    "max_length": 200,
                    "multiline": True,
                },
            }
        ],
    }


# ---------------------------------------------------------------------------
# Post helpers
# ---------------------------------------------------------------------------

def post_approval(conn: dict, slack: WebClient, channel: str) -> str:
    """Post approval card to Slack. Returns message timestamp."""
    resp = slack.chat_postMessage(
        channel=channel,
        blocks=build_approval_block(conn),
        text=f"New connection: {conn['first_name']} {conn['last_name']}",
    )
    return resp["ts"]


def post_run_summary(new_count: int, errors: list[str], dry_run: bool, slack: WebClient, channel: str):
    """Always posts after every run — silence = broken."""
    if errors:
        text = f"\u26a0\ufe0f Pipeline run failed\n\u2022 {len(errors)} error(s):\n" + "\n".join(
            f"  - {e}" for e in errors
        )
    elif new_count == 0:
        text = "\u2705 Pipeline ran \u2014 no new connections"
    else:
        mode = " (DRY RUN)" if dry_run else ""
        text = f"\u2705 Pipeline ran{mode} \u2014 {new_count} new connection(s) processed"

    slack.chat_postMessage(channel=channel, text=text)


# ---------------------------------------------------------------------------
# Interactive handlers
# ---------------------------------------------------------------------------

async def handle_approve(connection_id: str, li_client, attio_key: str, slack: WebClient, channel: str):
    """Send the LinkedIn message, log to Attio, update Slack."""
    conn = db.get_connection(connection_id)

    li_send_message(li_client, conn["linkedin_urn"], conn["draft_message"])
    db.set_status(connection_id, "sent")

    await add_sent_note(conn["attio_record_id"], conn["draft_message"], attio_key)

    # Update the Slack message to show it was sent
    if conn.get("slack_message_ts"):
        slack.chat_update(
            channel=channel,
            ts=conn["slack_message_ts"],
            text=f"\u2705 Sent to {conn['first_name']} {conn['last_name']}",
            blocks=[],
        )


def handle_skip(connection_id: str, slack: WebClient, channel: str):
    """Mark connection as skipped and update Slack."""
    conn = db.get_connection(connection_id)
    db.set_status(connection_id, "skipped")

    if conn.get("slack_message_ts"):
        slack.chat_update(
            channel=channel,
            ts=conn["slack_message_ts"],
            text=f"\u274c Skipped {conn['first_name']} {conn['last_name']}",
            blocks=[],
        )


def handle_edit(connection_id: str, trigger_id: str, slack: WebClient):
    """Open the edit modal in Slack."""
    conn = db.get_connection(connection_id)
    modal = build_edit_modal(connection_id, conn.get("draft_message", ""))
    slack.views_open(trigger_id=trigger_id, view=modal)


def handle_edit_submit(connection_id: str, new_draft: str, slack: WebClient, channel: str):
    """Save edited draft and re-post the approval card."""
    db.set_draft(connection_id, new_draft)
    conn = db.get_connection(connection_id)

    # Update the original message with the new draft
    if conn.get("slack_message_ts"):
        slack.chat_update(
            channel=channel,
            ts=conn["slack_message_ts"],
            blocks=build_approval_block(conn),
            text=f"Updated draft for {conn['first_name']} {conn['last_name']}",
        )

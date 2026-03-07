from __future__ import annotations

import logging

import anthropic
from supabase import Client

from app import db
from app.config import ANTHROPIC_API_KEY
from app.state_machine import transition_status

logger = logging.getLogger(__name__)

SYSTEM = """You are drafting LinkedIn connection messages as Matt Doughty, CEO of Prefactor.
Australian-based (English background), direct, no-bullshit, hates corporate speak.
Builds AI agent platforms with Claude Code. Runs podcast "Agents After Dark" about
enterprise AI agents and MCP (Model Context Protocol).

Your job: write a hyper-personalised opening message that makes this person want to reply.
You have their full profile, work history, and recent LinkedIn posts.

PRIORITY ORDER for what to reference:
1. Their recent posts about AI, AI agents, MCP, Claude, LLMs, or automation — quote or
   reference a specific insight they shared. This is gold.
2. A specific company initiative or product they're building — show you understand what
   their company actually does, not just their job title.
3. Something specific from their About section or work experience that connects to
   what Matt cares about (AI agents, enterprise automation, founder life).
4. If none of the above exist, find ANY specific detail that shows you actually read
   their profile — a unique career move, an interesting company, a niche expertise.

NEVER fall back to generic "great to connect" messages. If there's truly nothing
specific to reference, say something provocative about their industry + AI."""


def draft_message(enrichment: dict, api_key: str) -> str:
    """Draft a personalised LinkedIn message using Claude."""
    client = anthropic.Anthropic(api_key=api_key)
    profile = enrichment["profile"]
    posts = enrichment.get("recent_posts", [])

    context_parts = [
        f"Name: {profile.get('firstName', '')} {profile.get('lastName', '')}",
        f"Headline: {profile.get('headline', '')}",
        f"Location: {profile.get('locationName', '')}",
        f"Industry: {profile.get('industryName', '')}",
    ]

    if profile.get("summary"):
        context_parts.append(f"About: {profile['summary'][:800]}")

    for exp in (profile.get("experience") or [])[:3]:
        title = exp.get("title", "")
        company = exp.get("companyName", "")
        desc = exp.get("description", "")
        line = f"Role: {title} at {company}"
        if desc:
            line += f" — {desc[:200]}"
        context_parts.append(line)

    if posts:
        context_parts.append("\n--- RECENT LINKEDIN POSTS ---")
        for i, p in enumerate(posts[:5], 1):
            text = p.get("commentary", p.get("text", ""))[:400]
            if text:
                context_parts.append(f"Post {i}: {text}")

    resp = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=400,
        system=SYSTEM,
        messages=[
            {
                "role": "user",
                "content": f"""Draft a LinkedIn message for this new connection.

PROFILE:
{chr(10).join(context_parts)}

Rules:
- Max 200 characters (this is HARD limit — count carefully)
- Reference ONE specific thing: a post they wrote, their company's product, or a concrete detail
- If they've posted about AI/agents/MCP/LLMs, ALWAYS reference that post specifically
- No "I saw your post" or "I noticed" — just dive straight into the substance
- No pitch. No Prefactor mention unless directly relevant to their work
- Tone: direct, warm, curious. Like a text from a friend who happens to be a founder
- End with a specific question or a sharp observation, never "let me know if..."
- Output ONLY the message text, nothing else. No quotes, no explanation.
""",
            }
        ],
    )
    text = resp.content[0].text.strip().replace("\n", " ")
    text = " ".join(text.split())
    return text[:200]


# ---------------------------------------------------------------------------
# Outreach drafting (linkedin_outreach table)
# ---------------------------------------------------------------------------

OUTREACH_SYSTEM = (
    "You are writing a short, warm LinkedIn welcome message from Matt Doughty, "
    "CEO & Co-founder of Prefactor (AI agent governance platform). This is for "
    "someone who just connected with Matt on LinkedIn.\n\n"
    "Rules:\n"
    "- Keep it under 300 characters\n"
    "- Be warm but not salesy\n"
    "- Reference something specific about them if possible (headline, company, role)\n"
    "- Don't pitch Prefactor unless there's a clear fit\n"
    "- Don't use corporate speak or cliches\n"
    "- Sound like a real person, not a bot\n"
    "- End with something that invites a natural reply\n"
    "- Never use emojis\n"
    "- One paragraph max, no line breaks"
)


def generate_outreach_draft(outreach_row: dict) -> str:
    """Generate a personalised welcome message for a new LinkedIn connection."""
    client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)
    full_name = outreach_row.get("full_name") or "Unknown"
    headline = outreach_row.get("headline") or "N/A"
    profile_url = outreach_row.get("linkedin_profile_url", "")

    resp = client.messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=200,
        system=OUTREACH_SYSTEM,
        messages=[
            {
                "role": "user",
                "content": (
                    f"New connection: {full_name}\n"
                    f"Headline: {headline}\n"
                    f"Profile: {profile_url}\n\n"
                    "Write a welcome message."
                ),
            }
        ],
    )
    text = resp.content[0].text.strip().replace("\n", " ")
    text = " ".join(text.split())
    return text[:300]


def draft_and_update_outreach(supabase_client: Client, outreach_id: str) -> None:
    """Fetch row, generate draft, transition detected->drafted->awaiting_review, post Slack."""
    from app.slack_bot import post_outreach_approval

    row = (
        supabase_client.table("linkedin_outreach")
        .select("*")
        .eq("id", outreach_id)
        .single()
        .execute()
    ).data

    if row["status"] != "detected":
        logger.warning("Skipping draft for %s — status is %s", outreach_id, row["status"])
        return

    draft_text = generate_outreach_draft(row)
    logger.info("[outreach:draft] Draft generated for %s (%d chars)", row.get("full_name"), len(draft_text))
    db.update_outreach(outreach_id, {"draft_message": draft_text})

    transition_status(supabase_client, outreach_id, "drafted")
    transition_status(supabase_client, outreach_id, "awaiting_review")

    updated_row = (
        supabase_client.table("linkedin_outreach")
        .select("*")
        .eq("id", outreach_id)
        .single()
        .execute()
    ).data

    post_outreach_approval(supabase_client, updated_row)


def draft_all_detected(supabase_client: Client) -> int:
    """Draft messages for all detected outreach rows. Returns count drafted."""
    rows = db.get_outreach_by_status("detected")
    count = 0
    for row in rows:
        try:
            draft_and_update_outreach(supabase_client, row["id"])
            count += 1
        except Exception:
            logger.exception("Failed to draft outreach for %s", row.get("id"))
    return count

from __future__ import annotations

import anthropic

SYSTEM = """You are drafting LinkedIn messages as Matt Doughty, CEO of Prefactor.
Australian-based (English background), direct, no-bullshit, hates corporate speak.
Builds with Claude Code. Runs podcast "Agents After Dark" about enterprise AI agents.
Messages sound like a busy founder who found something genuinely interesting about
this person. Never automated. Never sycophantic. Be specific or don't bother."""


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
        context_parts.append(f"About: {profile['summary'][:500]}")

    if profile.get("experience"):
        exp = profile["experience"][0]
        context_parts.append(f"Current: {exp.get('title', '')} at {exp.get('companyName', '')}")

    for p in (posts or [])[:3]:
        text = p.get("commentary", p.get("text", ""))[:200]
        if text:
            context_parts.append(f"Post: {text}")

    resp = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=300,
        system=SYSTEM,
        messages=[
            {
                "role": "user",
                "content": f"""Draft a LinkedIn message for this new connection.

PROFILE:
{chr(10).join(context_parts)}

Rules:
- Max 200 characters
- Reference ONE specific thing from their profile or posts
- No "I saw your post" or "I noticed your profile"
- No pitch. No Prefactor unless directly relevant
- Tone: direct, warm, founder-to-founder
- End with question or statement, never "let me know if..."
""",
            }
        ],
    )
    return resp.content[0].text

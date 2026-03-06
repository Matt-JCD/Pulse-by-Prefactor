# LinkedIn Activation Engine

## What this is
Detects new LinkedIn connections, enriches profiles, pushes to Attio,
drafts personalised messages via Claude, Slack approval, sends on approve.

## Key concept
linkedin-api handles THREE jobs: detection, enrichment, sending.
One shared client instance per pipeline run. No other LinkedIn tools needed.

## Stack
Python 3.12, FastAPI, linkedin-api, Anthropic, Attio REST API,
Slack SDK, Supabase (diff tracking only).

## Rules
- NEVER commit credentials
- NEVER send without Slack approval
- Rate limit: 3s between LinkedIn calls
- Messages under 200 chars
- Max 4 pipeline runs per day
- --dry-run before live sends
- Reuse shared LinkedIn client
- Plain English for Matt

## Commands
- python -m app.pipeline
- python -m app.pipeline --dry-run
- uvicorn app.main:app --reload

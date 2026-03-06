import os
from dotenv import load_dotenv

load_dotenv()


def _get(key: str, default: str = "") -> str:
    return os.getenv(key, default).strip()


def require_env_vars(*keys: str) -> None:
    missing = [key for key in keys if not _get(key)]
    if missing:
        raise RuntimeError(f"Missing required env var(s): {', '.join(missing)}")


def require_linkedin_credentials() -> None:
    has_password_auth = bool(LI_EMAIL and LI_PASSWORD)
    if not has_password_auth:
        raise RuntimeError("Missing LinkedIn credentials: set LI_EMAIL+LI_PASSWORD")


LI_EMAIL = _get("LI_EMAIL")
LI_PASSWORD = _get("LI_PASSWORD")
LI_AT = _get("LI_AT")
LI_JSESSIONID = _get("LI_JSESSIONID")
ANTHROPIC_API_KEY = _get("ANTHROPIC_API_KEY")
ATTIO_API_KEY = _get("ATTIO_API_KEY")
SLACK_BOT_TOKEN = _get("SLACK_BOT_TOKEN")
SLACK_SIGNING_SECRET = _get("SLACK_SIGNING_SECRET")
SLACK_CHANNEL = _get("SLACK_CHANNEL")
SUPABASE_URL = _get("SUPABASE_URL")
SUPABASE_KEY = _get("SUPABASE_KEY")

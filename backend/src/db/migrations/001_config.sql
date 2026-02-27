CREATE TABLE IF NOT EXISTS config (
  id                    INTEGER PRIMARY KEY DEFAULT 1,
  llm_provider          TEXT DEFAULT 'anthropic',
  llm_model             TEXT DEFAULT 'claude-haiku-4-5-20251001',
  anthropic_api_key     TEXT,
  openai_api_key        TEXT,
  mistral_api_key       TEXT,
  scrapebadger_api_key  TEXT,
  linkedapi_key         TEXT,
  daily_run_time_utc    TEXT DEFAULT '22:00',
  linkedin_frequency    TEXT DEFAULT 'every_other_day',
  posts_per_keyword     INTEGER DEFAULT 20,
  report_email          TEXT,
  email_report_enabled  BOOLEAN DEFAULT FALSE,
  prefactor_sdk_key     TEXT,
  updated_at            TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

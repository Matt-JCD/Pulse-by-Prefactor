-- Migration: Content Strategy Engine Phase 1
-- Extends the posts table for multi-account, podcast content, and Slack approval workflow.
-- Also creates composer_feedback (editorial memory) and platform_post_counts (rate limiting).

-- ─── Composer Feedback (editorial memory) ───────────────────────────────────
-- Stores feedback triplets: original draft → founder feedback → revised draft.
-- Loaded into future drafting prompts so the system learns the founder's voice.

CREATE TABLE IF NOT EXISTS composer_feedback (
  id               SERIAL PRIMARY KEY,
  original_content TEXT NOT NULL,
  feedback         TEXT NOT NULL,
  revised_content  TEXT,
  topic_title      TEXT,
  platform         TEXT NOT NULL DEFAULT 'twitter',
  account          TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Platform Post Counts (daily rate limiting) ─────────────────────────────
-- Tracks how many posts have been published per platform per day.
-- X limit is 16/day; LinkedIn placeholder is 50/day.

CREATE TABLE IF NOT EXISTS platform_post_counts (
  id       SERIAL PRIMARY KEY,
  platform TEXT NOT NULL,
  date     DATE NOT NULL,
  count    INTEGER NOT NULL DEFAULT 0,
  UNIQUE (platform, date)
);

-- ─── New columns on posts ────────────────────────────────────────────────────

-- Which account this post belongs to (4 accounts, default to company LinkedIn)
ALTER TABLE posts ADD COLUMN IF NOT EXISTS account TEXT NOT NULL DEFAULT 'prefactor_linkedin';

-- Content category (ecosystem, governance, security, enterprise_ai, podcast_events, founder, direct_value, product)
ALTER TABLE posts ADD COLUMN IF NOT EXISTS category TEXT;

-- Reshare flag — must have an original post for the same account/day before scheduling
ALTER TABLE posts ADD COLUMN IF NOT EXISTS is_reshare BOOLEAN DEFAULT FALSE;

-- Podcast flag — required on Wednesdays, surfaces 🎙 label in Slack digest
ALTER TABLE posts ADD COLUMN IF NOT EXISTS is_podcast BOOLEAN DEFAULT FALSE;

-- Podcast metadata (only relevant when is_podcast = true)
ALTER TABLE posts ADD COLUMN IF NOT EXISTS guest_name TEXT;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS episode_number INTEGER;

-- Slack interactivity — links a post to its digest message for approve/reject buttons
ALTER TABLE posts ADD COLUMN IF NOT EXISTS slack_message_ts TEXT;

-- Approval timestamps
ALTER TABLE posts ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMPTZ;

-- ─── Backfill existing posts with correct account ────────────────────────────
-- The DEFAULT above sets all existing rows to 'prefactor_linkedin'.
-- But pre-multi-account posts were all from the Twitter era (prefactor_x).
-- Fix: re-map existing rows based on their platform column.
UPDATE posts SET account = 'prefactor_x' WHERE platform = 'twitter';

-- ─── Status flow migration ───────────────────────────────────────────────────
-- Old flow:  draft → scheduled → published / rejected / failed
-- New flow:  draft → pending_approval → approved → published / rejected / failed
--
-- Rename existing 'scheduled' rows to 'approved' so the publisher still picks them up.
UPDATE posts SET status = 'approved' WHERE status = 'scheduled';

-- ─── Extend editorial memory with account ────────────────────────────────────
-- Editorial memory was per-platform. With 4 accounts on 2 platforms, we need
-- per-account filtering (e.g. matt_linkedin vs prefactor_linkedin are both LinkedIn).
ALTER TABLE composer_feedback ADD COLUMN IF NOT EXISTS account TEXT;

-- Backfill: existing feedback was all for prefactor_x (single-account Twitter era)
UPDATE composer_feedback SET account = 'prefactor_x' WHERE account IS NULL;

-- ─── Indexes ─────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_posts_account ON posts (account);
CREATE INDEX IF NOT EXISTS idx_posts_status_scheduled ON posts (status, scheduled_at);

-- ─── Record migrations ───────────────────────────────────────────────────────
INSERT INTO _migrations (name) VALUES
  ('010_content_engine_phase1.sql'),
  ('014_composer_feedback.sql'),
  ('015_platform_post_counts.sql')
ON CONFLICT (name) DO NOTHING;

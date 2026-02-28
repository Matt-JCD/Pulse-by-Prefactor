-- Stores editorial feedback from the founder on draft posts.
-- Each row captures: what the draft said, what feedback was given, and what the revision said.
-- These are loaded into future drafting prompts as few-shot examples so the system
-- learns the founder's voice over time.
CREATE TABLE IF NOT EXISTS composer_feedback (
  id               SERIAL PRIMARY KEY,
  original_content TEXT NOT NULL,
  feedback         TEXT NOT NULL,
  revised_content  TEXT,
  topic_title      TEXT,
  platform         TEXT NOT NULL DEFAULT 'twitter',
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

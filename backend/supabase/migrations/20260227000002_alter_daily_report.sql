-- Migration 002: Recreate daily_report with synthesizer schema
-- Drop old layout (top_keywords, hot_topics, etc.) and replace with
-- the synthesizer output columns.

DROP TABLE IF EXISTS daily_report;

CREATE TABLE daily_report (
  id                   SERIAL PRIMARY KEY,
  date                 DATE NOT NULL UNIQUE,
  ecosystem_synthesis  TEXT,
  enterprise_synthesis TEXT,
  sentiment_score      FLOAT,
  sentiment_direction  VARCHAR(2),
  sentiment_label      VARCHAR(20),
  slack_post_text      TEXT,
  posted_at            TIMESTAMP WITH TIME ZONE,
  created_at           TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

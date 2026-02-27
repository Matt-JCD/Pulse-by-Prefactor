-- Migration 011: prevent duplicate topic rows for a day/platform/category/title
CREATE UNIQUE INDEX IF NOT EXISTS uq_emerging_topics_daily_topic
  ON emerging_topics (date, platform, category, topic_title);

INSERT INTO _migrations (name) VALUES ('011_emerging_topics_unique.sql')
ON CONFLICT (name) DO NOTHING;

CREATE TABLE IF NOT EXISTS daily_report (
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

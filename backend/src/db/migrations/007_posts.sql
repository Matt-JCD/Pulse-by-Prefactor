CREATE TABLE IF NOT EXISTS posts (
  id                SERIAL PRIMARY KEY,
  platform          TEXT NOT NULL,
  content           TEXT NOT NULL,
  status            TEXT DEFAULT 'draft',
  scheduled_at      TIMESTAMP WITH TIME ZONE,
  published_at      TIMESTAMP WITH TIME ZONE,
  platform_post_id  TEXT,
  source_topic      TEXT,
  source_keyword    TEXT,
  created_at        TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at        TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

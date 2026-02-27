CREATE TABLE IF NOT EXISTS emerging_topics (
  id           SERIAL PRIMARY KEY,
  date         DATE NOT NULL,
  platform     TEXT NOT NULL,
  keyword      TEXT NOT NULL,
  topic_title  TEXT NOT NULL,
  summary      TEXT NOT NULL,
  post_count   INTEGER NOT NULL,
  sample_urls  TEXT[],
  created_at   TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

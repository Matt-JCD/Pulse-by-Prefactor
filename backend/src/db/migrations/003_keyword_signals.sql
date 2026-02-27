CREATE TABLE IF NOT EXISTS keyword_signals (
  id         SERIAL PRIMARY KEY,
  date       DATE NOT NULL,
  platform   TEXT NOT NULL,
  keyword    TEXT NOT NULL,
  post_count INTEGER NOT NULL,
  sentiment  TEXT NOT NULL,
  momentum   TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(date, platform, keyword)
);

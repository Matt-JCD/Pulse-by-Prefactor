CREATE TABLE IF NOT EXISTS post_analytics (
  id               SERIAL PRIMARY KEY,
  post_id          INTEGER REFERENCES posts(id),
  impressions      INTEGER DEFAULT 0,
  engagements      INTEGER DEFAULT 0,
  clicks           INTEGER DEFAULT 0,
  replies          INTEGER DEFAULT 0,
  likes            INTEGER DEFAULT 0,
  fetched_at       TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

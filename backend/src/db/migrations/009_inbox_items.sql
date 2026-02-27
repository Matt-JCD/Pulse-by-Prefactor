CREATE TABLE IF NOT EXISTS inbox_items (
  id               SERIAL PRIMARY KEY,
  platform         TEXT NOT NULL,
  platform_item_id TEXT NOT NULL UNIQUE,
  post_id          INTEGER REFERENCES posts(id),
  type             TEXT NOT NULL,
  author_name      TEXT,
  author_handle    TEXT,
  content          TEXT,
  status           TEXT DEFAULT 'unread',
  received_at      TIMESTAMP WITH TIME ZONE,
  created_at       TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

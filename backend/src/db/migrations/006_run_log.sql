CREATE TABLE IF NOT EXISTS run_log (
  id            SERIAL PRIMARY KEY,
  date          DATE NOT NULL,
  function_name TEXT NOT NULL,
  status        TEXT NOT NULL,
  duration_ms   INTEGER,
  posts_fetched INTEGER,
  llm_tokens    INTEGER,
  error_msg     TEXT,
  created_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

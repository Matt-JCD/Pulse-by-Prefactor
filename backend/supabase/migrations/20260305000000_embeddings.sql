-- Enable pgvector (idempotent)
CREATE EXTENSION IF NOT EXISTS vector;

-- Add embedding column to posts
ALTER TABLE posts ADD COLUMN embedding vector(1536);

-- IVFFlat index for cosine similarity search
CREATE INDEX ON posts USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100)
WHERE embedding IS NOT NULL;

-- RPC function for vector similarity search (used by check-duplicate endpoint)
CREATE OR REPLACE FUNCTION match_posts(
  query_embedding vector(1536),
  match_account text,
  match_limit int DEFAULT 3,
  exclude_id int DEFAULT -1
)
RETURNS TABLE (
  id int,
  content text,
  published_at timestamptz,
  similarity float
)
LANGUAGE sql STABLE
AS $$
  SELECT
    p.id,
    p.content,
    p.published_at,
    1 - (p.embedding <=> query_embedding) AS similarity
  FROM posts p
  WHERE p.account = match_account
    AND p.status = 'published'
    AND p.embedding IS NOT NULL
    AND p.id != exclude_id
  ORDER BY similarity DESC
  LIMIT match_limit;
$$;

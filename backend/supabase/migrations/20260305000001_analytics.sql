-- Analytics columns for post engagement tracking
ALTER TABLE posts ADD COLUMN impressions INTEGER;
ALTER TABLE posts ADD COLUMN likes INTEGER;
ALTER TABLE posts ADD COLUMN comments INTEGER;
ALTER TABLE posts ADD COLUMN shares INTEGER;
ALTER TABLE posts ADD COLUMN engagement_fetched_at TIMESTAMPTZ;

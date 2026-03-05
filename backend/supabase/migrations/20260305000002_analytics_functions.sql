-- Analytics RPC functions for aggregate engagement queries

-- Average engagement per category per account
CREATE OR REPLACE FUNCTION analytics_by_category()
RETURNS TABLE (
  account text,
  category text,
  post_count bigint,
  avg_impressions numeric,
  avg_likes numeric,
  avg_comments numeric,
  avg_shares numeric,
  avg_engagement_rate numeric
)
LANGUAGE sql STABLE
AS $$
  SELECT
    p.account,
    p.category,
    COUNT(*) AS post_count,
    ROUND(AVG(p.impressions), 1) AS avg_impressions,
    ROUND(AVG(p.likes), 1) AS avg_likes,
    ROUND(AVG(p.comments), 1) AS avg_comments,
    ROUND(AVG(p.shares), 1) AS avg_shares,
    ROUND(
      AVG(COALESCE(p.likes, 0) + COALESCE(p.comments, 0) + COALESCE(p.shares, 0))
      / NULLIF(AVG(p.impressions), 0) * 100,
      2
    ) AS avg_engagement_rate
  FROM posts p
  WHERE p.status = 'published'
    AND p.category IS NOT NULL
  GROUP BY p.account, p.category
  ORDER BY p.account, avg_impressions DESC NULLS LAST;
$$;

-- Average impressions by hour of day (AEST) per account
CREATE OR REPLACE FUNCTION analytics_by_timeslot()
RETURNS TABLE (
  account text,
  hour double precision,
  post_count bigint,
  avg_impressions numeric
)
LANGUAGE sql STABLE
AS $$
  SELECT
    p.account,
    EXTRACT(HOUR FROM p.published_at AT TIME ZONE 'Australia/Sydney') AS hour,
    COUNT(*) AS post_count,
    ROUND(AVG(p.impressions), 1) AS avg_impressions
  FROM posts p
  WHERE p.status = 'published'
  GROUP BY p.account, hour
  ORDER BY p.account, hour;
$$;

-- Top-level summary per account
CREATE OR REPLACE FUNCTION analytics_summary()
RETURNS TABLE (
  account text,
  total_posts bigint,
  total_impressions bigint,
  avg_engagement_rate numeric,
  best_category text,
  best_hour double precision
)
LANGUAGE sql STABLE
AS $$
  WITH base AS (
    SELECT
      p.account,
      COUNT(*) AS total_posts,
      COALESCE(SUM(p.impressions), 0) AS total_impressions,
      ROUND(
        SUM(COALESCE(p.likes, 0) + COALESCE(p.comments, 0) + COALESCE(p.shares, 0))::numeric
        / NULLIF(SUM(p.impressions), 0) * 100,
        2
      ) AS avg_engagement_rate
    FROM posts p
    WHERE p.status = 'published'
    GROUP BY p.account
  ),
  best_cat AS (
    SELECT DISTINCT ON (p.account)
      p.account,
      p.category AS best_category
    FROM posts p
    WHERE p.status = 'published' AND p.category IS NOT NULL
    GROUP BY p.account, p.category
    ORDER BY p.account, AVG(p.impressions) DESC NULLS LAST
  ),
  best_hr AS (
    SELECT DISTINCT ON (p.account)
      p.account,
      EXTRACT(HOUR FROM p.published_at AT TIME ZONE 'Australia/Sydney') AS best_hour
    FROM posts p
    WHERE p.status = 'published'
    GROUP BY p.account, EXTRACT(HOUR FROM p.published_at AT TIME ZONE 'Australia/Sydney')
    ORDER BY p.account, AVG(p.impressions) DESC NULLS LAST
  )
  SELECT
    b.account,
    b.total_posts,
    b.total_impressions,
    b.avg_engagement_rate,
    bc.best_category,
    bh.best_hour
  FROM base b
  LEFT JOIN best_cat bc ON bc.account = b.account
  LEFT JOIN best_hr bh ON bh.account = b.account
  ORDER BY b.account;
$$;

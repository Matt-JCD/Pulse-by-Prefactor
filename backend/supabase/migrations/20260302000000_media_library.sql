-- Phase 2: Media Library — podcast episode assets
-- Adds episodes + media_assets tables for Agents After Dark content pipeline.

CREATE TABLE episodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  guest_name TEXT,
  episode_number INTEGER,
  publish_date DATE,
  status TEXT NOT NULL DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'published')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE media_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  episode_id UUID REFERENCES episodes(id) ON DELETE CASCADE,
  asset_type TEXT NOT NULL CHECK (asset_type IN ('clip', 'graphic', 'headshot', 'show_notes', 'questions')),
  title TEXT,
  storage_url TEXT,        -- for uploaded files (Supabase storage)
  external_url TEXT,       -- for Canva / Google Drive links
  file_name TEXT,
  mime_type TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

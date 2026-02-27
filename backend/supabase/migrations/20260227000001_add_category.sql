-- Add category column to keywords table
ALTER TABLE keywords ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT 'ecosystem';

-- Add category column to keyword_signals table
ALTER TABLE keyword_signals ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT 'ecosystem';

-- Add category column to emerging_topics table
ALTER TABLE emerging_topics ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT 'ecosystem';

-- Add English translation column to voices table.
-- The 'language' column already exists on voices.
ALTER TABLE voices ADD COLUMN IF NOT EXISTS text_en TEXT;

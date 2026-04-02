-- Add translation columns to issues table.
ALTER TABLE issues ADD COLUMN IF NOT EXISTS language VARCHAR(5);
ALTER TABLE issues ADD COLUMN IF NOT EXISTS text_en TEXT;

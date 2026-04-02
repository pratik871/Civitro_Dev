-- Add translation columns to messages table.
ALTER TABLE messages ADD COLUMN IF NOT EXISTS translated_text TEXT;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS original_language VARCHAR(5);

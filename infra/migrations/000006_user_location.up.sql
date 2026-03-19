-- ════════════════════════════════════════════════════════════════
-- MIGRATION 006: Add location + boundary to users
-- ════════════════════════════════════════════════════════════════

ALTER TABLE users ADD COLUMN IF NOT EXISTS location GEOMETRY(Point, 4326);
ALTER TABLE users ADD COLUMN IF NOT EXISTS primary_boundary_id UUID REFERENCES boundaries(id);
ALTER TABLE users ADD COLUMN IF NOT EXISTS location_updated_at TIMESTAMP;

CREATE INDEX IF NOT EXISTS idx_users_location ON users USING GIST(location);
CREATE INDEX IF NOT EXISTS idx_users_boundary ON users(primary_boundary_id);

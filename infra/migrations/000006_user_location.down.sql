DROP INDEX IF EXISTS idx_users_boundary;
DROP INDEX IF EXISTS idx_users_location;
ALTER TABLE users DROP COLUMN IF EXISTS location_updated_at;
ALTER TABLE users DROP COLUMN IF EXISTS primary_boundary_id;
ALTER TABLE users DROP COLUMN IF EXISTS location;

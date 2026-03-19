-- ════════════════════════════════════════════════════════════════
-- ROLLBACK MIGRATION 005: Indian Governance Chain
-- ════════════════════════════════════════════════════════════════

BEGIN;

-- Drop new tables
DROP TABLE IF EXISTS designation_catalog CASCADE;
DROP TABLE IF EXISTS governance_nomenclature CASCADE;
DROP TABLE IF EXISTS seat_reservations CASCADE;
DROP TABLE IF EXISTS election_cycles CASCADE;

-- Remove new columns from representatives
ALTER TABLE representatives DROP COLUMN IF EXISTS election_cycle_id;
ALTER TABLE representatives DROP COLUMN IF EXISTS term_end;
ALTER TABLE representatives DROP COLUMN IF EXISTS term_start;
ALTER TABLE representatives DROP COLUMN IF EXISTS state_designation;
ALTER TABLE representatives DROP COLUMN IF EXISTS designation;
ALTER TABLE representatives DROP COLUMN IF EXISTS official_type;
ALTER TABLE representatives DROP COLUMN IF EXISTS rating;
ALTER TABLE representatives DROP COLUMN IF EXISTS contact_info;

-- Restore original level CHECK on representatives
ALTER TABLE representatives DROP CONSTRAINT IF EXISTS representatives_level_check;
UPDATE representatives SET level = 'municipal' WHERE level = 'municipal_corporation';
UPDATE representatives SET level = 'ward' WHERE level = 'urban_ward';
ALTER TABLE representatives ADD CONSTRAINT representatives_level_check
    CHECK (level IN ('nation', 'state', 'parliamentary', 'assembly', 'municipal', 'ward'));

-- Remove new columns from boundaries
ALTER TABLE boundaries DROP COLUMN IF EXISTS state_local_name;
ALTER TABLE boundaries DROP COLUMN IF EXISTS urban_rural;
ALTER TABLE boundaries DROP COLUMN IF EXISTS track;

-- Drop new indexes
DROP INDEX IF EXISTS idx_boundaries_track;
DROP INDEX IF EXISTS idx_boundaries_urban_rural;
DROP INDEX IF EXISTS idx_representatives_designation;
DROP INDEX IF EXISTS idx_representatives_official_type;
DROP INDEX IF EXISTS idx_representatives_election_cycle;

-- Restore original level CHECK on boundaries
ALTER TABLE boundaries DROP CONSTRAINT IF EXISTS boundaries_level_check;
UPDATE boundaries SET level = 'municipal' WHERE level = 'municipal_corporation';
UPDATE boundaries SET level = 'ward' WHERE level = 'urban_ward';
ALTER TABLE boundaries ALTER COLUMN level TYPE VARCHAR(20);
ALTER TABLE boundaries ADD CONSTRAINT boundaries_level_check
    CHECK (level IN ('nation', 'state', 'parliamentary', 'assembly', 'municipal', 'ward'));

-- Restore representatives level column width
ALTER TABLE representatives ALTER COLUMN level TYPE VARCHAR(20);

-- Restore code column size
ALTER TABLE boundaries ALTER COLUMN code TYPE VARCHAR(20);

COMMIT;

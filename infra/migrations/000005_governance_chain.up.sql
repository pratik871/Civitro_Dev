-- ════════════════════════════════════════════════════════════════
-- MIGRATION 005: Indian Governance Chain — Dual-Track Model
-- ════════════════════════════════════════════════════════════════
-- Implements the full Indian administrative hierarchy:
--   Administrative: nation → state → division → district
--   Electoral:      parliamentary (Lok Sabha) → assembly (Vidhan Sabha)
--   Urban (74th):   municipal_corporation/council/nagar_panchayat → urban_ward
--   Rural (73rd):   zilla_parishad → block_panchayat → gram_panchayat → rural_ward
-- ════════════════════════════════════════════════════════════════

BEGIN;

-- ────────────────────────────────────────
-- 1. BOUNDARIES TABLE — Expand levels + add track metadata
-- ────────────────────────────────────────

-- Widen level column first (old was VARCHAR(20), 'municipal_corporation' needs 22+)
ALTER TABLE boundaries ALTER COLUMN level TYPE VARCHAR(30);
ALTER TABLE representatives ALTER COLUMN level TYPE VARCHAR(30);

-- Drop old CHECK constraint before updating data
ALTER TABLE boundaries DROP CONSTRAINT IF EXISTS boundaries_level_check;

-- Migrate existing 'municipal' → 'municipal_corporation' and 'ward' → 'urban_ward'
UPDATE boundaries SET level = 'municipal_corporation' WHERE level = 'municipal';
UPDATE boundaries SET level = 'urban_ward' WHERE level = 'ward';
ALTER TABLE boundaries ADD CONSTRAINT boundaries_level_check CHECK (level IN (
    -- Administrative track (shared by both rural and urban)
    'nation', 'state', 'division', 'district',
    -- Electoral track (overlays geography, not part of local governance hierarchy)
    'parliamentary', 'assembly',
    -- Urban track (74th Amendment)
    'municipal_corporation', 'municipal_council', 'nagar_panchayat', 'urban_ward',
    -- Rural track (73rd Amendment)
    'zilla_parishad', 'block_panchayat', 'gram_panchayat', 'rural_ward'
));

-- Track: which governance track this boundary belongs to
ALTER TABLE boundaries ADD COLUMN IF NOT EXISTS track VARCHAR(20)
    CHECK (track IN ('administrative', 'electoral', 'urban', 'rural'));

-- Whether the area is urban, rural, or mixed (for district-level which straddles both)
ALTER TABLE boundaries ADD COLUMN IF NOT EXISTS urban_rural VARCHAR(10)
    CHECK (urban_rural IN ('urban', 'rural', 'mixed'));

-- State-specific display name for this boundary (e.g., "Panchayat Samiti" in MH vs "Mandal Parishad" in AP)
ALTER TABLE boundaries ADD COLUMN IF NOT EXISTS state_local_name VARCHAR(255);

-- Expand official code field (Election Commission codes can be longer)
ALTER TABLE boundaries ALTER COLUMN code TYPE VARCHAR(50);

-- Backfill track for existing data
UPDATE boundaries SET track = 'administrative' WHERE level IN ('nation', 'state', 'division', 'district');
UPDATE boundaries SET track = 'electoral' WHERE level IN ('parliamentary', 'assembly');
UPDATE boundaries SET track = 'urban' WHERE level IN ('municipal_corporation', 'municipal_council', 'nagar_panchayat', 'urban_ward');
UPDATE boundaries SET track = 'rural' WHERE level IN ('zilla_parishad', 'block_panchayat', 'gram_panchayat', 'rural_ward');

-- Index for track-based queries
CREATE INDEX IF NOT EXISTS idx_boundaries_track ON boundaries(track);
CREATE INDEX IF NOT EXISTS idx_boundaries_urban_rural ON boundaries(urban_rural);

-- ────────────────────────────────────────
-- 2. REPRESENTATIVES TABLE — Add governance metadata
-- ────────────────────────────────────────

-- Elected vs appointed vs nominated
ALTER TABLE representatives ADD COLUMN IF NOT EXISTS official_type VARCHAR(20) NOT NULL DEFAULT 'elected'
    CHECK (official_type IN ('elected', 'appointed', 'nominated'));

-- Canonical designation code (machine-readable, state-independent)
-- e.g., 'mp_lok_sabha', 'mp_rajya_sabha', 'mla', 'mayor', 'sarpanch', 'district_collector'
ALTER TABLE representatives ADD COLUMN IF NOT EXISTS designation VARCHAR(50);

-- State-specific display title (human-readable, varies by state)
-- e.g., 'Pradhan' instead of 'Sarpanch' in UP, 'Adhyaksha' for ZP head
ALTER TABLE representatives ADD COLUMN IF NOT EXISTS state_designation VARCHAR(100);

-- Term dates
ALTER TABLE representatives ADD COLUMN IF NOT EXISTS term_start DATE;
ALTER TABLE representatives ADD COLUMN IF NOT EXISTS term_end DATE;

-- Link to which election put them in office (NULL for appointed officials)
ALTER TABLE representatives ADD COLUMN IF NOT EXISTS election_cycle_id UUID;

-- Drop old CHECK, migrate data, then add new CHECK
ALTER TABLE representatives DROP CONSTRAINT IF EXISTS representatives_level_check;

-- Migrate existing level values (must happen before new CHECK)
UPDATE representatives SET level = 'municipal_corporation' WHERE level = 'municipal';
UPDATE representatives SET level = 'urban_ward' WHERE level = 'ward';

-- Now add the new CHECK constraint
ALTER TABLE representatives ADD CONSTRAINT representatives_level_check CHECK (level IN (
    'nation', 'state', 'division', 'district',
    'parliamentary', 'assembly',
    'municipal_corporation', 'municipal_council', 'nagar_panchayat', 'urban_ward',
    'zilla_parishad', 'block_panchayat', 'gram_panchayat', 'rural_ward'
));

-- Add missing columns that Go code already references
ALTER TABLE representatives ADD COLUMN IF NOT EXISTS rating DECIMAL(3,2) DEFAULT 0.00;
ALTER TABLE representatives ADD COLUMN IF NOT EXISTS contact_info JSONB DEFAULT '{}';

-- Index for common lookups
CREATE INDEX IF NOT EXISTS idx_representatives_designation ON representatives(designation);
CREATE INDEX IF NOT EXISTS idx_representatives_official_type ON representatives(official_type);
CREATE INDEX IF NOT EXISTS idx_representatives_election_cycle ON representatives(election_cycle_id);

-- ────────────────────────────────────────
-- 3. ELECTION CYCLES — Track elections and terms
-- ────────────────────────────────────────

CREATE TABLE IF NOT EXISTS election_cycles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,              -- '2024 Lok Sabha General Election'
    election_type VARCHAR(30) NOT NULL       -- 'lok_sabha', 'assembly', 'municipal', 'panchayat'
        CHECK (election_type IN ('lok_sabha', 'assembly', 'municipal', 'panchayat', 'by_election', 'rajya_sabha')),
    state_code VARCHAR(5),                   -- NULL for national elections, 'MH'/'KA' etc. for state
    year INTEGER NOT NULL,
    month INTEGER,                           -- election month (nullable for multi-phase)
    phase_count INTEGER DEFAULT 1,           -- number of voting phases
    status VARCHAR(20) NOT NULL DEFAULT 'upcoming'
        CHECK (status IN ('upcoming', 'in_progress', 'completed', 'cancelled')),
    results_declared_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_election_cycles_type ON election_cycles(election_type);
CREATE INDEX IF NOT EXISTS idx_election_cycles_state ON election_cycles(state_code);
CREATE INDEX IF NOT EXISTS idx_election_cycles_year ON election_cycles(year);

-- FK from representatives to election_cycles
ALTER TABLE representatives ADD CONSTRAINT fk_representatives_election_cycle
    FOREIGN KEY (election_cycle_id) REFERENCES election_cycles(id);

-- ────────────────────────────────────────
-- 4. SEAT RESERVATIONS — Per boundary per election cycle
-- ────────────────────────────────────────
-- Reservation rotates: same ward may be general one term, SC the next

CREATE TABLE IF NOT EXISTS seat_reservations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    boundary_id UUID NOT NULL REFERENCES boundaries(id) ON DELETE CASCADE,
    election_cycle_id UUID NOT NULL REFERENCES election_cycles(id) ON DELETE CASCADE,
    reservation_category VARCHAR(30) NOT NULL
        CHECK (reservation_category IN (
            'general', 'sc', 'st', 'obc',
            'women_general', 'women_sc', 'women_st', 'women_obc'
        )),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE(boundary_id, election_cycle_id)
);

CREATE INDEX IF NOT EXISTS idx_seat_reservations_boundary ON seat_reservations(boundary_id);
CREATE INDEX IF NOT EXISTS idx_seat_reservations_cycle ON seat_reservations(election_cycle_id);
CREATE INDEX IF NOT EXISTS idx_seat_reservations_category ON seat_reservations(reservation_category);

-- ────────────────────────────────────────
-- 5. GOVERNANCE NOMENCLATURE — State-specific naming lookup
-- ────────────────────────────────────────
-- Same tier has different names in different states

CREATE TABLE IF NOT EXISTS governance_nomenclature (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    state_code VARCHAR(5) NOT NULL,          -- 'MH', 'KA', 'TN', 'UP', etc.
    state_name VARCHAR(100) NOT NULL,        -- 'Maharashtra', 'Karnataka', etc.
    canonical_level VARCHAR(30) NOT NULL,    -- matches boundaries.level
    local_name VARCHAR(255) NOT NULL,        -- state-specific name for this tier
    head_title VARCHAR(100),                 -- title of the head of this body
    head_designation VARCHAR(50),            -- maps to representatives.designation
    notes TEXT,                              -- any state-specific quirks
    UNIQUE(state_code, canonical_level)
);

CREATE INDEX IF NOT EXISTS idx_nomenclature_state ON governance_nomenclature(state_code);
CREATE INDEX IF NOT EXISTS idx_nomenclature_level ON governance_nomenclature(canonical_level);

-- ────────────────────────────────────────
-- 6. SEED: Governance nomenclature for major states
-- ────────────────────────────────────────

INSERT INTO governance_nomenclature (state_code, state_name, canonical_level, local_name, head_title, head_designation) VALUES
-- Maharashtra
('MH', 'Maharashtra', 'gram_panchayat', 'Gram Panchayat', 'Sarpanch', 'sarpanch'),
('MH', 'Maharashtra', 'block_panchayat', 'Panchayat Samiti', 'Sabhadhipati', 'block_pramukh'),
('MH', 'Maharashtra', 'zilla_parishad', 'Zilla Parishad', 'Adhyaksha', 'zp_adhyaksha'),
('MH', 'Maharashtra', 'municipal_corporation', 'Mahanagar Palika', 'Mayor', 'mayor'),
('MH', 'Maharashtra', 'municipal_council', 'Nagar Palika', 'Nagaradhyaksha', 'municipal_chairman'),
('MH', 'Maharashtra', 'nagar_panchayat', 'Nagar Panchayat', 'Chairman', 'nagar_panchayat_chairman'),
('MH', 'Maharashtra', 'urban_ward', 'Prabhag', 'Corporator', 'corporator'),
('MH', 'Maharashtra', 'rural_ward', 'Ward', 'Panch', 'panch'),
-- Uttar Pradesh
('UP', 'Uttar Pradesh', 'gram_panchayat', 'Gram Panchayat', 'Pradhan', 'sarpanch'),
('UP', 'Uttar Pradesh', 'block_panchayat', 'Kshetra Panchayat', 'Block Pramukh', 'block_pramukh'),
('UP', 'Uttar Pradesh', 'zilla_parishad', 'Zilla Panchayat', 'Adhyaksha', 'zp_adhyaksha'),
('UP', 'Uttar Pradesh', 'municipal_corporation', 'Nagar Nigam', 'Mayor', 'mayor'),
('UP', 'Uttar Pradesh', 'municipal_council', 'Nagar Palika Parishad', 'Chairman', 'municipal_chairman'),
('UP', 'Uttar Pradesh', 'nagar_panchayat', 'Nagar Panchayat', 'Chairman', 'nagar_panchayat_chairman'),
('UP', 'Uttar Pradesh', 'urban_ward', 'Ward', 'Parshad', 'corporator'),
('UP', 'Uttar Pradesh', 'rural_ward', 'Ward', 'Panch', 'panch'),
-- Karnataka
('KA', 'Karnataka', 'gram_panchayat', 'Grama Panchayat', 'Adhyaksha', 'sarpanch'),
('KA', 'Karnataka', 'block_panchayat', 'Taluk Panchayat', 'Adhyaksha', 'block_pramukh'),
('KA', 'Karnataka', 'zilla_parishad', 'Zilla Panchayat', 'Adhyaksha', 'zp_adhyaksha'),
('KA', 'Karnataka', 'municipal_corporation', 'Mahanagara Palike', 'Mayor', 'mayor'),
('KA', 'Karnataka', 'municipal_council', 'Nagara Sabha', 'President', 'municipal_chairman'),
('KA', 'Karnataka', 'nagar_panchayat', 'Pattana Panchayat', 'President', 'nagar_panchayat_chairman'),
('KA', 'Karnataka', 'urban_ward', 'Ward', 'Corporator', 'corporator'),
('KA', 'Karnataka', 'rural_ward', 'Ward', 'Member', 'panch'),
-- Tamil Nadu
('TN', 'Tamil Nadu', 'gram_panchayat', 'Oor Panchayat', 'President', 'sarpanch'),
('TN', 'Tamil Nadu', 'block_panchayat', 'Panchayat Union', 'Chairman', 'block_pramukh'),
('TN', 'Tamil Nadu', 'zilla_parishad', 'District Panchayat', 'Chairman', 'zp_adhyaksha'),
('TN', 'Tamil Nadu', 'municipal_corporation', 'Mahanagar Manram', 'Mayor', 'mayor'),
('TN', 'Tamil Nadu', 'municipal_council', 'Nagar Manram', 'Chairman', 'municipal_chairman'),
('TN', 'Tamil Nadu', 'nagar_panchayat', 'Town Panchayat', 'Chairman', 'nagar_panchayat_chairman'),
('TN', 'Tamil Nadu', 'urban_ward', 'Ward', 'Councillor', 'corporator'),
('TN', 'Tamil Nadu', 'rural_ward', 'Ward', 'Member', 'panch'),
-- Kerala
('KL', 'Kerala', 'gram_panchayat', 'Grama Panchayat', 'President', 'sarpanch'),
('KL', 'Kerala', 'block_panchayat', 'Block Panchayat', 'President', 'block_pramukh'),
('KL', 'Kerala', 'zilla_parishad', 'District Panchayat', 'President', 'zp_adhyaksha'),
('KL', 'Kerala', 'municipal_corporation', 'Municipal Corporation', 'Mayor', 'mayor'),
('KL', 'Kerala', 'municipal_council', 'Municipality', 'Chairman', 'municipal_chairman'),
('KL', 'Kerala', 'nagar_panchayat', 'Town Panchayat', 'Chairman', 'nagar_panchayat_chairman'),
('KL', 'Kerala', 'urban_ward', 'Ward', 'Councillor', 'corporator'),
('KL', 'Kerala', 'rural_ward', 'Ward', 'Member', 'panch'),
-- West Bengal
('WB', 'West Bengal', 'gram_panchayat', 'Gram Panchayat', 'Pradhan', 'sarpanch'),
('WB', 'West Bengal', 'block_panchayat', 'Panchayat Samiti', 'Sabhapati', 'block_pramukh'),
('WB', 'West Bengal', 'zilla_parishad', 'Zilla Parishad', 'Sabhadhipati', 'zp_adhyaksha'),
('WB', 'West Bengal', 'municipal_corporation', 'Municipal Corporation', 'Mayor', 'mayor'),
('WB', 'West Bengal', 'municipal_council', 'Municipality', 'Chairman', 'municipal_chairman'),
('WB', 'West Bengal', 'nagar_panchayat', 'Nagar Panchayat', 'Chairman', 'nagar_panchayat_chairman'),
('WB', 'West Bengal', 'urban_ward', 'Ward', 'Councillor', 'corporator'),
('WB', 'West Bengal', 'rural_ward', 'Ward', 'Member', 'panch'),
-- Rajasthan
('RJ', 'Rajasthan', 'gram_panchayat', 'Gram Panchayat', 'Sarpanch', 'sarpanch'),
('RJ', 'Rajasthan', 'block_panchayat', 'Panchayat Samiti', 'Pradhan', 'block_pramukh'),
('RJ', 'Rajasthan', 'zilla_parishad', 'Zilla Parishad', 'Zilla Pramukh', 'zp_adhyaksha'),
('RJ', 'Rajasthan', 'municipal_corporation', 'Nagar Nigam', 'Mayor', 'mayor'),
('RJ', 'Rajasthan', 'municipal_council', 'Nagar Palika', 'Chairman', 'municipal_chairman'),
('RJ', 'Rajasthan', 'nagar_panchayat', 'Nagar Panchayat', 'Chairman', 'nagar_panchayat_chairman'),
('RJ', 'Rajasthan', 'urban_ward', 'Ward', 'Parshad', 'corporator'),
('RJ', 'Rajasthan', 'rural_ward', 'Ward', 'Panch', 'panch'),
-- Gujarat
('GJ', 'Gujarat', 'gram_panchayat', 'Gram Panchayat', 'Sarpanch', 'sarpanch'),
('GJ', 'Gujarat', 'block_panchayat', 'Taluka Panchayat', 'President', 'block_pramukh'),
('GJ', 'Gujarat', 'zilla_parishad', 'District Panchayat', 'President', 'zp_adhyaksha'),
('GJ', 'Gujarat', 'municipal_corporation', 'Mahanagar Palika', 'Mayor', 'mayor'),
('GJ', 'Gujarat', 'municipal_council', 'Nagar Palika', 'President', 'municipal_chairman'),
('GJ', 'Gujarat', 'nagar_panchayat', 'Nagar Panchayat', 'President', 'nagar_panchayat_chairman'),
('GJ', 'Gujarat', 'urban_ward', 'Ward', 'Corporator', 'corporator'),
('GJ', 'Gujarat', 'rural_ward', 'Ward', 'Panch', 'panch')
ON CONFLICT (state_code, canonical_level) DO NOTHING;

-- ────────────────────────────────────────
-- 7. CANONICAL DESIGNATIONS REFERENCE
-- ────────────────────────────────────────
-- Machine-readable designation codes used in representatives.designation

CREATE TABLE IF NOT EXISTS designation_catalog (
    designation VARCHAR(50) PRIMARY KEY,
    display_name VARCHAR(100) NOT NULL,
    official_type VARCHAR(20) NOT NULL CHECK (official_type IN ('elected', 'appointed', 'nominated')),
    typical_level VARCHAR(30) NOT NULL,      -- which boundary level this usually sits at
    track VARCHAR(20) NOT NULL CHECK (track IN ('administrative', 'electoral', 'urban', 'rural')),
    description TEXT
);

INSERT INTO designation_catalog (designation, display_name, official_type, typical_level, track, description) VALUES
-- Central elected
('mp_lok_sabha',             'Member of Parliament (Lok Sabha)',     'elected',    'parliamentary',         'electoral', 'Directly elected to lower house, 543 constituencies'),
('mp_rajya_sabha',           'Member of Parliament (Rajya Sabha)',   'elected',    'state',                 'electoral', 'Indirectly elected by state MLAs, represents state'),
('prime_minister',           'Prime Minister',                       'elected',    'nation',                'administrative', 'Head of government, leader of Lok Sabha majority'),
-- Central appointed/nominal
('president',                'President of India',                   'elected',    'nation',                'administrative', 'Constitutional head, elected by electoral college'),
('vice_president',           'Vice President',                       'elected',    'nation',                'administrative', 'Rajya Sabha chairman, elected by both houses'),
('governor',                 'Governor',                             'appointed',  'state',                 'administrative', 'Constitutional head of state, appointed by President'),
-- State elected
('mla',                      'Member of Legislative Assembly',       'elected',    'assembly',              'electoral', 'Elected to state legislature (Vidhan Sabha)'),
('mlc',                      'Member of Legislative Council',        'elected',    'state',                 'electoral', 'Upper house of state legislature (where exists)'),
('chief_minister',           'Chief Minister',                       'elected',    'state',                 'administrative', 'Head of state government'),
-- District appointed
('district_collector',       'District Collector / DM',              'appointed',  'district',              'administrative', 'IAS officer, most powerful local official, straddles both tracks'),
('divisional_commissioner',  'Divisional Commissioner',              'appointed',  'division',              'administrative', 'IAS officer overseeing 4-5 districts'),
-- Urban elected
('mayor',                    'Mayor',                                'elected',    'municipal_corporation', 'urban', 'Head of Municipal Corporation'),
('deputy_mayor',             'Deputy Mayor',                         'elected',    'municipal_corporation', 'urban', 'Assists Mayor'),
('municipal_chairman',       'Chairman / President',                 'elected',    'municipal_council',     'urban', 'Head of Municipal Council / Nagar Palika'),
('nagar_panchayat_chairman', 'Chairman',                             'elected',    'nagar_panchayat',       'urban', 'Head of Nagar Panchayat (transitional area)'),
('corporator',               'Corporator / Councillor',              'elected',    'urban_ward',            'urban', 'Elected ward representative in urban body'),
-- Urban appointed
('municipal_commissioner',   'Municipal Commissioner',               'appointed',  'municipal_corporation', 'urban', 'IAS officer, executive authority in Municipal Corporation'),
('municipal_ceo',            'Chief Executive Officer',              'appointed',  'municipal_council',     'urban', 'Appointed bureaucrat managing Municipal Council'),
-- Rural elected
('zp_adhyaksha',             'Zilla Parishad Adhyaksha',             'elected',    'zilla_parishad',        'rural', 'Head of district-level rural body'),
('block_pramukh',            'Block Pramukh / Chairman',             'elected',    'block_panchayat',       'rural', 'Head of block-level Panchayat Samiti'),
('sarpanch',                 'Sarpanch / Pradhan',                   'elected',    'gram_panchayat',        'rural', 'Head of Gram Panchayat, directly elected by Gram Sabha'),
('panch',                    'Panch / Ward Member',                  'elected',    'rural_ward',            'rural', 'Elected member within a Gram Panchayat ward'),
-- Rural appointed
('block_development_officer','Block Development Officer (BDO)',      'appointed',  'block_panchayat',       'rural', 'Bureaucrat managing block-level development programs'),
('district_panchayat_officer','District Panchayat Officer',          'appointed',  'zilla_parishad',        'rural', 'Bureaucrat coordinating district panchayat operations')
ON CONFLICT (designation) DO NOTHING;

COMMIT;
